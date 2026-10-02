const {test}=require('node:test');const assert=require('node:assert/strict');
const {createFieldVoiceSession}=require('../src/voice/fieldVoiceSession');
function setup(options={}) {
 let id,answer,valid=true,commits=0,continued=0,waits=0,active=false;
 const states=[],previews=[];
 const native={stopField(){},async startField(key){id=key;return true;},reply(){return new Promise(resolve=>{answer=resolve;});},continueAfterCommit(){continued++;},waitForWake(){waits++;}};
 const controller=createFieldVoiceSession({native,newId:()=>String(Math.random()),prepare:()=>options.invalid?{ok:false}:{ok:true,candidate:{},readback:'Σταθμός 2, κατανάλωση 25%.'},validate:()=>valid,
  onWakePreview:x=>previews.push(x),commit(){commits++;},onActive:x=>{active=x;},onState:(...x)=>states.push(x)});
 return {controller,states,previews,get id(){return id;},get commits(){return commits;},get continued(){return continued;},get waits(){return waits;},get active(){return active;},answer:x=>answer(x),invalidate:()=>{valid=false;},
  event:(text='Σταθμός 2 κατανάλωση 25',commandId='cmd')=>controller.handleEvent({code:'COMMAND',sessionId:id,commandId,text})};
}
test('field command commits only after readback and resumes natively',async()=>{
 const f=setup();await f.controller.start();const result=f.event();assert.equal(f.commits,0);f.answer(true);await result;assert.equal(f.commits,1);assert.equal(f.continued,1);
 await f.event();assert.equal(f.commits,1);assert.equal(f.continued,1);
});
test('pending and completed duplicates are ignored',async()=>{
 const f=setup();await f.controller.start();const result=f.event();await f.event();f.answer(true);await result;await f.event();assert.equal(f.commits,1);
});
test('stop while native speaks invalidates pending commit',async()=>{
 const f=setup();await f.controller.start();const result=f.event();f.controller.stop();f.answer(true);await result;assert.equal(f.commits,0);assert.equal(f.active,false);
});
test('native interruption prevents pending commit',async()=>{
 const f=setup();await f.controller.start();const result=f.event();await f.controller.handleEvent({code:'STOPPED',sessionId:f.id,reason:'AUDIO_INTERRUPTED'});f.answer(false);await result;assert.equal(f.commits,0);assert.equal(f.continued,0);
});
test('context change during native readback prevents commit',async()=>{
 const f=setup();await f.controller.start();const result=f.event();f.invalidate();f.answer(true);await result;assert.equal(f.commits,0);assert.equal(f.active,false);
});
test('wake and listening states cannot store a station',async()=>{
 const f=setup();await f.controller.start();for(const code of ['WAITING_WAKE','LISTENING'])await f.controller.handleEvent({code,sessionId:f.id});assert.equal(f.commits,0);
});
test('events from a previous session cannot affect the current one',async()=>{
 const f=setup();await f.controller.start();const old=f.id;await f.controller.start();await f.controller.handleEvent({code:'STOPPED',sessionId:old});assert.equal(f.active,true);
});
test('invalid command resumes without committing',async()=>{
 const f=setup({invalid:true});await f.controller.start();const result=f.event();f.answer(true);await result;assert.equal(f.commits,0);assert.equal(f.continued,1);
});
test('pause returns to wake while termination closes the session',async()=>{
 const f=setup();await f.controller.start();await f.event('Παύση.');assert.equal(f.waits,1);assert.equal(f.active,true);await f.event('Τερματισμός.','cmd2');assert.equal(f.active,false);assert.equal(f.commits,0);
});
test('wake diagnostics never become commands and ignore old sessions',async()=>{
 const f=setup();await f.controller.start();
 await f.controller.handleEvent({code:'WAKE_PREVIEW',sessionId:f.id,stage:'rejected',text:'Σταθμός 2 κατανάλωση 25'});
 assert.deepEqual(f.previews.at(-1),{stage:'rejected',text:'Σταθμός 2 κατανάλωση 25'});
 assert.equal(f.commits,0);assert.equal(f.continued,0);
 const count=f.previews.length;
 await f.controller.handleEvent({code:'WAKE_PREVIEW',sessionId:'stale',text:'old'});
 assert.equal(f.previews.length,count);
 f.controller.stop();assert.equal(f.previews.at(-1),null);
});
test('wake preview is bounded and never advances the session',async()=>{
 const f=setup();await f.controller.start();
 await f.controller.handleEvent({code:'WAKE_PREVIEW',sessionId:f.id,stage:'accepted',text:'x'.repeat(500)});
 assert.equal(f.previews.at(-1).text.length,160);assert.equal(f.commits,0);assert.equal(f.continued,0);
});
test('configuration is applied before opening native capture',async()=>{
 const calls=[];const configuration={wakePhrases:['Δοκιμή'],readyMessage:'Ναι',idleSeconds:90,silenceSeconds:2,captureSeconds:30};
 const native={stopField(){},async configureField(value){calls.push(value);return true;},async startField(){calls.push('start');return true;}};
 const flow=createFieldVoiceSession({native,configuration,onActive(){},onState(){}});await flow.start();assert.deepEqual(calls,[configuration,'start']);
});
test('invalid configuration never starts microphone capture',async()=>{
 let started=false;const states=[];
 const native={stopField(){},async configureField(){throw Object.assign(Error('invalid'),{code:'INVALID_CONFIGURATION'});},async startField(){started=true;}};
 const flow=createFieldVoiceSession({native,onActive(){},onState:(...s)=>states.push(s)});await flow.start();assert.equal(started,false);assert.equal(states.at(-1)[0],'idle');
});
test('stop during configuration prevents delayed native start',async()=>{
 let resolve,started=false;
 const native={stopField(){},configureField(){return new Promise(r=>{resolve=r;});},async startField(){started=true;}};
 const flow=createFieldVoiceSession({native,onActive(){},onState(){}});const pending=flow.start();flow.stop();resolve(true);await pending;assert.equal(started,false);
});
test('successful start reports readiness to dismiss settings without stopping session',async()=>{
 const f=setup();assert.equal(await f.controller.start(),true);assert.equal(f.active,true);
 const pending=f.event();f.answer(true);await pending;assert.equal(f.commits,1);assert.equal(f.active,true);
});
test('Άκυρο stops listening and preserves all earlier committed station entries',async()=>{
 const f=setup();await f.controller.start();const pending=f.event();f.answer(true);await pending;
 await f.event('ΑΚΥΡΟ!','cancel');assert.equal(f.active,false);assert.equal(f.commits,1);
 await f.event('Σταθμός 3 κατανάλωση 50','later');assert.equal(f.commits,1);
});
test('native stop phrase in wake waiting preserves earlier entries and leaves no live session',async()=>{
 const f=setup();await f.controller.start();const pending=f.event();f.answer(true);await pending;
 await f.controller.handleEvent({sessionId:f.id,code:'WAITING_WAKE'});
 await f.controller.handleEvent({sessionId:f.id,code:'STOPPED',reason:'VOICE_CANCELLED'});
 assert.equal(f.active,false);assert.equal(f.commits,1);assert.match(f.states.at(-1)[1],/διατηρήθηκαν/);
});
test('native cancellation during pending readback cannot commit the unfinished command',async()=>{
 const f=setup();await f.controller.start();const pending=f.event();
 await f.controller.handleEvent({sessionId:f.id,code:'STOPPED',reason:'VOICE_CANCELLED'});f.answer(false);await pending;
 assert.equal(f.commits,0);assert.equal(f.continued,0);
});
