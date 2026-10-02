package com.cpamporis.pestfree.voice;
import android.os.Handler;
import android.content.Context;
import android.media.AudioRecord;
import java.util.concurrent.TimeUnit;
import java.util.function.BooleanSupplier;
public final class WhisperFieldEngineTest {
 static void check(boolean value){if(!value)throw new AssertionError();}
 static void until(Handler h,BooleanSupplier condition)throws Exception {
  long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(3);
  while(!condition.getAsBoolean()){h.drain();if(System.nanoTime()>deadline)throw new AssertionError("timeout");Thread.sleep(2);}h.drain();
 }
 static class Events implements WhisperFieldEngine.Listener {
  int ready,speech,decoding,results,errors;String text;
  public void ready(){ready++;}public void speech(){speech++;}public void decoding(){decoding++;}
  public void result(String value){results++;text=value;}public void failure(String code){errors++;}
 }
 static void phrase(){for(int i=0;i<4;i++)AudioRecord.current.feed(3000);for(int i=0;i<9;i++)AudioRecord.current.feed(0);}
 public static void main(String[] args)throws Exception {
  Handler main=new Handler();Context context=new Context();WhisperFieldEngine engine=new WhisperFieldEngine(context,main);Events event=new Events();
  check(engine.start(900,10000,event));until(main,()->event.ready==1);
  phrase();until(main,()->event.results==1);
  check(event.speech==1&&event.decoding==1&&event.errors==0);check(event.text.equals("Σταθμός 2 κατανάλωση 25"));
  check(!WhisperFieldEngine.busy());for(float value:PestifyWhisperProbe.retained)check(value==0);
  Events cancelled=new Events();check(engine.start(900,10000,cancelled));until(main,()->cancelled.ready==1);
  engine.cancel();until(main,()->!WhisperFieldEngine.busy());check(cancelled.results==0&&cancelled.errors==0);
  PestifyWhisperProbe.block=true;Events pending=new Events();check(engine.start(900,10000,pending));until(main,()->pending.ready==1);
  phrase();until(main,()->pending.decoding==1);engine.close();check(WhisperFieldEngine.busy());
  WhisperFieldEngine next=new WhisperFieldEngine(context,main);check(!next.start(900,10000,new Events()));
  PestifyWhisperProbe.finish.countDown();until(main,()->!WhisperFieldEngine.busy());check(pending.results==0&&pending.errors==0);
  for(float value:PestifyWhisperProbe.retained)check(value==0);
  check(AudioRecord.opened.get()==AudioRecord.released.get());next.close();
  System.out.println("PASS: capture, endpoint, buffer clearing, cancellation, stale results, exclusive engine ownership");
 }
}
