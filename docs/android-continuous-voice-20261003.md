# Android continuous voice experiment — 2026-10-03

## Preserved candidate

`release/android-voice-candidate-20261003` points to tested-source commit
`22bdb18f9ebcc5f0bf39720f4dfd45ab1ded6cc2` (voice-js-7, base-field-2).
The original `feature/android-lab-voice-20261002` remains unchanged.
This identifies source; it does not claim a new candidate APK has been built.
No production, iOS, backend, backup or dependency changes.

## Experimental branch

`feature/android-continuous-voice-20261003` uses the same Base model, same app
identity and all existing station, map, defaults, terminal condition, access,
readback-before-commit and voice spelling/number validation paths.
Native marker: continuous-field-1; JS marker: continuous-js-1.
The local Greek diagnostic section was removed from the field voice screen.
The underlying diagnostic modules remain packaged to avoid unrelated changes.

## Audio architecture

One AudioRecord remains open across decoding. A capture worker consumes 20 ms
frames, retains a 300 ms pre-roll, and creates bounded utterances. A separate
worker runs the existing local Whisper engine serially. At most two utterances
wait in RAM; each expires after 20 seconds by default. The current utterance
is bounded to 11 seconds plus pre-roll, within the existing JNI limit.
Samples are zeroed on consumption, discard, expiry and shutdown; no PCM file,
transcript logging, audio upload or new network recognizer is introduced.

A configurable energy/onset/duration gate rejects quiet input and short clicks
before decoding. This is a lightweight acoustic activity heuristic, NOT a
trained speech VAD or Greek acoustic keyword detector. TV speech and sustained
loud noise can still reach Whisper. Text relevance above 60 percent is tested
AFTER local decoding and never authorizes numerical values at that threshold.
Numbers retain the unambiguous 80 percent policy.

Unrelated decoder output is discarded via a new command-ID-scoped native
ignoreCommand method. It neither resets relevant-activity time nor enters wake
mode. Relevant malformed commands retain spoken corrections. After 60 seconds
without relevant activity, wake mode is announced. In-flight command/readback
is allowed to finish; bounded capture/decode grace prevents interrupting an
utterance exactly at the minute. Changing modes clears pending audio.

During Pestify TTS and its short settling guard, the physical microphone stays
open but input is discarded, preventing self-triggered commands. Users must
not speak over readback. Completed pre-TTS utterances remain queued. If the
queue overflows or expires, pending commands are cleared and an audible repeat
request is made at the next safe boundary. Already committed entries remain.
The queue is not a guarantee of real-time recognition on a slow phone.

## Build once, then Metro

First build:

```powershell
git fetch origin feature/android-continuous-voice-20261003
git switch -c feature/android-continuous-voice-20261003 FETCH_HEAD
npx eas-cli build --platform android --profile security-lab-continuous
```

Install the resulting Dev APK (replaces the existing Pestify Dev installation;
the production app is separate). Keep the old EAS APK if binary rollback is
wanted. The preserved source branch remains available regardless.

Then start Metro:

```powershell
$env:APP_VARIANT="security-lab"
$env:PESTIFY_ANDROID_VOICE_LAB="1"
npx expo start -c
```

With expo-dev-client installed, open the installed development client and
connect to Metro. No EAS Update or production rollout is part of this change.
For future branch changes: git pull --ff-only origin feature/android-continuous-voice-20261003.
Stop voice and start a new session after changing settings.

Metro-editable:
- src/voice/fieldVoiceConfig.js: phrases, inactivity, endpoint timing, onset,
  RMS/noise ratio, minimum voiced duration, queue capacity/expiry, no-speech bound.
- src/voice/voiceCommandPolicy.js: invalid-command relevance words/threshold.
- Existing parser, aliases, numerical rules and screens.

Native engine/bridge code, dependencies, permissions and model replacement
still need a new APK. Changes outside native setting bounds also require code
changes; the bridge rejects unknown or out-of-range configuration atomically.

## Validation and device acceptance

Host: targeted JS suite; pure Java config/endpoint tests; Android API stubs for
continuous capture while decoder is blocked, FIFO decoding, TTS discard,
shutdown, ownership, queue bounds, expiry and array erasure. Service/bridge Java
syntax and JSX syntax checked. This is NOT a full Android Gradle/EAS build or a
physical A71 test.

On A71 verify: minute of silence; background noise; next command during decoding;
three sequential stations; duplicated station IDs across maps; missing/damaged/
no-access; repeated cancel; locked screen; TTS cannot trigger itself; overflow
warning; stop/restart; permissions and audio interruption. Confirm readback and
stored station values before considering production migration.
