# Android Lab field recognition: Whisper Base

The A71 diagnostic local-greek-2 reports no installed on-device languages, a downloadable list without el/el-GR, and actual local recognition failure LOCAL_RECOGNITION_12 (language unsupported). This establishes lack of Greek support in that current on-device recognizer, not all Android devices or all Google language facilities. Download request silence does not establish installation.

Switch the bundled multilingual Q5_1 model from Tiny to the exact Base artifact tested earlier: ggml-base-q5_1.bin, 59,707,625 bytes, SHA256 422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898. The engine, CPU configuration, in-memory microphone capture and field session state machine are unchanged. No dependency added. No network audio recognition or audio file introduced. Only model weights are persisted.

Native field version base-field-1; Lab runtime pestify-android-voice-lab-8. Prepared production runtime increments to pestify-android-voice-3 to isolate the changed model bundle, but this commit is Lab branch only and does not deploy production.

Alert/readback/automatic station entry, map routing, defaults, condition/access, cancellation and background operation retain their existing implementation. Base previously decoded the user's Greek diagnostic accurately at 7.3 seconds; no new latency or full field accuracy claim is made. Re-test those flows on the A71 with the new model, including waiting for readback before speaking the next command.

89 focused Node tests pass (session lifecycle, station defaults, map routing, configuration, checksum verification), and modified Java parses. No EAS build or real-device test was run here. Build security-lab-field from feature/android-lab-voice-20261002. iOS, backend, backup configuration and main remain untouched.
