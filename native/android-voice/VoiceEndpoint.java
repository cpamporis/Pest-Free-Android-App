package com.cpamporis.pestfree.voice;

// Energy endpoint only, not a word recognizer. Sample-count timing stays stable under load.
final class VoiceEndpoint {
  private final int silenceSamples,maxSamples;
  private int voiced,quiet,elapsed;
  private double noise=0.002;
  private boolean started;
  VoiceEndpoint(int rate,long silenceMs,long captureMs) {
    silenceSamples=(int)(rate*silenceMs/1000);maxSamples=(int)(rate*captureMs/1000);
  }
  boolean accept(short[] pcm,int n) {
    double energy=0;for(int i=0;i<n;i++){double v=pcm[i]/32768.0;energy+=v*v;}
    double rms=Math.sqrt(energy/Math.max(n,1));
    boolean speech=rms>=Math.max(0.006,noise*2.8);
    if(!started&&!speech)noise=0.98*noise+0.02*Math.min(rms,0.008);
    if(speech){started=true;voiced+=n;quiet=0;}else if(started)quiet+=n;
    if(started)elapsed+=n;
    return started&&(quiet>=silenceSamples||elapsed>=maxSamples);
  }
  boolean limited(){return elapsed>=maxSamples&&quiet<silenceSamples;}
  boolean started(){return started;}
  boolean usable(){return voiced>=1600*2;} // At least 200 ms above the noise floor at 16 kHz.
}
