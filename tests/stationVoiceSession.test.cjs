const {test} = require('node:test');
const assert = require('node:assert/strict');
const {contextKey,resolveStation,confirmation,validateCandidate} = require('../src/voice/stationVoiceSession');
const context = {active:true,appointmentId:'job1',customerId:'customer1',technicianId:'tech1',visitId:'visit1',map:{mapId:'a',name:'Όροφος'},stations:[{id:1,type:'BS'},{id:1,type:'LT'},{id:101,type:'BS'}]};
const candidate = () => ({key:contextKey(context),stationId:1,expiresAt:2000,data:{mapId:'a',stationId:1,stationType:'BS',consumption:'25%',baitType:'Test bait',dosage_g:20,access:'Yes',condition:'Functional'}});
test('resolves BS within the current plan even if another type has the same number',()=>{
 const value = resolveStation(context,'Σταθμός ένα, κατανάλωση 25');
 assert.equal(value.ok,true); assert.equal(value.stationId,1); assert.equal(value.consumption,'25%');
});
test('identical number on another plan produces a distinct context',()=>{
 const other = {...context,map:{mapId:'b',name:'Όροφος'}};
 assert.notEqual(resolveStation(context,'Σταθμός 1 κατανάλωση 25').key,resolveStation(other,'Σταθμός 1 κατανάλωση 25').key);
 assert.equal(validateCandidate(other,candidate(),1000).ok,false);
});
test('station 101 is not station 1',()=>assert.equal(resolveStation(context,'Σταθμός 101 κατανάλωση 25').stationId,101));
test('never falls back to another map or device type',()=>{
 assert.equal(resolveStation({...context,stations:[{id:1,type:'LT'}]},'Σταθμός 1 κατανάλωση 25').code,'STATION_NOT_FOUND');
 assert.equal(resolveStation({...context,stations:[{id:1,type:'BS',mapId:'b'}]},'Σταθμός 1 κατανάλωση 25').code,'AMBIGUOUS_STATION');
});
test('duplicate bait stations on one plan fail closed',()=>assert.equal(resolveStation({...context,stations:[{id:1,type:'BS'},{id:1,type:'BS'}]},'Σταθμός 1 κατανάλωση 25').code,'AMBIGUOUS_STATION'));
for(const field of ['appointmentId','customerId','technicianId','visitId']) test(`changing ${field} invalidates the pending confirmation`,()=>assert.equal(validateCandidate({...context,[field]:'changed'},candidate(),1000).ok,false));
test('requires active identified appointment',()=>{
 assert.equal(resolveStation({...context,active:false},'Σταθμός 1 κατανάλωση 25').ok,false);
 assert.equal(resolveStation({...context,appointmentId:null},'Σταθμός 1 κατανάλωση 25').ok,false);
});
test('revalidates station existence before applying',()=>assert.equal(validateCandidate({...context,stations:[]},candidate(),1000).ok,false));
test('expires and requires complete fields',()=>{
 assert.equal(validateCandidate(context,candidate(),1999).ok,true);
 assert.equal(validateCandidate(context,candidate(),2000).code,'EXPIRED');
 for(const patch of [{access:'No'},{condition:'Damaged'},{condition:'Missing'},{baitType:''},{dosage_g:null},{consumption:'33%'},{stationType:'LT'},{mapId:'b'}]) {
  const c=candidate();Object.assign(c.data,patch);assert.equal(validateCandidate(context,c,1000).ok,false,JSON.stringify(patch));
 }
});
for(const text of ['Αποθήκευση','αποθήκευση.',' ΑΠΟΘΗΚΕΥΣΗ! ']) test(`explicit save: ${text}`,()=>assert.equal(confirmation(text),'save'));
for(const text of ['ναι','μην κάνεις αποθήκευση','αποθήκευση ακύρωση','να κάνουμε αποθήκευση','σταθμός 1 κατανάλωση 25','']) test(`does not treat conversation as confirmation: ${text}`,()=>assert.equal(confirmation(text),'invalid'));
test('explicit cancel',()=>assert.equal(confirmation('Ακύρωση.'),'cancel'));
