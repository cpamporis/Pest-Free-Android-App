package com.cpamporis.pestfree.voice;

import android.content.Context;
import android.media.*;
import android.os.Handler;
import java.io.File;
import java.util.Arrays;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

// One utterance at a time, including wake phrases. No SpeechRecognizer, uploads or audio files.
final class WhisperFieldEngine {
  interface Listener {void ready();void speech();void decoding();void result(String text);void failure(String code);}
  private static final AtomicBoolean BUSY=new AtomicBoolean();
  private final Context context;
  private final Handler main;
  private final ExecutorService worker=Executors.newSingleThreadExecutor();
  private volatile Capture active;
  private boolean closed;
  private static final class Capture {volatile boolean cancelled;volatile AudioRecord recorder;}
  WhisperFieldEngine(Context context,Handler main){this.context=context.getApplicationContext();this.main=main;}
  static boolean busy(){return BUSY.get();}
  boolean start(long silenceMs,long captureMs,Listener listener) {
    if(closed||!BUSY.compareAndSet(false,true))return false;
    Capture capture=new Capture();active=capture;PestifyWhisperProbe.nativePrepare();
    worker.execute(()->run(capture,silenceMs,captureMs,listener));return true;
  }
  private void post(Capture capture,Runnable action){main.post(()->{if(!closed&&!capture.cancelled)action.run();});}
  void cancel() {
    Capture capture=active;if(capture==null)return;
    capture.cancelled=true;PestifyWhisperProbe.nativeCancel();
    AudioRecord recorder=capture.recorder;if(recorder!=null)try{recorder.stop();}catch(Exception ignored){}
  }
  void close(){closed=true;cancel();worker.shutdown();}
  private void run(Capture capture,long silenceMs,long captureMs,Listener listener) {
    final int rate=16000,preSize=4800;
    short[] chunk=new short[1600];float[] pre=new float[preSize];
    // Bound to the JNI input limit (12 s), preserving 300 ms before the detected onset.
    long boundedCapture=Math.min(captureMs,11000);
    float[] samples=new float[(int)(boundedCapture*rate/1000)+preSize+1600];float[] pcm=null;
    AudioRecord recorder=null;String transcript=null,error=null;
    try {
      File model=WhisperAssets.model(context,()->capture.cancelled);
      if(capture.cancelled)return;
      int min=AudioRecord.getMinBufferSize(rate,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT);
      if(min<=0)throw new IllegalStateException();
      recorder=new AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION,rate,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT,Math.max(min,6400));
      capture.recorder=recorder;if(capture.cancelled)return;
      if(recorder.getState()!=AudioRecord.STATE_INITIALIZED)throw new IllegalStateException();
      recorder.startRecording();
      if(recorder.getRecordingState()!=AudioRecord.RECORDSTATE_RECORDING)throw new IllegalStateException();
      post(capture,listener::ready);
      VoiceEndpoint endpoint=new VoiceEndpoint(rate,silenceMs,boundedCapture);
      int preAt=0,preCount=0,count=0;boolean began=false;
      while(!capture.cancelled) {
        int n=recorder.read(chunk,0,chunk.length,AudioRecord.READ_BLOCKING);
        if(n<=0)throw new IllegalStateException();
        boolean ended=endpoint.accept(chunk,n);
        if(endpoint.started()&&!began) {
          began=true;post(capture,listener::speech);
          int first=(preAt-preCount+preSize)%preSize;
          for(int i=0;i<preCount;i++)samples[count++]=pre[(first+i)%preSize];
        }
        if(began){for(int i=0;i<n&&count<samples.length;i++)samples[count++]=chunk[i]/32768f;}
        else {for(int i=0;i<n;i++){pre[preAt]=chunk[i]/32768f;preAt=(preAt+1)%preSize;preCount=Math.min(preSize,preCount+1);}}
        if(ended||count==samples.length)break;
      }
      recorder.stop();recorder.release();recorder=null;capture.recorder=null;
      if(capture.cancelled)return;
      if(!endpoint.usable()||endpoint.limited()){transcript="";return;}
      pcm=Arrays.copyOf(samples,count);Arrays.fill(samples,0);post(capture,listener::decoding);
      String[] result=PestifyWhisperProbe.nativeTranscribe(model.getAbsolutePath(),pcm,Math.min(4,Runtime.getRuntime().availableProcessors()));
      if(capture.cancelled)return;
      double noSpeech=Double.parseDouble(result[3]);
      transcript=Double.isFinite(noSpeech)&&noSpeech<=0.6?result[0].trim():"";
    } catch(Exception failure) {error="LOCAL_ENGINE_FAILED";}
    finally {
      if(recorder!=null){try{recorder.stop();}catch(Exception ignored){}recorder.release();}
      capture.recorder=null;Arrays.fill(chunk,(short)0);Arrays.fill(pre,0);Arrays.fill(samples,0);if(pcm!=null)Arrays.fill(pcm,0);
      final String text=transcript,reason=error;
      // Release ownership on the main thread so a new capture cannot race nativeCancel().
      main.post(()->{
        if(active==capture)active=null;BUSY.set(false);
        if(closed||capture.cancelled)return;
        if(reason!=null)listener.failure(reason);else listener.result(text==null?"":text);
      });
    }
  }
}
