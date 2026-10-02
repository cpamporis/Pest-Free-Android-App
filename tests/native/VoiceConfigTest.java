package com.cpamporis.pestfree.voice;
import java.util.*;
public final class VoiceConfigTest {
  static void check(boolean ok) { if (!ok) throw new AssertionError(); }
  static Map<String,Object> base() {
    Map<String,Object> m=new HashMap<>(); m.put("wakePhrases",Arrays.asList("Αλέρτ","Alert"));m.put("stopPhrases",Arrays.asList("Άκυρο"));
    m.put("readyMessage","Έτοιμος");m.put("idleSeconds",60);m.put("silenceSeconds",1.4);m.put("captureSeconds",20); return m;
  }
  static void reject(String key,Object value) {
    Map<String,Object> m=base();m.put(key,value);boolean rejected=false;
    try {VoiceConfig.parse(m);} catch (IllegalArgumentException e) {rejected=true;} check(rejected);
  }
  public static void main(String[] args) {
    VoiceConfig c=VoiceConfig.defaults();
    for(String p:Arrays.asList("ΑΛΕΡΤ!","αλέρτ", " Alert. ")) check(c.wake.contains(VoiceConfig.normalize(p)));
    for(String p:Arrays.asList("είπα αλέρτ πριν","Αλέρτ σταθμός 2","Πες τη φάει αλέρτ","")) check(!c.wake.contains(VoiceConfig.normalize(p)));
    check(c.stop.contains(VoiceConfig.normalize("ΑΚΥΡΟ!")));
    check(!c.stop.contains(VoiceConfig.normalize("δεν είναι άκυρο")));
    check(c.idleMs==60000 && c.silenceMs==1400 && c.captureMs==20000);
    reject("idleSeconds",Double.NaN);reject("idleSeconds",Double.POSITIVE_INFINITY);reject("captureSeconds",46);
    reject("captureSeconds",true);reject("silenceSeconds",0);reject("idleSeconds",14);reject("idleSeconds",301);
    reject("readyMessage"," ");reject("wakePhrases",Arrays.asList("!"));reject("wakePhrases",Arrays.asList(2));
    reject("wakePhrases",Arrays.asList("Άκυρο"));reject("unknown",1);reject("stopPhrases",Collections.emptyList());
    Map<String,Object> missing=base();missing.remove("stopPhrases");check(VoiceConfig.parse(missing).stop.contains("ακυρο"));
    Map<String,Object> mutable=base();List<String> list=new ArrayList<>(Arrays.asList("Αλέρτ"));mutable.put("wakePhrases",list);
    VoiceConfig copied=VoiceConfig.parse(mutable);list.set(0,"Σταθμός");check(copied.wake.contains("αλερτ"));
    System.out.println("VoiceConfig: exact wake/stop phrases, bounds, invalid settings and snapshot isolation passed");
  }
}
