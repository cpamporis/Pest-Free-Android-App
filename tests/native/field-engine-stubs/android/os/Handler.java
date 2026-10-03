package android.os;
import java.util.concurrent.*;
public class Handler {
 private final BlockingQueue<Runnable> tasks=new LinkedBlockingQueue<>();
 public boolean post(Runnable task){tasks.add(task);return true;}
 public void drain(){Runnable task;while((task=tasks.poll())!=null)task.run();}
}
