# Android Lab: local Greek recognition diagnostic

Native diagnostic version `local-greek-1`; Lab runtime `pestify-android-voice-lab-6`.

Open the appointment voice screen. A Lab-only diagnostic card appears above the existing settings. Stop the existing field session before using it.

1. Check languages. Installed, downloadable and pending lists come from the on-device SpeechRecognizer (not keyboard or TTS settings).
2. Test local recognition. Say “Σταθμός δύο, κατανάλωση είκοσι πέντε”. This test intentionally works even if the capability query failed or omitted Greek. It does not call the station parser or write appointment data. No TTS initialization is required.
3. If appropriate, request Greek model download, then check again after completion. API 33 cannot report download progress through the newer API 34 listener; request acceptance does not establish support or completion.

Report the entire language-list result and the result/error of the actual recognition test. LOCAL_RECOGNITION_12 = language unsupported; 13 = language unavailable; 7 = no match; 6 = speech timeout. Query failure alone does not establish lack of Greek support. A successful Greek recognition demonstrates availability in that installed provider/device state, not reliability of continuous/background field operation.

Uses only createOnDeviceSpeechRecognizer; no generic factory or network fallback. No audio files, transcript logging or server submission are added. Recognition text exists in React component memory until leaving the diagnostic screen. System service implementation is platform-owned. Model download may use Internet. No additional dependencies. Existing Tiny field flow is unchanged; Base migration remains a separate next step if native Greek cannot be used.

Lifecycle: foreground-only test; destroy/cancel on exit/background; generation guards reject stale callbacks; 20-second timeout; exclusive with field and Whisper sessions. New native APK required. Main, iOS, backend and backups are unchanged.

Validation: Java/JS syntax checks and focused Node regression tests. No Android SDK/NDK or connected A71 available in this workspace: APK compilation and device execution remain unverified until EAS/device testing.

## local-greek-2: modal foreground correction

Lab runtime is now pestify-android-voice-lab-7. The first diagnostic incorrectly required Activity.hasWindowFocus while launched inside a React Native Modal. A modal can own focus while its host activity remains resumed. Use the React context RESUMED lifecycle plus a live activity instead; background cancellation remains enforced.

The UI now renders the actual native diagnostic version, restores its mounted flag on effect setup, rejects duplicate starts synchronously, and cancels only an active test on an actual background transition. Completed error results are not overwritten by later AppState notifications. Regression tests exercise the real async component handlers with hook/platform doubles for background cancellation, late results, duplicate starts and cleanup/setup. 49 focused Node tests pass, plus native Java and JSX syntax checks. This is not an Android build or real-device verification. The field engine label tiny-field-2 remains unchanged because it describes a different module.
