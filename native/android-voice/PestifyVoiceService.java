package com.cpamporis.pestfree.voice;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.media.*;
import android.os.*;
import android.speech.*;
import android.speech.tts.*;
import com.facebook.react.bridge.Promise;
import java.util.*;

// Explicitly started, non-exported, non-sticky foreground service. No audio files or network client.
public final class PestifyVoiceService extends Service {
  static PestifyVoiceService current;
  PestifyFieldSession module;
  private static final String CHANNEL="pestify-field-voice";
  private static final String STOP="com.cpamporis.pestfree.voice.STOP";
  private static final int NOTIFICATION=7812;
  private static final long MAX_SESSION=4*60*60*1000L;
  private final Handler main=new Handler(Looper.getMainLooper());
  private VoiceConfig cfg;
  private String session,command,utterance;
  private String phase="starting";
  private SpeechRecognizer recognizer;
  private TextToSpeech speaker;
  private AudioManager audio;
  private AudioFocusRequest focus;
  private PowerManager.WakeLock wakeLock;
  private Promise replyPromise;
  private Runnable afterSpeech;
  private int recognitionGeneration, consecutiveErrors;
  private boolean stopping, heardSpeech;
  private long lastActivity;
  private Runnable captureTimer, finalTimer, idleTimer, replyTimer, speechTimer;

