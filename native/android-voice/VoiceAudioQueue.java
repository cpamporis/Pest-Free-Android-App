package com.cpamporis.pestfree.voice;
import java.util.*;
// Owns RAM arrays; transfers ownership on poll and wipes on discard.
final class VoiceAudioQueue {
  static final class Frame {final float[] pcm;final long captured;final int epoch;Frame(float[] p,long t,int e){pcm=p;captured=t;epoch=e;}}
  private final ArrayDeque<Frame> queue=new ArrayDeque<>();
  private final int capacity;private final long ttl;
  VoiceAudioQueue(int capacity,long ttl){this.capacity=capacity;this.ttl=ttl;}
  boolean offer(float[] pcm,long now){return offer(pcm,now,0);}
  synchronized boolean offer(float[] pcm,long now,int epoch){if(queue.size()>=capacity){Arrays.fill(pcm,0);return false;}queue.addLast(new Frame(pcm,now,epoch));notifyAll();return true;}
  synchronized boolean isEmpty(){return queue.isEmpty();}
  synchronized Frame poll(){return queue.pollFirst();}
  boolean expired(Frame f,long now){return now-f.captured>ttl;}
  synchronized void clear(){Frame f;while((f=queue.pollFirst())!=null)Arrays.fill(f.pcm,0);}
}
