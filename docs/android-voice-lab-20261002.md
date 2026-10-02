# Android voice field trial — 2026-10-02

Branch: `feature/android-lab-voice-20261002`
Base: Android `security-lab-production-parity-20261001`, commit `21741bc3e7b2f199854b1263cd617714d4a202cb`.
Shared flow ported from iOS production voice commit `0c0adc891ca38901f85564eeb56ad149fa79b725`.

## Scope and isolation

Security Lab only: existing Lab API origin, authentication namespace and `.dev` Android
package remain unchanged. No backend or backup changes. No dependency or lockfile changes.
No production merge, deployment or Google Play submission. Existing Android photo upload,
keyboard, form, commercial and final-save behavior is retained.

The voice button is on the active-work map in myocide and certification. Certification
without a map image has no voice entry. Only BS stations are eligible. Before listening,
the technician chooses existing bait and dosage dropdowns. Successful startup closes the
settings modal while leaving its session owner mounted on the map.

Existing shared behavior: exact commands, automatic readback then entry, sequential stations,
Functional/Yes defaults, Missing/Damaged/No-access terminal cases, named map readback,
current-map preference, unique cross-map routing, explicit `Κάτοψη δύο` for duplicate numbers,
and context/expiry validation before and after readback. Invalid or interrupted commands
are not entered. Closing settings is not stopping; use Διακοπή or say Άκυρο while listening.
Recorded station entries remain in the existing work flow; final server persistence still
uses the ordinary completion/save action. This is not a new durable offline data store.

## Android native implementation

- Voice trial requires Android 13/API 33+ to verify installed on-device Greek support.
  The application's ordinary minimum Android version is unchanged.
- Uses only `SpeechRecognizer.createOnDeviceSpeechRecognizer`. There is no remote-recognition
  fallback. `EXTRA_PREFER_OFFLINE` is only an additional hint, not the privacy mechanism.
- `checkRecognitionSupport` must report installed Greek for the requested recognition intent.
  Unsupported/missing/download-pending/provider-error states block capture with a message.
- Greek TTS selects an installed voice with `isNetworkConnectionRequired() == false`;
  a voice marked as requiring a data download is rejected. No network TTS fallback is selected.
- Microphone and notification permission are requested on explicit start. Service starts
  only while the activity is foreground, with an existing event subscriber and valid Lab config.
- Non-exported microphone foreground service, ongoing notification with native stop action,
  partial wake lock, audio focus loss stop, non-sticky lifecycle. Closing the task/bridge stops it.
- No startup/boot receiver, force-quit resurrection, accessibility service or battery exemption.
- Native owns exact full-final Alert/Άκυρο matching, recognition restart, audio playback,
  60-second command inactivity return to wake, watchdogs and stop. No partial result is executed.
- Capture is cancelled/destroyed during TTS, preventing own readback from becoming a command.
  Only completion of the correct utterance resolves the reply promise. JS validates/commits
  and explicitly acknowledges before another command can begin.
- Maximum session is four hours with native shutdown; restart manually if needed.
- Configurable phrases/timing remain JS settings validated natively and frozen for a session.
  Keep the same native binary for JS-only adjustments; native/service/plugin changes need a build.
- No audio files, transcript storage, raw transcript logs or app-operated speech upload.
  Android's configured recognition/TTS services are platform components; this code cannot audit
  third-party OS provider internals. Test in airplane mode on each supported device family.

## Important trial limits

Android documentation explicitly says SpeechRecognizer is not intended for continuous
recognition. This trial rearms bounded local utterances with delays and capped retries; it
is not a dedicated low-power keyword detector and it is not equivalent to a system assistant.
Expect device/provider differences, brief gaps between recognition requests, possible provider
beeps, throttling, and battery use. Two-hour background reliability is NOT established by
unit tests or prebuild. Do not promote to production until device tests pass. If Greek is not
available locally, report the device/provider result and choose a different local engine
separately; do not silently enable cloud recognition or add dependencies.

## Build

In a clean checkout of **cpamporis/Pest-Free-Android-App**:

```powershell
git status --short --branch
git fetch origin refs/heads/feature/android-lab-voice-20261002:refs/remotes/origin/feature/android-lab-voice-20261002
git switch --no-track -c feature/android-lab-voice-20261002 origin/feature/android-lab-voice-20261002
npm ci
npx eas-cli build --platform android --profile security-lab-field
```

The explicit fetch and no-track switch also work in a checkout with a restricted fetch refspec.
If the local branch already exists, switch to it and use `git pull --ff-only origin feature/android-lab-voice-20261002`.
Never reset/discard unrelated local work. `security-lab-field` is an installable internal APK,
not a Play Store AAB and not an Expo Go app. It includes its JS and does not require Metro.

For development with Metro, use `--profile security-lab-voice`, then:

```powershell
$env:APP_VARIANT = "security-lab"
$env:PESTIFY_ANDROID_VOICE_LAB = "1"
npx expo start --dev-client
```

No EAS build has been queued from this workspace. Build/sign/install using the owner's EAS account.

## Validation

- JavaScript regression suite, including map collisions, stop during readback, configuration
  cancellation and stale session isolation.
- Pure-Java VoiceConfig tests for exact matching, invalid/range settings and snapshot isolation.
- Native Java sources compiled against Android 15 API classes and React Native 0.81.5 classes.
  This catches Java/API signature errors; it is not a full Gradle APK build or device test.
- Expo SDK 54 (repository lockfile) Android bundle export and Android prebuild.
- Generated manifest/package registration verified: microphone service type, non-exported
  service, permissions, recognition/TTS service queries, `.dev` package, Lab flag, native sources.

## Device acceptance (before any production promotion)

1. Open a Lab appointment, start work, open recording, choose bait/dose, allow permissions.
   If Greek availability fails, capture the message and device model/Android version.
2. Say Αλέρτ, hear Έτοιμος. Enter three different stations/consumptions sequentially; verify all fields.
3. Test Missing, Damaged, No access and normal defaults. Ensure terminal cases clear bait data.
4. Test explicit map switch (hear admin name), unique station in another map, duplicate station
   numbers, nonexistent stations, and ambiguous stations. No guessed/incorrect-map entry.
5. Start while visible; lock the screen, wait over one minute, say Αλέρτ and another station.
6. Repeat after loading the work and bait list then enabling airplane mode. Speech/readback
   should remain local; ordinary API loading/final synchronization can still require Internet.
7. Stop by Άκυρο and independently by the notification and the in-app button. Verify microphone
   indicator/notification disappear and previous entries remain in the open work.
8. Interrupt readback with a call or stop action; unfinished entry must not be committed.
   Try task removal, permission revocation and re-open; no surprise microphone restart.
9. Run a two-hour route with TV/factory noise and one-minute walking gaps. Record accuracy,
   background stops, duplicate/missing entries, thermal behavior and battery drain.

References:
- https://developer.android.com/reference/android/speech/SpeechRecognizer
- https://developer.android.com/reference/android/speech/RecognitionSupport
- https://developer.android.com/develop/background-work/services/fgs/service-types
- https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start
- https://developer.android.com/reference/android/speech/tts/Voice
