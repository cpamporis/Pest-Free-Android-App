const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withMainApplication, withDangerousMod, withSettingsGradle, withAppBuildGradle } = require('expo/config-plugins');
const PACKAGE = 'com.cpamporis.pestfree.voice';
module.exports = function withPestifyAndroidVoice(config) {
  if (config.android?.package !== 'com.cpamporis.pestfree.dev') throw new Error('Android voice is Security Lab only');
  config = withAndroidManifest(config, mod => {
    const manifest = mod.modResults.manifest;
    manifest['uses-permission'] ||= [];
    for (const permission of ['RECORD_AUDIO','FOREGROUND_SERVICE','FOREGROUND_SERVICE_MICROPHONE','POST_NOTIFICATIONS','WAKE_LOCK']) {
      const name = `android.permission.${permission}`;
      if (!manifest['uses-permission'].some(item => item.$['android:name'] === name)) manifest['uses-permission'].push({$: {'android:name':name}});
    }
    manifest.queries ||= [{}];
    const queries = manifest.queries[0]; queries.intent ||= [];
    for (const name of ['android.speech.RecognitionService','android.intent.action.TTS_SERVICE']) {
      if (!queries.intent.some(i => i.action?.some(a => a.$['android:name'] === name))) queries.intent.push({action:[{$:{'android:name':name}}]});
    }
    const app = manifest.application[0];
    app['meta-data'] ||= [];
    app['meta-data'] = app['meta-data'].filter(m => m.$['android:name'] !== 'PestifyAndroidVoiceLab');
    app['meta-data'].push({$: {'android:name':'PestifyAndroidVoiceLab','android:value':'true'}});
    app.service ||= [];
    app.service = app.service.filter(s => s.$['android:name'] !== `${PACKAGE}.PestifyVoiceService`);
    app.service.push({$: {'android:name':`${PACKAGE}.PestifyVoiceService`,'android:exported':'false','android:foregroundServiceType':'microphone','android:stopWithTask':'true'}});
    return mod;
  });
  config = withMainApplication(config, mod => {
    if (mod.modResults.language !== 'kt') throw new Error('Pestify voice expects Kotlin MainApplication');
    let source = mod.modResults.contents;
    if (!source.includes(`import ${PACKAGE}.PestifyVoicePackage`)) {
      source = source.replace(/^(package [^\n]+\n)/m, `$1\nimport ${PACKAGE}.PestifyVoicePackage\n`);
    }
    if (!source.includes('add(PestifyVoicePackage())')) {
      const anchor = 'PackageList(this).packages.apply {';
      if (!source.includes(anchor)) throw new Error('Cannot register PestifyVoicePackage: MainApplication changed');
      source = source.replace(anchor, `${anchor}\n              add(PestifyVoicePackage())`);
    }
    mod.modResults.contents = source; return mod;
  });
  config = withSettingsGradle(config, mod => {
    if (!mod.modResults.contents.includes("include ':pestify-whisper'")) mod.modResults.contents += "\ninclude ':pestify-whisper'\nproject(':pestify-whisper').projectDir = new File(rootProject.projectDir, 'pestify-whisper')\n";
    return mod;
  });
  config = withAppBuildGradle(config, mod => {
    if (!mod.modResults.contents.includes("implementation project(':pestify-whisper')")) mod.modResults.contents += "\ndependencies { implementation project(':pestify-whisper') }\n";
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    const source = path.join(mod.modRequest.projectRoot,'native','android-voice');
    const dest = path.join(mod.modRequest.platformProjectRoot,'app','src','main','java',...PACKAGE.split('.'));
    await fs.promises.mkdir(dest,{recursive:true});
    for (const file of await fs.promises.readdir(source)) if (file.endsWith('.java')) await fs.promises.copyFile(path.join(source,file),path.join(dest,file));
    await require('../scripts/prepareWhisperAndroid.cjs').prepare(mod.modRequest.projectRoot, mod.modRequest.platformProjectRoot);
    return mod;
  }]);
};
