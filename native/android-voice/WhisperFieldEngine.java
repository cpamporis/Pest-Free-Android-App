package com.cpamporis.pestfree.voice;
import android.content.Context;
import android.media.*;
import android.os.*;
import java.io.File;
import java.util.Arrays;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

// Continuous AudioRecord and serial decoder on separate workers. Audio is RAM-only.
final class WhisperFieldEngine {
 interface Listener {void ready();void speech();void decoding();void result(String text);void failure(String code);void dropped();}
 private static final AtomicBoolean BUSY=new AtomicBoolean();
 private final Context context;private final Handler main;
 private final ExecutorService captureWorker=Executors.newSingleThreadExecutor(),decodeWorker=Executors.newSingleThreadExecutor();
 private final Object gate=new Object();
 private volatile boolean closed,muted=true,owns;private boolean permit;
 private volatile int captureEpoch,streamEpoch;private volatile boolean capturing,decoding;private volatile AudioRecord recorder;
 private VoiceAudioQueue queue;private VoiceConfig cfg;private Listener listener;private File model;
 private final java.util.concurrent.atomic.AtomicInteger workers=new java.util.concurrent.atomic.AtomicInteger();
 WhisperFieldEngine(Context c,Handler h){context=c.getApplicationContext();main=h;}
 static boolean busy(){return BUSY.get();}
 private void post(Runnable r){main.post(()->{if(!closed)r.run();});}
 boolean start(VoiceConfig config,Listener l){
  if(closed||!BUSY.compareAndSet(false,true))return false;
  owns=true;cfg=config;listener=l;queue=new VoiceAudioQueue(cfg.queueCapacity,cfg.queueTtlMs);
  workers.set(2);PestifyWhisperProbe.nativePrepare();
  captureWorker.execute(this::capture);decodeWorker.execute(this::decode);return true;
 }
 private void finished(){if(workers.decrementAndGet()==0)BUSY.set(false);}
 // During TTS the microphone stays open, but captured samples are immediately discarded.
 void mute(boolean value){synchronized(gate){if(muted!=value){muted=value;captureEpoch++;}}}
 boolean hasSpeechWork(){return capturing||decoding||(queue!=null&&!queue.isEmpty());}
 void discardPending(){synchronized(gate){streamEpoch++;captureEpoch++;if(queue!=null)queue.clear();}}
 void next(){synchronized(gate){if(!closed){permit=true;gate.notifyAll();}}}
 void cancel(){close();}
 void close(){
  if(closed)return;closed=true;streamEpoch++;muted=true;captureEpoch++;
  if(queue!=null)queue.clear();if(owns)PestifyWhisperProbe.nativeCancel();
  synchronized(gate){gate.notifyAll();}
  AudioRecord r=recorder;if(r!=null)try{r.stop();}catch(Exception ignored){}
  captureWorker.shutdown();decodeWorker.shutdown();
 }
 private void capture(){
  final int rate=16000,preSize=4800;short[] chunk=new short[320];float[] pre=new float[preSize];
  int max=(int)(Math.min(cfg.captureMs,11000)*rate/1000)+preSize+320;
  float[] samples=new float[max];int count=0,preAt=0,preCount=0,epoch=captureEpoch;boolean began=false;
  VoiceEndpoint endpoint=new VoiceEndpoint(rate,cfg.silenceMs,Math.min(cfg.captureMs,11000),cfg);
  AudioRecord r=null;
  try{
   model=WhisperAssets.model(context,()->closed);if(closed)return;
   int min=AudioRecord.getMinBufferSize(rate,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT);
   if(min<=0)throw new IllegalStateException();
   r=new AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION,rate,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT,Math.max(min,6400));recorder=r;
   if(closed)return;if(r.getState()!=AudioRecord.STATE_INITIALIZED)throw new IllegalStateException();
   r.startRecording();if(r.getRecordingState()!=AudioRecord.RECORDSTATE_RECORDING)throw new IllegalStateException();
   post(listener::ready);
   while(!closed){
    int n=r.read(chunk,0,chunk.length,AudioRecord.READ_BLOCKING);if(n<=0){if(closed)break;throw new IllegalStateException();}
    if(muted||epoch!=captureEpoch){Arrays.fill(pre,0);Arrays.fill(samples,0);count=preAt=preCount=0;began=false;capturing=false;epoch=captureEpoch;endpoint=new VoiceEndpoint(rate,cfg.silenceMs,Math.min(cfg.captureMs,11000),cfg);Arrays.fill(chunk,(short)0);continue;}
    boolean ended=endpoint.accept(chunk,n);
    if(endpoint.started()&&!began){began=true;capturing=true;post(listener::speech);int first=(preAt-preCount+preSize)%preSize;for(int i=0;i<preCount;i++)samples[count++]=pre[(first+i)%preSize];}
    if(began){for(int i=0;i<n&&count<max;i++)samples[count++]=chunk[i]/32768f;}
    else{for(int i=0;i<n;i++){pre[preAt]=chunk[i]/32768f;preAt=(preAt+1)%preSize;preCount=Math.min(preSize,preCount+1);}}
    Arrays.fill(chunk,(short)0);
    if(ended||count==max){
     if(endpoint.usable()&&!endpoint.limited()&&!muted&&epoch==captureEpoch){
      float[] frame=Arrays.copyOf(samples,count);
      synchronized(gate){if(closed||muted||epoch!=captureEpoch)Arrays.fill(frame,0);else if(!queue.offer(frame,SystemClock.elapsedRealtime(),streamEpoch))post(listener::dropped);}
      synchronized(gate){gate.notifyAll();}
     }
     Arrays.fill(samples,0);Arrays.fill(pre,0);count=preAt=preCount=0;began=false;capturing=false;endpoint=new VoiceEndpoint(rate,cfg.silenceMs,Math.min(cfg.captureMs,11000),cfg);
    }
   }
  }catch(Exception e){if(!closed)post(()->listener.failure("LOCAL_CAPTURE_FAILED"));}
  finally{if(r!=null){try{r.stop();}catch(Exception ignored){}r.release();}recorder=null;capturing=false;if(queue!=null&&closed)queue.clear();Arrays.fill(chunk,(short)0);Arrays.fill(pre,0);Arrays.fill(samples,0);finished();}
 }
 private void decode(){
  try{
   while(!closed){
    VoiceAudioQueue.Frame frame=null;
    synchronized(gate){while(!closed&&(!permit||(frame=queue.poll())==null))gate.wait();if(closed){if(frame!=null)Arrays.fill(frame.pcm,0);break;}}
    if(frame.epoch!=streamEpoch){Arrays.fill(frame.pcm,0);continue;}
    if(queue.expired(frame,SystemClock.elapsedRealtime())){Arrays.fill(frame.pcm,0);post(listener::dropped);continue;}
    synchronized(gate){permit=false;}
    final VoiceAudioQueue.Frame owned=frame;final int token=owned.epoch;decoding=true;
    try{
     post(listener::decoding);
     String[] result=PestifyWhisperProbe.nativeTranscribe(model.getAbsolutePath(),owned.pcm,Math.min(4,Runtime.getRuntime().availableProcessors()));
     double noSpeech=Double.parseDouble(result[3]);String text=Double.isFinite(noSpeech)&&noSpeech<=cfg.noSpeechThreshold?result[0].trim():"";
     if(queue.expired(owned,SystemClock.elapsedRealtime())){post(listener::dropped);text="";}
     final String answer=text;post(()->{if(token==streamEpoch)listener.result(answer);});
    }finally{decoding=false;Arrays.fill(owned.pcm,0);}
   }
  }catch(Exception e){if(!closed)post(()->listener.failure("LOCAL_DECODER_FAILED"));}
  finally{if(queue!=null)queue.clear();finished();}
 }
}