  @Override public IBinder onBind(Intent intent) { return null; }
  @Override public int onStartCommand(Intent intent,int flags,int startId) {
    if (intent!=null && STOP.equals(intent.getAction())) { shutdown("USER_STOPPED"); return START_NOT_STICKY; }
    if (current==this) return START_NOT_STICKY;
    if (stopping) {
      PestifyFieldSession next=PestifyFieldSession.owner.get();
      if (next!=null) next.failStart("SERVICE_STOPPING","Wait until the previous voice service stops");
      stopSelf(); return START_NOT_STICKY;
    }
    module=PestifyFieldSession.owner.get();
    if (!PestifyFieldSession.enabled(this) || module==null || module.pendingSession==null || !module.isForeground()) { stopSelf(); return START_NOT_STICKY; }
    current=this; session=module.pendingSession; cfg=module.configuration;
    try {
      NotificationManager manager=getSystemService(NotificationManager.class);
      NotificationChannel channel=new NotificationChannel(CHANNEL,"Φωνητική καταχώριση πεδίου",NotificationManager.IMPORTANCE_LOW);
      channel.setDescription("Ενεργό μικρόφωνο για σταθμούς και κατόψεις"); manager.createNotificationChannel(channel);
      startForeground(NOTIFICATION,notification(),ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
      wakeLock=((PowerManager)getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"Pestify:FieldVoice");
      wakeLock.setReferenceCounted(false); wakeLock.acquire(MAX_SESSION+10000);
      main.postDelayed(()->shutdown("SESSION_LIMIT"),MAX_SESSION);
      audio=(AudioManager)getSystemService(AUDIO_SERVICE);
      focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
        .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANT).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
        .setOnAudioFocusChangeListener(change->{ if (change<0) shutdown("AUDIO_INTERRUPTED"); },main).build();
      if (audio.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED) { shutdown("AUDIO_FOCUS_UNAVAILABLE"); return START_NOT_STICKY; }
      speaker=new TextToSpeech(this,status->main.post(()->initializeSpeech(status)));
    } catch (Exception e) { shutdown("SERVICE_START_FAILED"); }
    return START_NOT_STICKY;
  }
  private Notification notification() {
    Intent stop=new Intent(this,PestifyVoiceService.class).setAction(STOP);
    PendingIntent stopAction=PendingIntent.getService(this,NOTIFICATION,stop,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    Notification.Builder builder=new Notification.Builder(this,CHANNEL)
      .setSmallIcon(android.R.drawable.ic_btn_speak_now).setContentTitle("Pestify — Ηχογράφηση")
      .setContentText("Ενεργό μικρόφωνο · πείτε Αλέρτ ή Άκυρο για διακοπή")
      .setOngoing(true).setOnlyAlertOnce(true).setCategory(Notification.CATEGORY_SERVICE)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .addAction(new Notification.Action.Builder(null,"Διακοπή",stopAction).build());
    Intent launch=getPackageManager().getLaunchIntentForPackage(getPackageName());
    if (launch!=null) builder.setContentIntent(PendingIntent.getActivity(this,NOTIFICATION,launch,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
    return builder.build();
  }
  private void initializeSpeech(int status) {
    if (stopping) return;
    if (status!=TextToSpeech.SUCCESS || speaker==null) { shutdown("LOCAL_TTS_REQUIRED"); return; }
    Voice selected=null;
    try {
      Set<Voice> voices=speaker.getVoices();
      if (voices!=null) for (Voice v:voices) {
        if ("el".equals(v.getLocale().getLanguage()) && !v.isNetworkConnectionRequired() &&
            (v.getFeatures()==null || !v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED))) { selected=v; break; }
      }
      if (selected==null || speaker.setVoice(selected)!=TextToSpeech.SUCCESS) { shutdown("LOCAL_TTS_REQUIRED"); return; }
      speaker.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANT).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
      speaker.setOnUtteranceProgressListener(new UtteranceProgressListener() {
        @Override public void onStart(String id) { }
        @Override public void onDone(String id) { main.post(()->speechDone(id)); }
        @Override public void onError(String id) { main.post(()->{if(id.equals(utterance)) shutdown("SPEECH_FAILED");}); }
        @Override public void onStop(String id,boolean interrupted) { main.post(()->{if(id.equals(utterance) && !stopping) shutdown("SPEECH_INTERRUPTED");}); }
      });
      lastActivity=SystemClock.elapsedRealtime();
      listen(true);
      // The ready callback is the proof that listening really started; a request alone is not success.
    } catch (Exception e) { shutdown("LOCAL_TTS_REQUIRED"); }
  }
  private void emit(String code,String text,String reason) { if (module!=null) module.event(code,session,command,text,reason); }
  private void clear(Runnable task) { if (task!=null) main.removeCallbacks(task); }
  private void disposeRecognizer() {
    recognitionGeneration++; clear(captureTimer); clear(finalTimer); clear(idleTimer);
    SpeechRecognizer old=recognizer; recognizer=null;
    if (old!=null) { try { old.cancel(); old.destroy(); } catch (Exception ignored) { } }
  }
  private void listen(boolean wake) {
    if (stopping) return;
    disposeRecognizer(); phase=wake?"wake":"listening"; heardSpeech=false;
    int generation=recognitionGeneration;
    try {
      recognizer=SpeechRecognizer.createOnDeviceSpeechRecognizer(this);
      recognizer.setRecognitionListener(new RecognitionListener() {
        private boolean valid() { return !stopping && generation==recognitionGeneration && recognizer!=null; }
        @Override public void onReadyForSpeech(Bundle params) {
          if (!valid()) return;
          if (module.startPromise!=null) module.started();
          emit(wake?"WAITING_WAKE":"LISTENING",null,null);
        }
        @Override public void onBeginningOfSpeech() { if (valid()) heardSpeech=true; }
        @Override public void onRmsChanged(float value) { }
        @Override public void onBufferReceived(byte[] buffer) { /* Never retain audio. */ }
        @Override public void onEndOfSpeech() {
          if (!valid()) return;
          clear(captureTimer); clear(finalTimer);
          finalTimer=()->{if(valid()) rearm(wake,500);}; main.postDelayed(finalTimer,5000);
        }
        @Override public void onError(int error) {
          if (!valid()) return;
          if (error==SpeechRecognizer.ERROR_NO_MATCH || error==SpeechRecognizer.ERROR_SPEECH_TIMEOUT) { consecutiveErrors=0; rearm(wake,500); return; }
          if (error==SpeechRecognizer.ERROR_RECOGNIZER_BUSY || error==SpeechRecognizer.ERROR_TOO_MANY_REQUESTS || error==SpeechRecognizer.ERROR_SERVER_DISCONNECTED) {
            consecutiveErrors++;
            if (consecutiveErrors<=3) { rearm(wake,Math.min(8000,1000L<<consecutiveErrors)); return; }
          }
          shutdown("RECOGNITION_ERROR_"+error);
        }
        @Override public void onResults(Bundle result) {
          if (!valid()) return;
          ArrayList<String> results=result.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
          String text=results==null||results.isEmpty()?"":results.get(0);
          consecutiveErrors=0; disposeRecognizer();
          if (text==null || text.trim().isEmpty() || text.length()>500) { rearm(wake,500); return; }
          String normalized=VoiceConfig.normalize(text);
          if (cfg.stop.contains(normalized)) { shutdown("VOICE_CANCELLED"); return; }
          if (wake) {
            if (cfg.wake.contains(normalized)) { lastActivity=SystemClock.elapsedRealtime(); speak(cfg.ready,()->rearm(false,300)); }
            else rearm(true,500);
            return;
          }
          lastActivity=SystemClock.elapsedRealtime(); command=UUID.randomUUID().toString(); phase="processing";
          emit("COMMAND",text,null);
          replyTimer=()->shutdown("APP_RESPONSE_TIMEOUT"); main.postDelayed(replyTimer,10000);
        }
        @Override public void onPartialResults(Bundle partial) { if (valid()) heardSpeech=true; /* Never execute a partial hypothesis. */ }
        @Override public void onEvent(int type,Bundle params) { }
      });
      recognizer.startListening(PestifyFieldSession.recognitionIntent(cfg));
      captureTimer=()->{
        if (generation!=recognitionGeneration || stopping || recognizer==null) return;
        try { recognizer.stopListening(); }
        catch (Exception e) { shutdown("RECOGNITION_STOP_FAILED"); return; }
        finalTimer=()->{if(generation==recognitionGeneration) rearm(wake,500);}; main.postDelayed(finalTimer,5000);
      };
      main.postDelayed(captureTimer,wake?30000:cfg.captureMs);
      if (!wake) {
        idleTimer=()->{
          if (generation==recognitionGeneration && !stopping && !heardSpeech && SystemClock.elapsedRealtime()-lastActivity>=cfg.idleMs) rearm(true,300);
        };
        main.postDelayed(idleTimer,Math.max(1,cfg.idleMs-(SystemClock.elapsedRealtime()-lastActivity)));
      }
    } catch (Exception e) { shutdown("LOCAL_RECOGNITION_UNAVAILABLE"); }
  }
  private void rearm(boolean wake,long delay) {
    if (stopping) return;
    disposeRecognizer(); phase="settling";
    int generation=recognitionGeneration;
    main.postDelayed(()->{
      if (!stopping && recognitionGeneration==generation) listen(wake || SystemClock.elapsedRealtime()-lastActivity>=cfg.idleMs);
    },delay);
  }
  private void speak(String text,Runnable completion) {
    if (stopping || speaker==null) return;
    disposeRecognizer(); phase="speaking"; afterSpeech=completion; utterance=UUID.randomUUID().toString();
    clear(speechTimer); speechTimer=()->shutdown("SPEECH_TIMEOUT"); main.postDelayed(speechTimer,30000);
    try { if (speaker.speak(text,TextToSpeech.QUEUE_FLUSH,new Bundle(),utterance)==TextToSpeech.ERROR) shutdown("SPEECH_FAILED"); }
    catch (Exception e) { shutdown("SPEECH_FAILED"); }
  }
  private void speechDone(String id) {
    if (stopping || !id.equals(utterance)) return;
    clear(speechTimer); utterance=null;
    Runnable done=afterSpeech; afterSpeech=null; if (done!=null) done.run();
  }
  void reply(String id,String text,boolean accepted,Promise p) {
    if (stopping || !"processing".equals(phase) || !Objects.equals(id,command) || replyPromise!=null || text==null || text.isEmpty() || text.length()>1000) { p.resolve(false); return; }
    clear(replyTimer); replyPromise=p;
    speak(text,()->{
      phase="awaitingCommit";
      Promise completed=replyPromise; replyPromise=null;
      replyTimer=()->shutdown("COMMIT_TIMEOUT"); main.postDelayed(replyTimer,10000);
      if (completed!=null) completed.resolve(true);
    });
  }
  void continueAfterCommit(String id) {
    if (stopping || !"awaitingCommit".equals(phase) || !Objects.equals(id,command)) return;
    clear(replyTimer); command=null; lastActivity=SystemClock.elapsedRealtime(); rearm(false,300);
  }
  void waitForWake() {
    if (stopping || !"processing".equals(phase)) return;
    clear(replyTimer); command=null; rearm(true,300);
  }
  void shutdown(String reason) {
    if (stopping) return; stopping=true;
    main.removeCallbacksAndMessages(null); disposeRecognizer();
    utterance=null; afterSpeech=null;
    if (speaker!=null) { speaker.stop(); speaker.shutdown(); speaker=null; }
    if (audio!=null && focus!=null) audio.abandonAudioFocusRequest(focus);
    if (wakeLock!=null && wakeLock.isHeld()) wakeLock.release();
    if (replyPromise!=null) { replyPromise.resolve(false); replyPromise=null; }
    if (module!=null) { module.failStart(reason,"Voice session stopped: "+reason); emit("STOPPED",null,reason); }
    if (current==this) current=null;
    stopForeground(STOP_FOREGROUND_REMOVE); stopSelf();
  }
  @Override public void onTaskRemoved(Intent intent) { shutdown("TASK_REMOVED"); super.onTaskRemoved(intent); }
  @Override public void onDestroy() { shutdown("SERVICE_DESTROYED"); module=null; super.onDestroy(); }
}
