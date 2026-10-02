package com.cpamporis.pestfree.voice;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.media.*;
import android.os.*;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import java.io.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;

// Foreground diagnostic only. No SpeechRecognizer, TTS provider, network calls, or audio files.
public final class PestifyWhisperProbe extends ReactContextBaseJavaModule implements LifecycleEventListener {
  private static final int RATE=16000, MAX_SECONDS=8;
  private static final Object OWNER_LOCK=new Object();
  private static Job engineOwner;
  private static final boolean LOADED;
  static boolean available(){return LOADED;}
  private static boolean probeEnabled(Context c){return c.getPackageName().equals("com.cpamporis.pestfree.dev")&&PestifyFieldSession.enabled(c);}
  static {boolean loaded;try{System.loadLibrary("pestify_whisper");loaded=true;}catch(UnsatisfiedLinkError error){loaded=false;}LOADED=loaded;}
  static native void nativePrepare();
  static native void nativeCancel();
  static native String[] nativeTranscribe(String path,float[] pcm,int threads);
  private final Handler main=new Handler(Looper.getMainLooper());
  private final ExecutorService worker=Executors.newSingleThreadExecutor();
  private volatile Job job;
  private boolean foreground,disposed;
  private static final class Job {
    final Promise promise;
    final String id;
    volatile boolean cancelled,finish;
    volatile AudioRecord recorder;
    AudioFocusRequest focus;
    String reason="CANCELLED";
    boolean settled;
    Job(String id,Promise promise){this.id=id;this.promise=promise;}
  }
  public PestifyWhisperProbe(ReactApplicationContext c){super(c);c.addLifecycleEventListener(this);}
  @Override public String getName(){return "PestifyWhisperProbe";}
  @Override public Map<String,Object> getConstants(){
    Map<String,Object> m=new HashMap<>();m.put("available",Build.VERSION.SDK_INT>=33&&LOADED&&probeEnabled(getReactApplicationContext()));
    m.put("probeVersion",1);m.put("model","Whisper tiny multilingual Q5_1");return m;
  }
  @ReactMethod public void addListener(String event){}
  @ReactMethod public void removeListeners(double count){}
  @Override public void onHostResume(){foreground=true;}
  @Override public void onHostPause(){foreground=false;cancelCurrent("BACKGROUND");}
  @Override public void onHostDestroy(){cancelCurrent("BACKGROUND");}
  @Override public void invalidate(){disposed=true;cancelCurrent("CANCELLED");worker.shutdown();getReactApplicationContext().removeLifecycleEventListener(this);super.invalidate();}
  @ReactMethod public void startProbe(String id,Promise p){main.post(()->{
    Context c=getReactApplicationContext();
    if(Build.VERSION.SDK_INT<33||!LOADED||!probeEnabled(c)||disposed||!foreground||getCurrentActivity()==null){p.reject("UNAVAILABLE","Local probe unavailable");return;}
    PestifyFieldSession field=PestifyFieldSession.owner.get();
    if(WhisperFieldEngine.busy() || PestifyVoiceService.current!=null || (field!=null&&field.startPromise!=null)){p.reject("BUSY","Stop field listening first");return;}
    if(c.checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){p.reject("PERMISSION_REQUIRED","Microphone required");return;}
    if(id==null||id.isEmpty()||id.length()>100){p.reject("INVALID_ID","Invalid probe id");return;}
    Job next=new Job(id,p);
    synchronized(OWNER_LOCK){if(engineOwner!=null){p.reject("BUSY","Previous probe is stopping");return;}engineOwner=next;job=next;nativePrepare();}
    try {
    AudioManager audio=(AudioManager)c.getSystemService(Context.AUDIO_SERVICE);
    next.focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
      .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANT).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
      .setOnAudioFocusChangeListener(change->{if(change<0&&job==next)cancelCurrent("AUDIO_INTERRUPTED");},main).build();
    if(audio.requestAudioFocus(next.focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED){release(next);p.reject("AUDIO_INTERRUPTED","Audio unavailable");return;}
    main.postDelayed(()->{if(job==next)cancelCurrent("TIMEOUT");},90000);
    emit(next,"preparing");worker.execute(()->run(next));
    } catch (Exception error) { release(next); p.reject("AUDIO_INTERRUPTED","Audio unavailable"); }
  });}
  static boolean isBusy(){synchronized(OWNER_LOCK){return engineOwner!=null;}}
  @ReactMethod public void finishCapture(){main.post(()->{Job j=job;if(j!=null)j.finish=true;});}
  @ReactMethod public void cancelProbe(){cancelCurrent("CANCELLED");}
  private void cancelCurrent(String reason){main.post(()->{
    Job j=job;if(j==null)return;j.reason=reason;j.cancelled=true;
    synchronized(OWNER_LOCK){if(engineOwner==j)nativeCancel();}
    AudioRecord recorder=j.recorder;if(recorder!=null){try{recorder.stop();}catch(Exception ignored){}}
    if(!j.settled){j.settled=true;j.promise.reject(reason,"Local probe cancelled");}
    // Keep ownership until the worker has freed its native context and audio buffers.
  });}
  private void check(Job j)throws IOException{if(j.cancelled||disposed)throw new IOException("CANCELLED");}
  private void emit(Job j,String phase){main.post(()->{
    if(job!=j||j.cancelled||disposed||!getReactApplicationContext().hasActiveReactInstance())return;
    WritableMap m=Arguments.createMap();m.putString("id",j.id);m.putString("phase",phase);
    getReactApplicationContext().getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("PestifyWhisperEvent",m);
  });}
  private File model(Job j)throws Exception{return WhisperAssets.model(getReactApplicationContext(),()->j.cancelled||disposed);}
  private void run(Job j){
    float[] samples=new float[RATE*MAX_SECONDS];short[] chunk=new short[1600];float[] audio=null;
    AudioRecord recorder=null;
    try{
      long totalStart=SystemClock.elapsedRealtime();File model=model(j);check(j);
      int size=AudioRecord.getMinBufferSize(RATE,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT);
      if(size<=0)throw new IOException("AUDIO_FORMAT");
      recorder=new AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION,RATE,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT,Math.max(size,6400));
      if(recorder.getState()!=AudioRecord.STATE_INITIALIZED)throw new IOException("AUDIO_INITIALIZE");
      j.recorder=recorder;check(j);recorder.startRecording();
      if(recorder.getRecordingState()!=AudioRecord.RECORDSTATE_RECORDING)throw new IOException("AUDIO_START");
      emit(j,"recording");int count=0;double energy=0;long began=SystemClock.elapsedRealtime();
      while(count<samples.length&&!j.finish&&SystemClock.elapsedRealtime()-began<10000){
        check(j);int n=recorder.read(chunk,0,Math.min(chunk.length,samples.length-count),AudioRecord.READ_BLOCKING);
        if(n<=0)throw new IOException("AUDIO_READ");
        for(int i=0;i<n;i++){float value=chunk[i]/32768f;samples[count++]=value;energy+=value*value;}
      }
      recorder.stop();recorder.release();recorder=null;j.recorder=null;check(j);
      if(count<1600||Math.sqrt(energy/count)<0.003)throw new IOException("NO_SPEECH");
      audio=Arrays.copyOf(samples,count);Arrays.fill(samples,0);emit(j,"processing");
      String[] result=nativeTranscribe(model.getAbsolutePath(),audio,Math.min(4,Runtime.getRuntime().availableProcessors()));check(j);
      WritableMap output=Arguments.createMap();output.putString("id",j.id);output.putString("text",result[0].trim());
      output.putDouble("loadMs",Double.parseDouble(result[1]));output.putDouble("decodeMs",Double.parseDouble(result[2]));
      output.putDouble("noSpeechProbability",Double.parseDouble(result[3]));output.putDouble("audioMs",count*1000.0/RATE);
      output.putDouble("totalMs",SystemClock.elapsedRealtime()-totalStart);
      main.post(()->{if(job==j&&!j.cancelled&&!disposed&&!j.settled){j.settled=true;j.promise.resolve(output);}});
    }catch(Exception e){
      // Only fixed codes, never exception details containing input text or raw audio.
      String reason=j.cancelled?j.reason:"NO_SPEECH".equals(e.getMessage())?"NO_SPEECH":"LOCAL_PROBE_FAILED";
      main.post(()->{if(!j.settled){j.settled=true;j.promise.reject(reason,"Local speech test failed");}});
    }finally{
      if(recorder!=null){try{recorder.stop();}catch(Exception ignored){}recorder.release();}j.recorder=null;
      Arrays.fill(samples,0);Arrays.fill(chunk,(short)0);if(audio!=null)Arrays.fill(audio,0);
      main.post(()->release(j));
    }
  }
  private void release(Job j){
    AudioManager audio=(AudioManager)getReactApplicationContext().getSystemService(Context.AUDIO_SERVICE);
    try { if(j.focus!=null&&audio!=null)audio.abandonAudioFocusRequest(j.focus); } catch(Exception ignored) {}
    if(job==j)job=null;synchronized(OWNER_LOCK){if(engineOwner==j)engineOwner=null;}
  }
}
