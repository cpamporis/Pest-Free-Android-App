const SECURITY_LAB_VARIANT = "security-lab";
const SECURITY_LAB_NAME = "Pestify Dev";
const SECURITY_LAB_ANDROID_PACKAGE = "com.cpamporis.pestfree.dev";
const SECURITY_LAB_SCHEME = "pestify-android-dev";

module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT;
  const voice = process.env.PESTIFY_ANDROID_VOICE_LAB === "1";
  if (voice && (variant !== SECURITY_LAB_VARIANT || (process.env.EAS_BUILD_PLATFORM && process.env.EAS_BUILD_PLATFORM !== "android"))) {
    throw new Error("Android voice requires the Android Security Lab profile");
  }

  if (variant && variant !== SECURITY_LAB_VARIANT) {
    throw new Error(`Unsupported APP_VARIANT: ${variant}`);
  }

  if (variant !== SECURITY_LAB_VARIANT) {
    return config;
  }

  return {
    ...config,
    name: SECURITY_LAB_NAME,
    ...(voice ? { runtimeVersion: "pestify-android-voice-lab-3", plugins: [...(config.plugins || []), "./plugins/withPestifyAndroidVoice"] } : {}),
    scheme: SECURITY_LAB_SCHEME,
    android: {
      ...config.android,
      package: SECURITY_LAB_ANDROID_PACKAGE
    },
    updates: {
      ...config.updates,
      enabled: false,
      checkAutomatically: "NEVER"
    },
    extra: {
      ...config.extra,
      pestifyEnvironment: SECURITY_LAB_VARIANT
    }
  };
};
