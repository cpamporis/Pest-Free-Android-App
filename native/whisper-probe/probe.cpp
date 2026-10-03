#include <jni.h>
#include <whisper.h>
#include <algorithm>
#include <atomic>
#include <chrono>
#include <cmath>
#include <codecvt>
#include <locale>
#include <memory>
#include <mutex>
#include <string>
#include <vector>

namespace {
std::atomic<bool> cancelled{false};
std::mutex inferenceMutex;
using Clock=std::chrono::steady_clock;
Clock::time_point deadline;
void quiet(enum ggml_log_level,const char *,void *) {}
bool abortInference(void *) { return cancelled.load() || Clock::now()>deadline; }
void fail(JNIEnv *env,const char *message) { env->ThrowNew(env->FindClass("java/lang/IllegalStateException"),message); }
jstring utf16(JNIEnv *env,const std::string &s) {
    std::wstring_convert<std::codecvt_utf8_utf16<char16_t>,char16_t> converter;
    auto text=converter.from_bytes(s);
    return env->NewString(reinterpret_cast<const jchar *>(text.data()),static_cast<jsize>(text.size()));
}
long millis(Clock::time_point start) {return std::chrono::duration_cast<std::chrono::milliseconds>(Clock::now()-start).count();}
struct Samples {
    std::vector<float> data;
    ~Samples(){std::fill(data.begin(),data.end(),0.f);}
};
}
extern "C" JNIEXPORT void JNICALL Java_com_cpamporis_pestfree_voice_PestifyWhisperProbe_nativePrepare(JNIEnv *,jclass) {cancelled.store(false);}
extern "C" JNIEXPORT void JNICALL Java_com_cpamporis_pestfree_voice_PestifyWhisperProbe_nativeCancel(JNIEnv *,jclass) {cancelled.store(true);}
extern "C" JNIEXPORT jobjectArray JNICALL Java_com_cpamporis_pestfree_voice_PestifyWhisperProbe_nativeTranscribe(JNIEnv *env,jclass,jstring path,jfloatArray pcm,jint threads) {
    std::lock_guard<std::mutex> guard(inferenceMutex);
    try {
        if(cancelled.load()){fail(env,"CANCELLED");return nullptr;}
        const int count=env->GetArrayLength(pcm);
        if(count<1600 || count>16000*12){fail(env,"INVALID_AUDIO_LENGTH");return nullptr;}
        Samples audio;audio.data.resize(count);env->GetFloatArrayRegion(pcm,0,count,audio.data.data());
        if(env->ExceptionCheck())return nullptr;
        for(float sample:audio.data) if(!std::isfinite(sample)||sample < -1.f||sample > 1.f){fail(env,"INVALID_PCM");return nullptr;}
        whisper_log_set(quiet,nullptr);ggml_log_set(quiet,nullptr);
        auto started=Clock::now();deadline=started+std::chrono::seconds(60);
        auto contextParams=whisper_context_default_params();contextParams.use_gpu=false;
        const char *modelPath=env->GetStringUTFChars(path,nullptr);
        if(!modelPath)return nullptr;
        std::string model(modelPath);env->ReleaseStringUTFChars(path,modelPath);
        std::unique_ptr<whisper_context,decltype(&whisper_free)> context(whisper_init_from_file_with_params(model.c_str(),contextParams),whisper_free);
        if(!context){fail(env,"MODEL_LOAD_FAILED");return nullptr;}
        long loadMs=millis(started);
        if(abortInference(nullptr)){fail(env,"CANCELLED_OR_TIMEOUT");return nullptr;}
        auto params=whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
        params.n_threads=std::max(1,std::min(4,static_cast<int>(threads)));
        params.language="el";params.detect_language=false;params.translate=false;params.no_context=true;
        params.no_timestamps=true;params.single_segment=true;params.max_tokens=96;
        params.print_special=false;params.print_progress=false;params.print_realtime=false;params.print_timestamps=false;
        params.suppress_blank=true;params.suppress_nst=true;params.temperature=0;params.temperature_inc=0;
        params.greedy.best_of=1;params.abort_callback=abortInference;
        // Deliberately no example prompt: do not bias the diagnostic toward the displayed station/consumption.
        auto decodeStarted=Clock::now();
        int result=whisper_full(context.get(),params,audio.data.data(),count);
        if(abortInference(nullptr)){fail(env,"CANCELLED_OR_TIMEOUT");return nullptr;}
        if(result!=0){fail(env,"TRANSCRIPTION_FAILED");return nullptr;}
        long decodeMs=millis(decodeStarted);std::string text;float noSpeech=0;
        int segments=whisper_full_n_segments(context.get());
        for(int i=0;i<segments;i++) {
            noSpeech=std::max(noSpeech,whisper_full_get_segment_no_speech_prob(context.get(),i));
            const char *part=whisper_full_get_segment_text(context.get(),i);if(part)text+=part;
            if(text.size()>4096){fail(env,"RESULT_TOO_LONG");return nullptr;}
        }
        jobjectArray output=env->NewObjectArray(4,env->FindClass("java/lang/String"),nullptr);
        const std::string values[]={text,std::to_string(loadMs),std::to_string(decodeMs),std::to_string(noSpeech)};
        for(int i=0;i<4;i++){auto value=utf16(env,values[i]);env->SetObjectArrayElement(output,i,value);env->DeleteLocalRef(value);}
        return output;
    } catch(const std::exception &e){fail(env,"LOCAL_ENGINE_FAILED");return nullptr;}
}
