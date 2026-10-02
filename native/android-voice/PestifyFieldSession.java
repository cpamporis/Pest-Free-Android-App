package com.cpamporis.pestfree.voice;

import android.Manifest;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.*;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import java.lang.ref.WeakReference;
import java.util.*;

public final class PestifyFieldSession extends ReactContextBaseJavaModule implements LifecycleEventListener {
  static WeakReference<PestifyFieldSession> owner = new WeakReference<>(null);
  final Handler main = new Handler(Looper.getMainLooper());
  VoiceConfig configuration = VoiceConfig.defaults();
  Promise startPromise;
  String pendingSession;
  int generation;
  boolean disposed;
  int listeners;
  private boolean foreground;

  PestifyFieldSession(ReactApplicationContext context) {
    super(context); owner=new WeakReference<>(this); context.addLifecycleEventListener(this);
  }
  @Override public String getName() { return "PestifyFieldSession"; }
  static boolean enabled(Context c) {
    try {
      return (c.getPackageName().equals("com.cpamporis.pestfree.dev") || c.getPackageName().equals("com.cpamporis.pestfree")) &&
        c.getPackageManager().getApplicationInfo(c.getPackageName(),PackageManager.GET_META_DATA).metaData.getBoolean("PestifyAndroidVoiceEnabled",false);
    } catch (Exception e) { return false; }
  }
  @Override public Map<String,Object> getConstants() {
    Map<String,Object> m=new HashMap<>(); boolean allowed=enabled(getReactApplicationContext());
    m.put("enabled",allowed); m.put("voiceEnabled",allowed); m.put("wakeVersion",6); m.put("configurationVersion",2); m.put("diagnosticVersion","tiny-field-2"); return m;
  }
  boolean isForeground() { return foreground && getCurrentActivity()!=null && !disposed; }
  @Override public void onHostResume() { foreground=true; }
  @Override public void onHostPause() { foreground=false; }
  @Override public void onHostDestroy() { main.post(()->stop("ACTIVITY_DESTROYED")); }
  @Override public void invalidate() {
    disposed=true;
    getReactApplicationContext().removeLifecycleEventListener(this);
    main.post(()->{ stop("BRIDGE_DESTROYED"); if (owner.get()==this) owner.clear(); }); super.invalidate();
  }
  @ReactMethod public void addListener(String event) { main.post(()->listeners++); }
  @ReactMethod public void removeListeners(double count) { main.post(()->listeners=Math.max(0,listeners-(int)count)); }
  @ReactMethod public void configureWakePreview(boolean enabled) { /* Raw transcripts are never logged. */ }
  @ReactMethod public void configureField(ReadableMap raw,Promise p) {
    main.post(()->{
      if (!enabled(getReactApplicationContext()) || !isForeground() || startPromise!=null || PestifyVoiceService.current!=null) { p.reject("CONFIGURATION_IDLE_REQUIRED","Stop the session first"); return; }
      try { VoiceConfig next=VoiceConfig.parse(raw.toHashMap()); configuration=next; p.resolve(true); }
      catch (Exception e) { p.reject("INVALID_CONFIGURATION","Invalid voice settings"); }
    });
  }
  interface SupportResult { void complete(boolean installed,String reason); }
  static void checkGreek(Context c,VoiceConfig cfg,SupportResult callback) {
    boolean available=Build.VERSION.SDK_INT>=33&&PestifyWhisperProbe.available();
    callback.complete(available,available?"":"Απαιτείται Android 13+ και build με το τοπικό μοντέλο Tiny.");
  }
  @ReactMethod public void capabilities(Promise p) {
    main.post(()->{
      Context c=getReactApplicationContext();
      if (!enabled(c) || !isForeground()) { p.reject("FOREGROUND_REQUIRED","Open the voice screen"); return; }
      checkGreek(c,configuration,(installed,reason)->{
        WritableMap m=Arguments.createMap();
        boolean mic=c.checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED;
        boolean notifications=Build.VERSION.SDK_INT<33 || c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;
        m.putBoolean("onDevice",installed); m.putBoolean("available",installed && notifications);
        m.putBoolean("speechAuthorized",true); m.putBoolean("microphoneAuthorized",mic);
        m.putString("message",!mic?"Χρειάζεται άδεια μικροφώνου.":!notifications?"Χρειάζεται άδεια ειδοποιήσεων για την ακρόαση πεδίου.":reason); p.resolve(m);
      });
    });
  }
  @ReactMethod public void startField(String sessionId,Promise p) {
    main.post(()->{
      Context c=getReactApplicationContext();
      String blocked=PestifyLocalRecognitionProbe.isBusy()||WhisperFieldEngine.busy()||PestifyWhisperProbe.isBusy()?"ENGINE_BUSY":
        !enabled(c)?"VOICE_DISABLED":!isForeground()?"FOREGROUND_REQUIRED":listeners<1?"LISTENER_REQUIRED":
        Build.VERSION.SDK_INT<33?"ANDROID_VERSION_REQUIRED":sessionId==null||sessionId.isEmpty()||sessionId.length()>160?"INVALID_SESSION":
        startPromise!=null||PestifyVoiceService.current!=null?"SESSION_BUSY":null;
      if(blocked!=null){p.reject(blocked,"Cannot start voice session");return;}
      if (c.checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED || c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED) { p.reject("PERMISSION_REQUIRED","Microphone and notifications required"); return; }
      startPromise=p; pendingSession=sessionId; final int ticket=++generation;
      checkGreek(c,configuration,(ok,reason)->{
        if (generation!=ticket || startPromise!=p) return;
        if (!ok || !isForeground()) { failStart("LOCAL_LANGUAGES_REQUIRED",reason); return; }
        try {
          event("START_STAGE",pendingSession,null,"Υπηρεσία μικροφώνου",null);
          c.startForegroundService(new Intent(c,PestifyVoiceService.class));
          main.postDelayed(()->{ if (startPromise==p) stop("START_TIMEOUT"); },20000);
        } catch (Exception e) { failStart("SERVICE_START_FAILED","Could not start microphone service"); }
      });
    });
  }
  void failStart(String code,String message) { Promise p=startPromise; startPromise=null; pendingSession=null; if (p!=null) p.reject(code,message); }
  void started() { Promise p=startPromise; startPromise=null; pendingSession=null; if (p!=null) p.resolve(true); }
  @ReactMethod public void stopSession(String id) { main.post(()->{
    if(id==null)return;
    PestifyVoiceService service=PestifyVoiceService.current;
    if(Objects.equals(id,pendingSession)||(service!=null&&service.module==this&&service.matchesSession(id)))stop("USER_STOPPED");
  }); }
  @ReactMethod public void stopField() { main.post(()->stop("USER_STOPPED")); }
  void stop(String reason) {
    generation++; failStart("USER_STOPPED".equals(reason)?"CANCELLED":reason,"Voice start cancelled");
    PestifyVoiceService service=PestifyVoiceService.current;
    if (service!=null && service.module==this) service.shutdown(reason);
  }
  @ReactMethod public void reply(String commandId,String text,boolean accepted,Promise p) {
    main.post(()->{
      PestifyVoiceService service=PestifyVoiceService.current;
      if (service==null || service.module!=this) { p.resolve(false); return; }
      service.reply(commandId,text,accepted,p);
    });
  }
  @ReactMethod public void continueAfterCommit(String commandId) {
    main.post(()->{ PestifyVoiceService s=PestifyVoiceService.current; if (s!=null && s.module==this) s.continueAfterCommit(commandId); });
  }
  @ReactMethod public void waitForWake() {
    main.post(()->{ PestifyVoiceService s=PestifyVoiceService.current; if (s!=null && s.module==this) s.waitForWake(); });
  }
  void event(String code,String sessionId,String commandId,String text,String reason) {
    if (disposed || !getReactApplicationContext().hasActiveReactInstance() || listeners<1) return;
    WritableMap m=Arguments.createMap();m.putString("code",code);m.putString("sessionId",sessionId);
    if (commandId!=null) m.putString("commandId",commandId);
    if (text!=null) m.putString("text",text);
    if (reason!=null) m.putString("reason",reason);
    getReactApplicationContext().getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("PestifyFieldEvent",m);
  }
}
