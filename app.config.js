const SECURITY_LAB_VARIANT = "security-lab";
const SECURITY_LAB_NAME = "Pestify Dev";
const SECURITY_LAB_ANDROID_PACKAGE = "com.cpamporis.pestfree.dev";
const SECURITY_LAB_SCHEME = "pestify-android-dev";

module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT;

  if (variant && variant !== SECURITY_LAB_VARIANT) {
    throw new Error(`Unsupported APP_VARIANT: ${variant}`);
  }

  if (variant !== SECURITY_LAB_VARIANT) {
    return config;
  }

  return {
    ...config,
    name: SECURITY_LAB_NAME,
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
