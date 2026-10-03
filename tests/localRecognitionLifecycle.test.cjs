const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
// Exercise the real component's async handlers with hook/platform doubles; omit only JSX rendering.
function setup(probe) {
 let effect, event, values=[];
 const source=fs.readFileSync(path.join(__dirname,'../src/voice/LocalRecognitionDiagnostic.js'),'utf8')
  .replace(/^import .*\n/gm,'').replace('export default function','function');
 const code=source.slice(0,source.indexOf('  return <View'))+'  return {run};\n}\nLocalRecognitionDiagnostic({enabled:true,onBusy:()=>{}});';
 const scope={NativeModules:{PestifyLocalRecognitionProbe:probe},useState:value=>{const i=values.length;values.push(value);return [value,v=>values[i]=v];},useRef:current=>({current}),useEffect:f=>effect=f,AppState:{addEventListener:(_,f)=>{event=f;return {remove(){}};}},PermissionsAndroid:{PERMISSIONS:{RECORD_AUDIO:'mic'},RESULTS:{GRANTED:'granted'},request:async()=>'granted'}};
 const component=vm.runInNewContext(code,scope);
 let cleanup=effect();
 return {run:component.run,values,event:s=>event(s),remountEffect(){cleanup();cleanup=effect();}};
}
test('completed native error survives later background event',async()=>{
 const h=setup({check:async()=>{throw {code:'LOCAL_SUPPORT_14'};},cancel(){}});
 await h.run('check');h.event('background');assert.match(h.values[1],/LOCAL_SUPPORT_14/);assert.equal(h.values[0],false);
});
test('effect cleanup/setup does not suppress all subsequent results',async()=>{
 const h=setup({listen:async()=>({text:'Σταθμός δύο'}),cancel(){}});
 h.remountEffect();await h.run('listen');assert.match(h.values[1],/Σταθμός δύο/);assert.equal(h.values[0],false);
});
test('real background cancels in-flight work and discards late result',async()=>{
 let resolve,cancelled=0;
 const h=setup({check:()=>new Promise(r=>resolve=r),cancel(){cancelled++;}});
 const pending=h.run('check');h.event('background');resolve({installed:['el-GR'],downloadable:[],pending:[]});await pending;
 assert.equal(cancelled,1);assert.match(h.values[1],/BACKGROUND/);assert.equal(h.values[0],false);
});
test('unknown app state does not cancel, and duplicate presses do not start two probes',async()=>{
 let resolve,calls=0;
 const h=setup({check:()=>{calls++;return new Promise(r=>resolve=r);},cancel(){throw Error('unexpected cancel');}});
 const pending=h.run('check');h.event('unknown');await h.run('check');assert.equal(calls,1);
 resolve({installed:['el-GR'],downloadable:[],pending:[]});await pending;assert.match(h.values[1],/el-GR/);
});
test('native foreground check uses resumed lifecycle, not activity window focus stolen by Modal',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../native/android-voice/PestifyLocalRecognitionProbe.java'),'utf8');
 assert.doesNotMatch(source,/hasWindowFocus\(/);assert.match(source,/getLifecycleState\(\)!=LifecycleState.RESUMED/);
});
