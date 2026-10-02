# Android Tiny field voice

Implemented on feature/android-lab-voice-20261002. This supersedes the foreground-only Whisper probe instructions. No production branch or store release is performed by this change.

## User flow

1. Start a myocide appointment, or a certification appointment with a floor plan.
2. Open Ηχογράφηση and select the existing bait type and dosage dropdowns.
3. Start listening while the app is visible, granting microphone and notification permissions.
4. The app returns to the map. The native foreground microphone service continues when the screen locks, with a stop action in its persistent notification.
5. Say Αλέρτ as a separate phrase and wait for Έτοιμος. Say Σταθμός δύο, κατανάλωση είκοσι πέντε.
6. After roughly 0.9 seconds of silence, Tiny decodes locally. Wait for the readback. The existing station flow commits after successful readback and rearms for the next station.
7. Κατάσταση λείπει / κατεστραμμένο and Πρόσβαση όχι retain the existing terminal-check rules. Normal entries default to functional / accessible with the selected bait and dosage.
8. Κάτοψη δύο reads the administrator's map name and switches the active map. Unique station numbers can route to another map; repeated numbers use the current map, and unresolved ambiguity asks for a map.
9. After 60 seconds without a command, the service returns to wake waiting. An utterance already in progress is not cut off by this idle timer.
10. Άκυρο stops the session while listening, including while waiting for Alert. The screen and notification stop buttons also work during decoding/readback. Completed entries remain; the existing appointment-completion action performs final saving.

The microphone is closed during decoding and playback, so wait for each response before speaking again. A voice stop phrase cannot be heard during those intervals; use the stop button then. Leaving the appointment or invalidating the work context stops the session. Phone/audio interruptions and task removal stop it instead of silently restarting. Maximum session duration is four hours.

## Engine and privacy

Whisper tiny multilingual Q5_1 remains the pinned, SHA-256 verified model in native/whisper-probe/lock.json. No new dependencies or model downloads on the phone. The build bundles the model. AudioRecord supplies 16 kHz mono PCM directly to the existing local JNI decoder. Samsung/Google SpeechRecognizer is no longer used or required for field recognition.

An energy-based endpoint keeps a 300 ms in-memory pre-roll, waits for a speech-like signal, then ends after the configured silence. It rejects isolated short impulses and bounded/truncated utterances rather than executing a partial command. This is not a semantic speech/noise classifier; factory noise must be tested. Low-confidence no-speech results are ignored. Exact whole wake/stop phrases and the existing strict station parser are used; there are no guessed replacements for misheard numbers.

All PCM stays in memory and is cleared after decoding/cancellation. No audio files, transcript logs or cloud fallback. Only model weights are copied into the existing private no-backup directory. Existing station fields use the normal authenticated appointment data path.

Readback uses an installed Greek offline Android TTS voice, rejecting network-required or uninstalled voices. If none is installed, the app explains that requirement and stops. Local TTS availability is separate from Greek speech recognition; Tiny replaces only recognition.

## Build

From the Android Lab checkout:

```powershell
git pull --ff-only origin feature/android-lab-voice-20261002
npx eas-cli build --platform android --profile security-lab-field
```

Lab package remains com.cpamporis.pestfree.dev, Lab environment and channel, updates disabled, runtime pestify-android-voice-lab-4. This APK includes JS and runs without Metro. The old diagnostic card has been removed from the field screen.

After accepting the device tests, build the same reviewed source with:

```powershell
npx eas-cli build --platform android --profile production
```

The production profile now sets PESTIFY_ANDROID_VOICE=1, retains the production package, API environment and update channel, and uses runtime pestify-android-voice-1 to avoid incompatible old OTA updates. Do not leave APP_VARIANT=security-lab or PESTIFY_ANDROID_VOICE_LAB=1 set in the shell when building production. No source edit is required to choose this profile. Building does not publish to Google Play; the normal release/submission process still applies. This is an Android-only profile.

## Evidence and remaining device checks

The user measured the diagnostic on an A71: base recognition 7.3 seconds; tiny 3.5 seconds, with repeated errors in station/consumption words. Integrating field flow does not establish that Tiny has become accurate or that latency has improved. Invalid phrases are rejected, but a wrong transcription that happens to name another valid station/value can still pass syntactic validation. Test against actual intended values before accepting this for production.

Verification for this revision:
- 85 targeted Node tests pass: session lifecycle, readback/commit ordering, invalid input, map routing and ambiguity, interrupted/stale commands, artifact integrity, Lab/production configuration.
- Pure Java endpoint tests cover silence, pauses, short impulses and maximum capture limits.
- Actual WhisperFieldEngine Java compiled and exercised against controlled test platform/decoder doubles: capture, end-of-speech, buffer clearing, cancellation during capture and inference, stale-result suppression, exclusive ownership and recorder release. These are not physical Android or real-model inference tests.
- All native Java sources parse, and changed JS/JSX files parse.

The Android SDK/NDK and a connected device were unavailable in this workspace. Full EAS compilation and real-device background/audio tests remain required. Verify at least: several stations in succession; all permitted consumption values; both terminal conditions and no access; unique and duplicate station numbers across maps; unknown station; Alert after one minute; locked screen; notification stop during decoding; call interruption; leaving and completing the appointment. Check numeric accuracy, battery/heat and latency during a longer session.

Backend, backup jobs/configuration and the iOS repository were not modified.
