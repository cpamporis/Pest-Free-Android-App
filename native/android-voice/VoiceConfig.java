package com.cpamporis.pestfree.voice;

import java.text.Normalizer;
import java.util.*;

// Pure Java policy: no platform, persistence, microphone, or networking.
final class VoiceConfig {
  final Set<String> wake, stop;
  final String ready;
  final long idleMs, silenceMs, captureMs;
  VoiceConfig(Set<String> wake, Set<String> stop, String ready, long idle, long silence, long capture) {
    this.wake=Collections.unmodifiableSet(wake); this.stop=Collections.unmodifiableSet(stop);
    this.ready=ready; idleMs=idle; silenceMs=silence; captureMs=capture;
  }
  static String normalize(String text) {
    return Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFD)
      .replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT)
      .replaceAll("[^\\p{L}\\p{N}\\s]", " ").trim().replaceAll("\\s+", " ");
  }
  static VoiceConfig defaults() {
    Map<String,Object> m=new HashMap<>(); m.put("wakePhrases",Arrays.asList("Αλέρτ","Alert"));
    m.put("stopPhrases",Arrays.asList("Άκυρο")); m.put("readyMessage","Έτοιμος");
    m.put("idleSeconds",60); m.put("silenceSeconds",1.4); m.put("captureSeconds",20); return parse(m);
  }
  static VoiceConfig parse(Map<String,Object> m) {
    Set<String> keys=new HashSet<>(Arrays.asList("wakePhrases","stopPhrases","readyMessage","idleSeconds","silenceSeconds","captureSeconds"));
    if (!keys.containsAll(m.keySet())) throw new IllegalArgumentException("Unknown setting");
    Object message=m.get("readyMessage");
    if (!(message instanceof String) || ((String)message).trim().isEmpty() || ((String)message).length()>160) throw new IllegalArgumentException("Ready message");
    Set<String> wake=phrases(m.get("wakePhrases")), stop=phrases(m.getOrDefault("stopPhrases",Arrays.asList("Άκυρο")));
    if (!Collections.disjoint(wake,stop)) throw new IllegalArgumentException("Overlapping commands");
    return new VoiceConfig(wake,stop,((String)message).trim(),millis(m.get("idleSeconds"),15,300),millis(m.get("silenceSeconds"),0.7,3),millis(m.get("captureSeconds"),5,45));
  }
  static Set<String> phrases(Object raw) {
    if (!(raw instanceof List) || ((List<?>)raw).isEmpty() || ((List<?>)raw).size()>8) throw new IllegalArgumentException("Phrases");
    Set<String> result=new HashSet<>();
    for (Object item:(List<?>)raw) {
      if (!(item instanceof String) || ((String)item).length()>80 || normalize((String)item).isEmpty()) throw new IllegalArgumentException("Phrase");
      result.add(normalize((String)item));
    }
    return result;
  }
  static long millis(Object value,double min,double max) {
    if (!(value instanceof Number)) throw new IllegalArgumentException("Number");
    double n=((Number)value).doubleValue();
    if (!Double.isFinite(n) || n<min || n>max) throw new IllegalArgumentException("Range");
    return Math.round(n*1000);
  }
}
