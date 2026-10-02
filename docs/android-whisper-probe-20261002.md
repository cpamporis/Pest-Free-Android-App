# Android Lab: local Greek Whisper probe

Branch: feature/android-lab-voice-20261002. Package: com.cpamporis.pestfree.dev.

This is a foreground diagnostic, not continuous field transcription. It does not write inspections, select stations, change maps or activate Alert. The existing field flow remains available but still requires a system recognizer with local Greek. Stop it before starting the probe.

## Build and use

In the Android Lab checkout:

```powershell
git pull --ff-only origin feature/android-lab-voice-20261002
npx eas-cli build --platform android --profile security-lab-field
```

Install this new internal APK. It includes JavaScript and the model; Metro is not required. Open an appointment, then Ηχογράφηση. Use the new Δοκιμή ελληνικών — Whisper card and Δοκιμή 8 δευτερολέπτων, not the existing field-listening button. Grant microphone permission. Wait for Ακούω before speaking. Say a station command, optionally press Τέλος ομιλίας, and wait for the transcript and timings. Keep the screen open. Repeat with different numbers, then repeat with airplane mode enabled and Wi-Fi off after opening the appointment.

The probe captures at most eight seconds of PCM. Navigation away, backgrounding, cancellation, or audio-focus interruption cancels it. There is no wake phrase or background recognition in this probe. The diagnostic never commits the transcript as inspection data, even if the parser accepts it.

## Privacy and dependencies

AudioRecord supplies 16 kHz mono PCM to a JNI bridge running whisper.cpp locally. No speech-recognition provider or network fallback is used. Audio buffers exist in memory and are cleared after processing; no audio files or transcript logs are created. The result is displayed transiently and cleared when the probe screen is closed. Only the existing inspection workflow communicates with the Lab backend.

Approved native dependency: whisper.cpp v1.9.4 at commit 927cfce34f31707e17f2bff35c349632fb9e2c3a, MIT. Model: multilingual base Q5_1, 59,707,625 bytes, MIT. Exact URLs, revisions and SHA-256 digests are in native/whisper-probe/lock.json. No JavaScript packages or lockfile changes.

The Expo config plugin downloads these fixed artifacts on the build machine, verifies their hashes, and bundles the model and licenses as APK assets. A download/hash error fails the build. The phone does not download the engine/model. At runtime only the model is copied into private no-backup storage, with SHA-256 verification. The PCM and transcript are not stored there.

Only APP_VARIANT=security-lab with PESTIFY_ANDROID_VOICE_LAB=1 enables this plugin. Runtime version is pestify-android-voice-lab-2. Production, iOS, backend and backup configuration are unchanged. Native build additions require a new APK; later JS-only refinements can use a compatible development client or existing update workflow.

## Validation and remaining gates

- 161 Node tests pass, including artifact corruption rejection and existing station/map/session tests.
- Expo Android prebuild succeeds and includes the local library, generated model constants and pinned model asset.
- Android JS export succeeds.
- All Android voice Java sources compile against Android API and React Native 0.81.5 classes.
- Host CMake compiles the actual whisper.cpp/JNI bridge; the actual pinned model loads and runs inference. JNI rejects invalid PCM/length and honours pre-inference cancellation.

No Android SDK/NDK APK compilation or physical A71 test was available in this workspace. EAS must complete the Android build. Host timings do not predict phone latency. Greek accuracy, numeric accuracy, peak memory, device heat and battery impact remain unverified. Test foreground Greek accuracy and latency first; do not enable automatic writes or continuous background Whisper until these results are acceptable.
