# Android voice production merge — 2026-10-03

Approved feature: e3d3bdd38f6383ea84149d09722060f26bf633d7.
Production parent: 71c0262104545970b3b51a477c2eebe2a4f0661b.
Three-way integration preserves newer production changes. API service, backend,
package identity, EAS project, dependencies and backups remain unchanged.
Production runtime: pestify-android-continuous-production-1.
EAS production: store distribution, developmentClient false, Android app-bundle,
remote autoIncrement, production channel, PESTIFY_ANDROID_VOICE=1.

Build: npx eas-cli build --platform android --profile production
Clear APP_VARIANT and PESTIFY_ANDROID_VOICE_LAB in the invoking shell.
No Play submission is triggered by merge or this build command.

Verification: 80 targeted voice JS tests, merged screen/API JSX syntax, production
package/runtime and EAS profile configuration checks. Prior continuous-branch
Java host tests cover the same native source. Physical-device behavior is the
user-tested version, including its accepted limitations. No EAS build was run
in the assistant environment: no Expo token or saved Expo login is available.
