package com.cpamporis.pestfree.voice;
import android.os.Handler;import android.content.Context;import android.media.AudioRecord;
import java.util.concurrent.TimeUnit;import java.util.function.BooleanSupplier;
public final class WhisperFieldEngineTest {
 static void check(boolean v){if(!v)throw new AssertionError();}
 static void until(Handler h,BooleanSupplier c)throws Exception{long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(4);while(!c.getAsBoolean()){h.drain();if(System.nanoTime()>end)throw new AssertionError("timeout");Thread.sleep(2);}h.drain();}
 static class Events implements WhisperFieldEngine.Listener{
  int ready,speech,decoding,results,errors,drops;
  public void ready(){ready++;}public void speech(){speech++;}public void decoding(){decoding++;}public void result(String s){results++;}public void failure(String s){errors++;}public void dropped(){drops++;}
 }
 static void phrase(){for(int i=0;i<20;i++)AudioRecord.current.feed(3000);for(int i=0;i<50;i++)AudioRecord.current.feed(0);}
 public static void main(String[] args)throws Exception{
  Handler h=new Handler();WhisperFieldEngine e=new WhisperFieldEngine(new Context(),h);Events ev=new Events();
  VoiceConfig cfg=VoiceConfig.defaults();java.util.Map<String,Object> settings=VoiceConfigTest.base();settings.put("silenceSeconds",0.9);cfg=VoiceConfig.parse(settings);
  check(e.start(cfg,ev));e.mute(false);e.next();until(h,()->ev.ready==1);
  PestifyWhisperProbe.block=true;phrase();until(h,()->ev.decoding==1);
  // Decoder blocked: the SAME AudioRecord must still accept and segment a second phrase.
  phrase();until(h,()->ev.speech>=2);check(AudioRecord.opened.get()==1&&AudioRecord.released.get()==0);
  PestifyWhisperProbe.finish.countDown();until(h,()->ev.results==1);check(WhisperFieldEngine.busy());
  for(float v:PestifyWhisperProbe.retained)check(v==0);
  e.next();until(h,()->ev.results==2);check(ev.errors==0);
  // TTS gate: input is discarded without closing the recorder or decoding it.
  e.mute(true);phrase();Thread.sleep(40);h.drain();check(ev.results==2);check(AudioRecord.released.get()==0);
  e.close();until(h,()->!WhisperFieldEngine.busy());check(AudioRecord.opened.get()==AudioRecord.released.get());
  // Cancel while native decoding is blocked: stale result cannot be delivered and
  // a replacement engine cannot take global ownership until both workers exit.
  PestifyWhisperProbe.entered=new java.util.concurrent.CountDownLatch(1);
  PestifyWhisperProbe.finish=new java.util.concurrent.CountDownLatch(1);
  WhisperFieldEngine blocked=new WhisperFieldEngine(new Context(),h);Events pending=new Events();
  check(blocked.start(cfg,pending));blocked.mute(false);blocked.next();until(h,()->pending.ready==1);
  phrase();until(h,()->pending.decoding==1);blocked.close();check(WhisperFieldEngine.busy());
  WhisperFieldEngine replacement=new WhisperFieldEngine(new Context(),h);check(!replacement.start(cfg,new Events()));replacement.close();
  PestifyWhisperProbe.finish.countDown();until(h,()->!WhisperFieldEngine.busy());check(pending.results==0&&pending.errors==0);
  for(float v:PestifyWhisperProbe.retained)check(v==0);
  check(AudioRecord.opened.get()==AudioRecord.released.get());
  VoiceAudioQueue q=new VoiceAudioQueue(1,1000);float[] a={1},b={2};check(q.offer(a,0));check(!q.offer(b,0)&&b[0]==0);VoiceAudioQueue.Frame f=q.poll();check(q.expired(f,1001));java.util.Arrays.fill(f.pcm,0);check(a[0]==0);
  float[] c={3};q.offer(c,0);q.clear();check(c[0]==0);
  System.out.println("PASS continuous microphone during blocked decoding, ordered queue, TTS gate, shutdown, RAM wiping, capacity and expiry");
 }
}
