const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseStationFields,stationDraft}=require('../src/voice/parseStationFields');
const {resolveStation,validateCandidate}=require('../src/voice/stationVoiceSession');
const c={active:true,appointmentId:'job',customerId:'customer',technicianId:'tech',map:{mapId:'a'},stations:[{id:2,type:'BS'}]};
for(const [text,condition,access,terminal] of [
 ['Σταθμός 2, κατάσταση λείπει','Missing','Yes',true],
 ['Σταθμός δύο, κατάσταση κατεστραμμένος','Damaged','Yes',true],
 ['Σταθμός 2. Κατάσταση: κατεστραμμένο.','Damaged','Yes',true],
 ['Σταθμός 2 πρόσβαση όχι',null,'No',true],
 ['Σταθμός 2 κατάσταση λειτουργικό κατανάλωση 25','Functional','Yes',false],
 ['Σταθμός 2 πρόσβαση ναι κατανάλωση είκοσι πέντε','Functional','Yes',false],
 ['Σταθμός 2 κατανάλωση 25','Functional','Yes',false],
 ['Σταθμός 2','Functional','Yes',false],
 ['Σταθμός 2 κατάσταση λείπει πρόσβαση όχι',null,'No',true],
]) test(text,()=>{const r=parseStationFields(text);assert.equal(r.ok,true);assert.equal(r.condition,condition);assert.equal(r.access,access);assert.equal(r.terminal,terminal);});
for(const text of ['Σταθμός 2 κατάσταση δεν λείπει','Σταθμός 2 πρόσβαση όχι ναι','Σταθμός 2 κατάσταση λείπει ή λειτουργικό','Σταθμός 2 κατάσταση λείπει κατάσταση λειτουργικό','Σταθμός 2 κατανάλωση 25 μιλάω σε κάποιον','Σταθμός 2 πρόσβαση ίσως','Σταθμός 2 κατανάλωση -25','Σταθμός 2 κατανάλωση 25.5','Σταθμός 2 κατανάλωση 25 κατανάλωση 50']) test(`rejects ambiguity: ${text}`,()=>assert.equal(parseStationFields(text).ok,false));
test('session bait and dose plus explicit normal defaults fill each new voice form',()=>{
 const target=resolveStation(c,'Σταθμός 2 κατανάλωση 25');
 assert.deepEqual(stationDraft(target,{baitType:'PRORAT 50 PASTA',dosageG:20}),{stationId:2,stationType:'BS',access:'Yes',condition:'Functional',consumption:'25%',baitType:'PRORAT 50 PASTA',dosage_g:20});
 assert.equal(stationDraft(target,{baitType:'Other',dosageG:40}).dosage_g,40);
});
for(const text of ['Σταθμός 2 κατάσταση λείπει','Σταθμός 2 κατάσταση κατεστραμμένο','Σταθμός 2 πρόσβαση όχι','Σταθμός 2 κατανάλωση 25 πρόσβαση όχι']) test(`terminal check clears all bait data: ${text}`,()=>{
 const target=resolveStation(c,text);
 const data={...stationDraft(target,{baitType:'PRORAT',dosageG:20}),mapId:'a'};
 for(const field of ['consumption','baitType','dosage_g']) assert.equal(data[field],null);
 const value={...target,data,expiresAt:2000};
 assert.equal(validateCandidate(c,value,1000).ok,true);
 assert.equal(validateCandidate({...c,map:{mapId:'b'}},value,1000).ok,false);
 assert.equal(validateCandidate(c,value,2000).ok,false);
 assert.equal(validateCandidate(c,{...value,data:{...data,baitType:'stale bait'}},1000).ok,false);
});
test('normal station-only command leaves consumption blank, not zero',()=>{
 const target=resolveStation(c,'Σταθμός 2');const data={...stationDraft(target,{baitType:'PRORAT',dosageG:20}),mapId:'a'};
 assert.equal(data.consumption,null);
 assert.equal(validateCandidate(c,{...target,data,expiresAt:2000},1000).ok,false);
});
