# Android Lab: readback and exact word variants

Native version base-field-2. Lab runtime pestify-android-voice-lab-9; prepared production runtime pestify-android-voice-4. Changes are on the Lab branch only.

The A71 speaks the Greek system TTS sample but the user hears no Pestify ready/readback. No physical device is available here to confirm the precise cause. This revision replaces assistant/exclusive audio focus with transient media focus, uses explicit media speech attributes/stream and full relative utterance volume, and rejects muted media playback instead of proceeding. It does not change system volume or force the speaker over connected headphones.

Initialization now speaks “Η φωνητική λειτουργία ενεργοποιήθηκε. Πείτε αλέρτ.” before microphone capture, independently testing TTS without waiting for Whisper. onStart and onDone are both required before continuation; errors, timeout, interruption, and detected mute stop the session without a pending station commit. Callback success cannot prove that the user physically heard the speaker; device validation is still required.

The screen shows engine/voice, TTS stage, and the most recent raw recognition text (Lab only, RAM only, no logs/storage/network). These allow investigating a failed test without immediately building again.

Explicit command spellings: σταθμος/σταμος/σταβμος/σταδμος, κατοψη/κατωψη/κατοπσι and whitespace-split command words. Numbers use the existing Greek grammar plus exact split-word joining and the requested αινα, ηκοσυ, ηκωσι variants. No nearest-number or nearest-station matching, edit distance or digit concatenation. Wake/cancel allow whitespace splits of the complete configured phrase, never a substring of conversation. Additional JS aliases can be adjusted through Metro in a development client.

95 focused Node tests pass; pure Java VoiceConfig tests pass; modified Java and six JS/JSX sources parse. No Android SDK/device build validation was possible here. EAS compilation and A71 checks remain required. No new dependencies, audio files or remote recognition. Backend, backups, iOS and main unchanged.

## One development build for subsequent JS iterations

From the Android Lab branch:

    git pull --ff-only origin feature/android-lab-voice-20261002
    npx eas-cli build --platform android --profile security-lab-voice

Install that dev-client APK. Start Metro from the same folder in PowerShell:

    $env:APP_VARIANT="security-lab"
    $env:PESTIFY_ANDROID_VOICE_LAB="1"
    npx expo start --dev-client

Phone and computer must be able to reach each other on the local network. The network delivers development code; speech processing remains on-device. Native changes still require a build; JS parser/alias changes do not. Do not use security-lab-field for this iterative run: that profile embeds JS in a standalone APK.

Check: hear the startup sentence, then Alert/ready, then “σταθμός πέντε κατανάλωση είκοσι πέντε” readback and actual values, then map/cancel. If silent, reopen voice screen and report the engine and TTS stage; if parsing fails, report the displayed transcript. Do not repeat a command while decoding/readback is in progress.
