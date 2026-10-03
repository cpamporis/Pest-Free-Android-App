'use strict';
// Build-time only. This downloader is not imported by application JS or bundled into the APK.
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {createReadStream,createWriteStream}=require('node:fs');
const {Readable,Transform}=require('node:stream');
const {pipeline}=require('node:stream/promises');
const lock=require('../native/whisper-probe/lock.json');
async function digest(file) {
  const hash=crypto.createHash('sha256');
  for await (const bytes of createReadStream(file)) hash.update(bytes);
  return hash.digest('hex');
}
async function ensure(url,file,sha,maxBytes,exactBytes) {
  try { if ((!exactBytes || (await fs.stat(file)).size===exactBytes) && await digest(file)===sha) return; } catch {}
  const temp=file+'.part';
  try {
    const response=await fetch(url,{signal:AbortSignal.timeout(240000)});
    if(!response.ok || !response.url.startsWith('https://'))throw Error('Whisper artifact download failed: '+response.status);
    let count=0;
    const limit=new Transform({transform(chunk,encoding,done){count+=chunk.length;done(count>maxBytes?Error('Whisper artifact size limit'):null,chunk);}});
    await pipeline(Readable.fromWeb(response.body),limit,createWriteStream(temp));
    if((exactBytes && count!==exactBytes) || await digest(temp)!==sha)throw Error('Whisper artifact checksum mismatch');
    await fs.rename(temp,file);
  } finally { await fs.rm(temp,{force:true}); }
}
async function prepare(root,androidRoot) {
  const cache=path.join(root,'.pestify-voice-cache');await fs.mkdir(cache,{recursive:true});
  const archive=path.join(cache,'whisper-source.tar.gz'), model=path.join(cache,lock.model);
  console.log('Preparing pinned offline Whisper engine and model for Android (build-time download only).');
  await ensure(lock.engineUrl,archive,lock.engineSha256,64*1024*1024);
  await ensure(lock.modelUrl,model,lock.modelSha256,64*1024*1024,lock.modelBytes);
  const dest=path.join(androidRoot,'pestify-whisper');await fs.mkdir(dest,{recursive:true});
  const source=path.join(dest,'whisper');
  const entries=execFileSync('tar',['-tzf',archive],{encoding:'utf8',maxBuffer:8*1024*1024}).trim().split('\n');
  const prefix='whisper.cpp-'+lock.engineCommit+'/';
  if(entries.some(e=>!e.startsWith(prefix)||e.split('/').includes('..')||e.includes('\\')))throw Error('Invalid Whisper archive paths');
  await fs.rm(source,{recursive:true,force:true});await fs.mkdir(source,{recursive:true});
  execFileSync('tar',['-xzf',archive,'--strip-components=1','-C',source]);
  for(const name of ['build.gradle','CMakeLists.txt','probe.cpp','consumer-rules.pro']) {
    await fs.copyFile(path.join(root,'native','whisper-probe',name),path.join(dest,name));
  }
  const assets=path.join(dest,'src','main','assets','pestify-whisper');await fs.mkdir(assets,{recursive:true});
  await fs.copyFile(model,path.join(assets,lock.model));
  await fs.copyFile(path.join(source,'LICENSE'),path.join(assets,'WHISPER_CPP_LICENSE.txt'));
  await fs.copyFile(path.join(root,'native','whisper-probe','WHISPER_MODEL_LICENSE.txt'),path.join(assets,'WHISPER_MODEL_LICENSE.txt'));
  await fs.writeFile(path.join(dest,'src','main','AndroidManifest.xml'),'<manifest xmlns:android="http://schemas.android.com/apk/res/android" />\n');
  // Runtime verification constants come from the exact same pinned lock as the downloader.
  const java=path.join(androidRoot,'app','src','main','java','com','cpamporis','pestfree','voice');await fs.mkdir(java,{recursive:true});
  await fs.writeFile(path.join(java,'WhisperModel.java'),`package com.cpamporis.pestfree.voice;\nfinal class WhisperModel {\n  static final String NAME="${lock.model}";\n  static final String SHA256="${lock.modelSha256}";\n  static final long BYTES=${lock.modelBytes}L;\n}\n`);
}
module.exports={prepare,digest,ensure};
