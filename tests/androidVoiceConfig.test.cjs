const {test}=require('node:test');
const assert=require('node:assert/strict');
const configure=require('../app.config');
const base=require('../app.json').expo;
const eas=require('../eas.json');
function configWith(env) {
 const keys=['APP_VARIANT','PESTIFY_ANDROID_VOICE','PESTIFY_ANDROID_VOICE_LAB','EAS_BUILD_PLATFORM'];
 const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try {for(const k of keys)process.env[k]=env[k]||'';return configure({config:base});}
 finally {for(const k of keys){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}}
}
test('ordinary configuration without a voice build flag is unchanged',()=>assert.deepEqual(configWith({}),base));
test('voice Lab has its own package and runtime, with updates disabled',()=>{
 const config=configWith({APP_VARIANT:'security-lab',PESTIFY_ANDROID_VOICE_LAB:'1',EAS_BUILD_PLATFORM:'android'});
 assert.equal(config.android.package,'com.cpamporis.pestfree.dev');
 assert.equal(config.updates.enabled,false);assert.equal(config.runtimeVersion,'pestify-android-voice-lab-9');
 assert.ok(config.plugins.includes('./plugins/withPestifyAndroidVoice'));assert.deepEqual(config.ios,base.ios);
});
test('production profile builds the same voice feature with production identity and update settings',()=>{
 const config=configWith({...eas.build.production.env,EAS_BUILD_PLATFORM:'android'});
 assert.equal(config.android.package,base.android.package);assert.equal(config.name,base.name);
 assert.equal(config.runtimeVersion,'pestify-android-voice-4');assert.deepEqual(config.updates,base.updates);
 assert.deepEqual(config.extra,base.extra);assert.ok(config.plugins.includes('./plugins/withPestifyAndroidVoice'));
 assert.equal(eas.build.production.channel,'production');
});
for(const env of [{PESTIFY_ANDROID_VOICE_LAB:'1'}, {APP_VARIANT:'security-lab',PESTIFY_ANDROID_VOICE_LAB:'1',EAS_BUILD_PLATFORM:'ios'}, {PESTIFY_ANDROID_VOICE:'1',EAS_BUILD_PLATFORM:'ios'}, {APP_VARIANT:'unknown',PESTIFY_ANDROID_VOICE:'1'}]) {
 test('rejects mismatched voice profile: '+JSON.stringify(env),()=>assert.throws(()=>configWith(env)));
}
