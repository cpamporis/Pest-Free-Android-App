const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const native=read('native/android-voice/PestifyLocalRecognitionProbe.java');
test('diagnostic has no generic recognizer, audio persistence, logging or remote fallback',()=>{
 assert.match(native,/createOnDeviceSpeechRecognizer/);
 assert.doesNotMatch(native,/\.createSpeechRecognizer\s*\(|EXTRA_PREFER_OFFLINE|FileOutputStream|MediaRecorder|android\.util\.Log|https?:\/\//);
 assert.match(native,/getPackageName\(\)\.equals\("com.cpamporis.pestfree.dev"\)/);
});
test('real local utterance is allowed independently of capability query and bounded',()=>{
 const listen=native.slice(native.indexOf('@ReactMethod public void listen'),native.indexOf('@ReactMethod public void cancel'));
 assert.match(listen,/startListening\(intent\(\)\)/);
 assert.doesNotMatch(listen,/checkRecognitionSupport|getInstalledOnDeviceLanguages/);
 assert.match(native,/LOCAL_TIMEOUT/);
 assert.match(native,/old.cancel\(\); old.destroy\(\)/);
 assert.match(native,/onHostPause/);
});
test('field and diagnostic sessions exclude each other',()=>{
 assert.match(native,/PestifyVoiceService.current!=null/);
 assert.match(native,/field.startPromise!=null/);
 assert.match(read('native/android-voice/PestifyFieldSession.java'),/PestifyLocalRecognitionProbe.isBusy\(\)/);
});
