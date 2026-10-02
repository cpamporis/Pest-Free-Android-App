const SECURITY_LAB_VARIANT = "security-lab";
const SECURITY_LAB_NAME = "Pestify Dev";
const SECURITY_LAB_ANDROID_PACKAGE = "com.cpamporis.pestfree.dev";
const SECURITY_LAB_SCHEME = "pestify-android-dev";

module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT;
  const lab = variant === SECURITY_LAB_VARIANT;
  const labVoice = process.env.PESTIFY_ANDROID_VOICE_LAB === "1";
  const voice = labVoice || process.env.PESTIFY_ANDROID_VOICE === "1";
  if (variant && !lab) throw new Error(`Unsupported APP_VARIANT: ${variant}`);
  if (labVoice && !lab) throw new Error("Lab voice requires the Security Lab profile");
  if (voice && process.env.EAS_BUILD_PLATFORM && process.env.EAS_BUILD_PLATFORM !== "android") {
    throw new Error("Android voice requires an Android build");
  }
  const voiceConfig = voice ? {
    runtimeVersion: lab ? "pestify-android-voice-lab-9" : "pestify-android-voice-4",
    plugins: [...(config.plugins || []), "./plugins/withPestifyAndroidVoice"],
  } : {};
  if (!lab) return { ...config, ...voiceConfig };
  return {
    ...config,
    ...voiceConfig,
    name: SECURITY_LAB_NAME,
    scheme: SECURITY_LAB_SCHEME,
    android: { ...config.android, package: SECURITY_LAB_ANDROID_PACKAGE },
    updates: { ...config.updates, enabled: false, checkAutomatically: "NEVER" },
    extra: { ...config.extra, pestifyEnvironment: SECURITY_LAB_VARIANT },
  };
};
