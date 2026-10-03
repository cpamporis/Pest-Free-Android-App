package com.cpamporis.pestfree.voice;

// Energy endpoint only, not a word recognizer. Sample-count timing stays stable under load.
final class VoiceEndpoint {
  private final int silenceSamples,maxSamples;
  private int voiced,quiet,elapsed,onset;
  private final int minVoiced,onsetRequired;private final double minimumRms,ratio;
  private double noise=0.002;
  private boolean started;
  VoiceEndpoint(int rate,long silenceMs,long captureMs) {
    this(rate,silenceMs,captureMs,VoiceConfig.defaults());
  }
  VoiceEndpoint(int rate,long silenceMs,long captureMs,VoiceConfig cfg) {
    minVoiced=(int)(rate*cfg.minSpeechMs/1000);onsetRequired=(int)(rate*cfg.onsetMs/1000);minimumRms=cfg.speechRms;ratio=cfg.noiseRatio;
    silenceSamples=(int)(rate*silenceMs/1000);maxSamples=(int)(rate*captureMs/1000);
  }
  boolean accept(short[] pcm,int n) {
    double energy=0;for(int i=0;i<n;i++){double v=pcm[i]/32768.0;energy+=v*v;}
    double rms=Math.sqrt(energy/Math.max(n,1));
    boolean speech=rms>=Math.max(minimumRms,noise*ratio);
    if(!started&&!speech)noise=0.98*noise+0.02*Math.min(rms,0.008);
    if(!started){onset=speech?onset+n:0;if(onset<onsetRequired)return false;started=true;voiced=onset-n;}
    if(speech){voiced+=n;quiet=0;}else if(started)quiet+=n;
    if(started)elapsed+=n;
    return started&&(quiet>=silenceSamples||elapsed>=maxSamples);
  }
  boolean limited(){return elapsed>=maxSamples&&quiet<silenceSamples;}
  boolean started(){return started;}
  boolean usable(){return voiced>=minVoiced;} // At least 200 ms above the noise floor at 16 kHz.
}
