package com.cpamporis.pestfree.voice;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.Collections;
import java.util.List;

public final class PestifyVoicePackage implements ReactPackage {
  @Override public List<NativeModule> createNativeModules(ReactApplicationContext context) {
    if(context.getPackageName().equals("com.cpamporis.pestfree.dev")) return java.util.Arrays.asList(new PestifyFieldSession(context), new PestifyWhisperProbe(context), new PestifyLocalRecognitionProbe(context));
    return java.util.Arrays.asList(new PestifyFieldSession(context), new PestifyWhisperProbe(context));
  }
  @Override public List<ViewManager> createViewManagers(ReactApplicationContext context) {
    return Collections.emptyList();
  }
}
