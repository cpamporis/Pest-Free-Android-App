package com.cpamporis.pestfree.voice;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.media.*;
import android.os.*;
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
  private WhisperFieldEngine engine;
  private TextToSpeech speaker;
  private AudioManager audio;
  private AudioFocusRequest focus;
  private PowerManager.WakeLock wakeLock;
  private Promise replyPromise;
  private Runnable afterSpeech;
  private int recognitionGeneration;
  private boolean stopping, heardSpeech, speechStarted, wakeMode=true, droppedAudio;
  private long lastActivity;
  private Runnable idleTimer, replyTimer, speechTimer;

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
    if (!PestifyFieldSession.enabled(this) || module==null || module.pendingSession==null || !module.isForeground()) { if(module!=null)module.failStart("START_CONTEXT_CHANGED","Startup context changed");stopSelf(); return START_NOT_STICKY; }
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
      focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
        .setOnAudioFocusChangeListener(change->{ if (change<0) shutdown("AUDIO_INTERRUPTED"); },main).build();
      if (audio.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED) { shutdown("AUDIO_FOCUS_UNAVAILABLE"); return START_NOT_STICKY; }
      emit("START_STAGE","Τοπική εκφώνηση",null);
      speaker=new TextToSpeech(this,status->main.post(()->initializeSpeech(status)));
    } catch (Exception e) { shutdown("SERVICE_START_"+e.getClass().getSimpleName().toUpperCase(Locale.ROOT)); }
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
    if (status!=TextToSpeech.SUCCESS || speaker==null) { shutdown("LOCAL_TTS_INIT_FAILED"); return; }
    Voice selected=null;
    try {
      Set<Voice> voices=speaker.getVoices();
      if (voices!=null) for (Voice v:voices) {
        if ("el".equals(v.getLocale().getLanguage()) && !v.isNetworkConnectionRequired() &&
            (v.getFeatures()==null || !v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED))) { selected=v; break; }
      }
      if (selected==null) { shutdown("LOCAL_TTS_VOICE_MISSING"); return; }
      if (speaker.setVoice(selected)!=TextToSpeech.SUCCESS) { shutdown("LOCAL_TTS_SELECT_FAILED"); return; }
      if (speaker.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())!=TextToSpeech.SUCCESS) {shutdown("TTS_AUDIO_SETUP_FAILED");return;}
      speaker.setOnUtteranceProgressListener(new UtteranceProgressListener() {
        @Override public void onStart(String id) { main.post(()->{if(!stopping && Objects.equals(id,utterance)){speechStarted=true;emit("SPEECH_STAGE","Αναπαραγωγή φωνής",null);}}); }
        @Override public void onDone(String id) { main.post(()->speechDone(id)); }
        @Override public void onError(String id) { main.post(()->{if(id.equals(utterance)) shutdown("SPEECH_FAILED");}); }
        @Override public void onStop(String id,boolean interrupted) { main.post(()->{if(id.equals(utterance) && !stopping) shutdown("SPEECH_INTERRUPTED");}); }
      });
      emit("SPEECH_STAGE","Μηχανή: "+speaker.getDefaultEngine()+" · φωνή: "+selected.getName()+" · πολυμέσα: "+audio.getStreamVolume(AudioManager.STREAM_MUSIC),null);
      lastActivity=SystemClock.elapsedRealtime();
      speak("Η φωνητική λειτουργία ενεργοποιήθηκε. Πείτε αλέρτ.",()->rearm(true,300));
      // The ready callback is the proof that listening really started; a request alone is not success.
    } catch (Exception e) { shutdown("TTS_SETUP_"+e.getClass().getSimpleName().toUpperCase(Locale.ROOT)); }
  }
  private void emit(String code,String text,String reason) { if (module!=null) module.event(code,session,command,text,reason); }
  private void clear(Runnable task) { if (task!=null) main.removeCallbacks(task); }
  private void disposeRecognizer() {
    recognitionGeneration++; clear(idleTimer);
    if(engine!=null)engine.mute(true);
  }
  private void armIdle(){
    clear(idleTimer);if(wakeMode||stopping)return;
    idleTimer=()->{
      if(stopping||wakeMode)return;
      if("processing".equals(phase)||"speaking".equals(phase)||"awaitingCommit".equals(phase)){main.postDelayed(idleTimer,1000);return;}
      long remaining=cfg.idleMs-(SystemClock.elapsedRealtime()-lastActivity);
      if(remaining>0){main.postDelayed(idleTimer,remaining);return;}
      // Finish an in-flight phrase before changing modes; noise never resets lastActivity.
      if(engine.hasSpeechWork()&&SystemClock.elapsedRealtime()-lastActivity<cfg.idleMs+cfg.captureMs+30000){main.postDelayed(idleTimer,1000);return;}
      engine.discardPending();wakeMode=true;
      speak("Αναμονή για αλέρτ.",()->rearm(true,300));
    };
    main.postDelayed(idleTimer,Math.max(1,cfg.idleMs-(SystemClock.elapsedRealtime()-lastActivity)));
  }
  private void listen(boolean wake) {
    if(stopping)return;
    if(wake!=wakeMode&&engine!=null)engine.discardPending();
    wakeMode=wake;phase=wake?"wake":"listening";heardSpeech=false;
    if(engine==null){
      engine=new WhisperFieldEngine(this,main);
      boolean started=engine.start(cfg,new WhisperFieldEngine.Listener(){
        public void ready(){if(stopping)return;if(module.startPromise!=null)module.started();emit(wakeMode?"WAITING_WAKE":"LISTENING",null,null);}
        public void speech(){if(!stopping)heardSpeech=true;}
        public void decoding(){if(!stopping){heardSpeech=true;emit("DECODING","Το μικρόφωνο παραμένει ενεργό.",null);}}
        public void failure(String code){if(!stopping)shutdown(code);}
        public void dropped(){if(!stopping){droppedAudio=true;emit("QUEUE_DROPPED","Μία φράση δεν διατηρήθηκε. Θα ζητηθεί επανάληψη.",null);}}
        public void result(String text){
          if(stopping)return;heardSpeech=false;
          if(text==null||text.trim().isEmpty()||text.length()>500){rearm(wakeMode,0);return;}
          if(getPackageName().equals("com.cpamporis.pestfree.dev"))emit("TRANSCRIPT",text,null);
          String normalized=VoiceConfig.normalize(text);
          if(VoiceConfig.matches(cfg.stop,normalized)){shutdown("VOICE_CANCELLED");return;}
          if(wakeMode){
            if(VoiceConfig.matches(cfg.wake,normalized)){lastActivity=SystemClock.elapsedRealtime();engine.discardPending();wakeMode=false;speak(cfg.ready,()->rearm(false,300));}
            else rearm(true,0);
            return;
          }
          command=UUID.randomUUID().toString();phase="processing";
          emit("COMMAND",text,null);
          replyTimer=()->shutdown("APP_RESPONSE_TIMEOUT");main.postDelayed(replyTimer,10000);
        }
      });
      if(!started){engine.close();engine=null;shutdown("ENGINE_BUSY");return;}
    }
    engine.mute(false);engine.next();armIdle();emit(wakeMode?"WAITING_WAKE":"LISTENING",null,null);
  }
  private void rearm(boolean wake,long delay) {
    if(stopping)return;clear(idleTimer);
    if(droppedAudio){droppedAudio=false;engine.discardPending();speak("Δεν κρατήθηκαν οι επόμενες εντολές. Επαναλάβετε. Έτοιμος.",()->rearm(wake,300));return;}
    phase="settling";int generation=++recognitionGeneration;
    main.postDelayed(()->{
      if(!stopping&&recognitionGeneration==generation)listen(wake);
    },delay);
  }
  void ignoreCommand(String id){
    if(stopping||!"processing".equals(phase)||!Objects.equals(id,command))return;
    clear(replyTimer);command=null;rearm(false,0);
  }
  private void speak(String text,Runnable completion) {
    if (stopping || speaker==null) return;
    if(audio.getStreamVolume(AudioManager.STREAM_MUSIC)==0 || audio.isStreamMute(AudioManager.STREAM_MUSIC)){shutdown("TTS_MEDIA_MUTED");return;}
    disposeRecognizer(); speechStarted=false; phase="speaking"; afterSpeech=completion; utterance=UUID.randomUUID().toString();
    clear(speechTimer); speechTimer=()->shutdown("SPEECH_TIMEOUT"); main.postDelayed(speechTimer,30000);
    Bundle speechParams=new Bundle();
    speechParams.putInt(TextToSpeech.Engine.KEY_PARAM_STREAM,AudioManager.STREAM_MUSIC);
    speechParams.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME,1.0f);
    emit("SPEECH_STAGE","Αίτημα εκφώνησης",null);
    try { if (speaker.speak(text,TextToSpeech.QUEUE_FLUSH,speechParams,utterance)==TextToSpeech.ERROR) shutdown("SPEECH_FAILED"); }
    catch (Exception e) { shutdown("SPEECH_FAILED"); }
  }
  private void speechDone(String id) {
    if (stopping || !id.equals(utterance)) return;
    if(!speechStarted){shutdown("TTS_DONE_WITHOUT_START");return;}
    if(audio.getStreamVolume(AudioManager.STREAM_MUSIC)==0 || audio.isStreamMute(AudioManager.STREAM_MUSIC)){shutdown("TTS_MEDIA_MUTED");return;}
    emit("SPEECH_STAGE","Η μηχανή ολοκλήρωσε την εκφώνηση",null);
    clear(speechTimer); utterance=null;
    Runnable done=afterSpeech; afterSpeech=null; if (done!=null) done.run();
  }
  void reply(String id,String text,boolean accepted,Promise p) {
    if (stopping || !"processing".equals(phase) || !Objects.equals(id,command) || replyPromise!=null || text==null || text.isEmpty() || text.length()>1000) { p.resolve(false); return; }
    clear(replyTimer); lastActivity=SystemClock.elapsedRealtime(); replyPromise=p;
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
  boolean matchesSession(String id){return Objects.equals(session,id);}
  void shutdown(String reason) {
    if (stopping) return; stopping=true;
    main.removeCallbacksAndMessages(null); disposeRecognizer();
    if(engine!=null){engine.close();engine=null;}
    utterance=null; afterSpeech=null;
    if (speaker!=null) { try {speaker.stop();speaker.shutdown();}catch(Exception ignored){} speaker=null; }
    if (audio!=null && focus!=null) try {audio.abandonAudioFocusRequest(focus);}catch(Exception ignored){}
    if (wakeLock!=null && wakeLock.isHeld()) try {wakeLock.release();}catch(Exception ignored){}
    if (replyPromise!=null) { replyPromise.resolve(false); replyPromise=null; }
    if (module!=null) { module.failStart(reason,"Voice session stopped: "+reason); emit("STOPPED",null,reason); }
    if (current==this) current=null;
    stopForeground(STOP_FOREGROUND_REMOVE); stopSelf();
  }
  @Override public void onTaskRemoved(Intent intent) { shutdown("TASK_REMOVED"); super.onTaskRemoved(intent); }
  @Override public void onDestroy() { shutdown("SERVICE_DESTROYED"); module=null; super.onDestroy(); }
}
