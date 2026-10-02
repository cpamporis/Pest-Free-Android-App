package com.cpamporis.pestfree.voice;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.*;
import android.speech.*;
import com.facebook.react.bridge.*;
import java.util.*;

/** Lab-only system recognizer diagnostic. No audio files, logging, network fallback or TTS. */
public final class PestifyLocalRecognitionProbe extends ReactContextBaseJavaModule implements LifecycleEventListener {
  private final Handler main = new Handler(Looper.getMainLooper());
  private SpeechRecognizer recognizer;
  private Promise pending;
  private int generation;
  private boolean disposed;
  private static boolean busy;
  static boolean isBusy() { return busy; }
  PestifyLocalRecognitionProbe(ReactApplicationContext c) { super(c); c.addLifecycleEventListener(this); }
  @Override public String getName() { return "PestifyLocalRecognitionProbe"; }
  @Override public Map<String,Object> getConstants() { return Collections.singletonMap("version", "local-greek-1"); }
  private Intent intent() {
    Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "el-GR");
    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
    i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
    i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
    return i;
  }
  private void clear() {
    generation++; main.removeCallbacksAndMessages(null);
    SpeechRecognizer old=recognizer; recognizer=null; pending=null; busy=false;
    if(old!=null) { try { old.cancel(); old.destroy(); } catch(Exception ignored) {} }
  }
  private void fail(String code) { Promise p=pending; clear(); if(p!=null)p.reject(code,code); }
  private void finish(WritableMap value) { Promise p=pending; clear(); if(p!=null)p.resolve(value); }
  private boolean begin(Promise p) {
    if(disposed || !getReactApplicationContext().getPackageName().equals("com.cpamporis.pestfree.dev")) {p.reject("LAB_ONLY","LAB_ONLY");return false;}
    if(pending!=null || PestifyVoiceService.current!=null || WhisperFieldEngine.busy() || PestifyWhisperProbe.isBusy()) {p.reject("BUSY","BUSY");return false;}
    PestifyFieldSession field=PestifyFieldSession.owner.get();
    if(field!=null && field.startPromise!=null) {p.reject("BUSY","BUSY");return false;}
    if(getCurrentActivity()==null || !getCurrentActivity().hasWindowFocus()) {p.reject("FOREGROUND_REQUIRED","FOREGROUND_REQUIRED");return false;}
    if(Build.VERSION.SDK_INT<33) {p.reject("ANDROID_13_REQUIRED","ANDROID_13_REQUIRED");return false;}
    pending=p; busy=true;
    try {
      if(!SpeechRecognizer.isOnDeviceRecognitionAvailable(getReactApplicationContext())) {fail("LOCAL_SERVICE_UNAVAILABLE");return false;}
      recognizer=SpeechRecognizer.createOnDeviceSpeechRecognizer(getReactApplicationContext());
      final int token=generation;
      recognizer.setRecognitionListener(new RecognitionListener() {
        public void onReadyForSpeech(Bundle b) {}
        public void onBeginningOfSpeech() {}
        public void onRmsChanged(float f) {}
        public void onBufferReceived(byte[] b) {} // Never retain audio callbacks.
        public void onEndOfSpeech() {}
        public void onPartialResults(Bundle b) {}
        public void onEvent(int t,Bundle b) {}
        public void onError(int code) {if(token==generation)fail("LOCAL_RECOGNITION_"+code);}
        public void onResults(Bundle b) {
          if(token!=generation)return;
          ArrayList<String> values=b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
          WritableMap out=Arguments.createMap();out.putString("text",values==null||values.isEmpty()?"":values.get(0));finish(out);
        }
      });
      main.postDelayed(()->{if(token==generation)fail("LOCAL_TIMEOUT");},20000);
      return true;
    } catch(Exception e) {fail("LOCAL_CREATE_FAILED");return false;}
  }
  private WritableArray languages(List<String> list) { WritableArray a=Arguments.createArray();for(String s:list)a.pushString(s);return a; }
  @ReactMethod public void check(Promise p) {main.post(()->{
    if(!begin(p))return; final int token=generation;
    try {recognizer.checkRecognitionSupport(intent(),getReactApplicationContext().getMainExecutor(),new RecognitionSupportCallback() {
      public void onSupportResult(RecognitionSupport s) {
        if(token!=generation)return;
        WritableMap out=Arguments.createMap();out.putBoolean("onDevice",true);
        out.putArray("installed",languages(s.getInstalledOnDeviceLanguages()));
        out.putArray("pending",languages(s.getPendingOnDeviceLanguages()));
        out.putArray("downloadable",languages(s.getSupportedOnDeviceLanguages()));finish(out);
      }
      public void onError(int code) {if(token==generation)fail("LOCAL_SUPPORT_"+code);}
    });}catch(Exception e){fail("LOCAL_SUPPORT_FAILED");}
  });}
  @ReactMethod public void download(Promise p) {main.post(()->{
    if(!begin(p))return;
    try {recognizer.triggerModelDownload(intent());WritableMap out=Arguments.createMap();out.putBoolean("requested",true);finish(out);}
    catch(Exception e){fail("LOCAL_DOWNLOAD_FAILED");}
  });}
  @ReactMethod public void listen(Promise p) {main.post(()->{
    if(!begin(p))return;
    if(getReactApplicationContext().checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){fail("MICROPHONE_PERMISSION_REQUIRED");return;}
    // Deliberately independent of capability lists: an inconclusive query must not prevent this local-only test.
    try {recognizer.startListening(intent());}catch(Exception e){fail("LOCAL_LISTEN_FAILED");}
  });}
  @ReactMethod public void cancel() {main.post(()->fail("CANCELLED"));}
  @Override public void onHostPause(){main.post(()->fail("BACKGROUND"));}
  @Override public void onHostDestroy(){main.post(()->fail("CANCELLED"));}
  @Override public void onHostResume(){}
  @Override public void invalidate(){disposed=true;getReactApplicationContext().removeLifecycleEventListener(this);main.post(()->fail("CANCELLED"));super.invalidate();}
}
