const {test}=require('node:test');
const assert=require('node:assert/strict');
const configure=require('../app.config');
const base=require('../app.json').expo;
const {spawnSync}=require('node:child_process');
const path=require('node:path');
function configWith(env) {
  const result=spawnSync(process.execPath,['-e','console.log(JSON.stringify(require("./app.config")({config:require("./app.json").expo})))'],{
    cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,APP_VARIANT:'',PESTIFY_ANDROID_VOICE_LAB:'0',EAS_BUILD_PLATFORM:'',...env}
  });
  return result;
}
test('ordinary production configuration does not load voice native code',()=>{
 const result=configWith({}); assert.equal(result.status,0); assert.deepEqual(JSON.parse(result.stdout),base);
});
test('voice build remains an isolated Lab package with updates disabled',()=>{
 const result=configWith({APP_VARIANT:'security-lab',PESTIFY_ANDROID_VOICE_LAB:'1',EAS_BUILD_PLATFORM:'android'});
 assert.equal(result.status,0);const config=JSON.parse(result.stdout);
 assert.equal(config.android.package,'com.cpamporis.pestfree.dev');
 assert.equal(config.updates.enabled,false);assert.equal(config.runtimeVersion,'pestify-android-voice-lab-3');
 assert.ok(config.plugins.includes('./plugins/withPestifyAndroidVoice'));
 assert.deepEqual(config.ios,base.ios);
});
for(const env of [{PESTIFY_ANDROID_VOICE_LAB:'1'}, {APP_VARIANT:'security-lab',PESTIFY_ANDROID_VOICE_LAB:'1',EAS_BUILD_PLATFORM:'ios'}]) {
 test('rejects a voice build outside Android Security Lab: '+JSON.stringify(env),()=>assert.notEqual(configWith(env).status,0));
}
