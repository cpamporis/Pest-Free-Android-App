package com.cpamporis.pestfree.voice;
import java.util.concurrent.*;
final class PestifyWhisperProbe {
 static volatile boolean cancelled,block;
 static volatile float[] retained;
 static volatile CountDownLatch entered=new CountDownLatch(1),finish=new CountDownLatch(1);
 static void nativePrepare(){cancelled=false;}
 static void nativeCancel(){cancelled=true;}
 static String[] nativeTranscribe(String model,float[] pcm,int threads){
  retained=pcm;entered.countDown();
  try{if(block&&!finish.await(5,TimeUnit.SECONDS))throw new AssertionError("decoder wait");}catch(InterruptedException e){throw new AssertionError(e);}
  return new String[]{"Σταθμός 2 κατανάλωση 25","0","0","0.1"};
 }
}
