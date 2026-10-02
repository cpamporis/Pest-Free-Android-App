package android.media;
import java.util.Arrays;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
public class AudioRecord {
 public static final int STATE_INITIALIZED=1,RECORDSTATE_RECORDING=3,READ_BLOCKING=0;
 public static final AtomicInteger opened=new AtomicInteger(),released=new AtomicInteger();
 public static volatile AudioRecord current;
 private final BlockingQueue<Integer> frames=new LinkedBlockingQueue<>();
 private volatile boolean stopped;
 public AudioRecord(int a,int b,int c,int d,int e){current=this;opened.incrementAndGet();}
 public static int getMinBufferSize(int a,int b,int c){return 6400;}
 public int getState(){return STATE_INITIALIZED;}
 public int getRecordingState(){return RECORDSTATE_RECORDING;}
 public void startRecording(){}
 public void feed(int value){frames.add(value);}
 public int read(short[] out,int offset,int count,int mode){
  try {Integer value;while(!stopped){value=frames.poll(20,TimeUnit.MILLISECONDS);if(value!=null){Arrays.fill(out,offset,offset+count,value.shortValue());return count;}}}catch(InterruptedException e){Thread.currentThread().interrupt();}
  return -1;
 }
 public void stop(){stopped=true;}
 public void release(){released.incrementAndGet();}
}
