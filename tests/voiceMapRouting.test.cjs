const {test}=require('node:test');const assert=require('node:assert/strict');
const {resolveVoiceRoute,validateVoiceCandidate,candidateContext}=require('../src/voice/voiceMapRouting');
const {contextKey}=require('../src/voice/stationVoiceSession');
const {stationDraft}=require('../src/voice/parseStationFields');
const {createFieldVoiceSession}=require('../src/voice/fieldVoiceSession');
const a={mapId:'a',name:'Ισόγειο',stations:[{id:1,type:'BS'},{id:100,type:'BS'}]};
const b={mapId:'b',name:'Υπόγειο',stations:[{id:1,type:'BS'},{id:101,type:'BS'}]};
const c={mapId:'c',name:'Αποθήκη',stations:[{id:102,type:'BS'}]};
function context(maps=[a,b,c]) {return {active:true,appointmentId:'work',customerId:'customer',technicianId:'tech',visitId:'visit',maps,map:a,stations:a.stations};}
function prepare(ctx,text){
 const route=resolveVoiceRoute(ctx,text);if(!route.ok)return route;
 const {targetContext,...fields}=route;
 const value={...fields,sourceKey:contextKey(ctx),targetKey:contextKey(targetContext),targetMapId:targetContext.map.mapId,expiresAt:Date.now()+60000};
 if(route.kind==='map')value.mapName=targetContext.map.name;
 else value.data={...stationDraft(route,{baitType:'Prorat',dosageG:20}),mapId:targetContext.map.mapId};
 return value;
}
test('explicit Greek map index uses displayed order and confirms administrator name',()=>{
 const ctx=context();const route=resolveVoiceRoute(ctx,'Κάτοψη δύο.');assert.equal(route.kind,'map');assert.equal(route.targetContext.map.name,'Υπόγειο');
 const value=prepare(ctx,'Κάτοψη 2');assert.equal(validateVoiceCandidate(ctx,value),true);
 const next=candidateContext(ctx,value);assert.equal(resolveVoiceRoute(next,'Σταθμός 1 κατανάλωση 25').targetContext.map.mapId,'b');
});
test('unique station in another map routes there with its real map identity',()=>{
 const ctx=context();const value=prepare(ctx,'Σταθμός εκατόν ένα κατανάλωση 25');
 assert.equal(value.targetMapId,'b');assert.equal(value.data.mapId,'b');assert.equal(value.data.baitType,'Prorat');assert.equal(value.data.dosage_g,20);assert.equal(validateVoiceCandidate(ctx,value),true);
});
test('shared station number prefers currently selected map',()=>{
 assert.equal(prepare(context(),'Σταθμός 1 κατανάλωση 25').targetMapId,'a');
});
test('ambiguous station outside active map asks for a map, never first-match wins',()=>{
 const ctx=context([a,b,{...c,stations:[{id:101,type:'BS'}]}]);
 assert.equal(resolveVoiceRoute(ctx,'Σταθμός 101 κατανάλωση 25').code,'CHOOSE_MAP');
});
test('missing station, wrong type and invalid map indexes cannot route',()=>{
 for(const text of ['Κάτοψη 0','Κάτοψη -1','Κάτοψη 2.5','Κάτοψη τέσσερα','Κάτοψη δύο και ένα'])assert.equal(resolveVoiceRoute(context(),text).ok,false,text);
 const ctx=context([a,{...b,stations:[{id:101,type:'LT'}]}]);assert.equal(resolveVoiceRoute(ctx,'Σταθμός 101 κατανάλωση 25').code,'STATION_NOT_FOUND');
});
test('missing/damaged/no-access retain null fields after cross-map routing',()=>{
 for(const text of ['Σταθμός 101 κατάσταση λείπει','Σταθμός 101 κατάσταση κατεστραμμένο','Σταθμός 101 πρόσβαση όχι']){
  const ctx=context();const value=prepare(ctx,text);assert.equal(validateVoiceCandidate(ctx,value),true,text);
  for(const key of ['consumption','baitType','dosage_g'])assert.equal(value.data[key],null);
 }
});
test('work changes, map reordering/removal and expiry invalidate pending map switch',()=>{
 const ctx=context();const value=prepare(ctx,'Κάτοψη 2');
 for(const patch of [{active:false},{appointmentId:'other'},{customerId:'other'},{technicianId:'other'},{visitId:'other'},{maps:[a,c,b]},{maps:[a,c]}])assert.equal(validateVoiceCandidate({...ctx,...patch},value),false);
 assert.equal(validateVoiceCandidate(ctx,value,value.expiresAt),false);
 assert.equal(validateVoiceCandidate({...ctx,maps:[a,{...b,name:'Changed'},c]},value),false);
});
test('station removed or made ambiguous during readback cannot commit',()=>{
 const ctx=context();const value=prepare(ctx,'Σταθμός 101 κατανάλωση 25');
 assert.equal(validateVoiceCandidate({...ctx,maps:[a,{...b,stations:[]},c]},value),false);
 assert.equal(validateVoiceCandidate({...ctx,maps:[a,b,{...c,stations:[{id:101,type:'BS'}]}]},value),false);
 assert.equal(validateVoiceCandidate(ctx,{...value,data:{...value.data,mapId:'a'}}),false);
});
test('duplicate map identity or duplicate station within map fails closed',()=>{
 assert.equal(resolveVoiceRoute(context([a,b,b]),'Κάτοψη 2').ok,false);
 assert.equal(resolveVoiceRoute(context([a,{...b,stations:[{id:101},{id:101}]}]),'Σταθμός 101 κατανάλωση 25').ok,false);
});
test('field session switches map after readback then stores next station on that map, with no restart',async()=>{
 let ctx=context(),reply,id;const rows=[],spoken=[];let resumed=0;
 const native={stopField(){},async startField(key){id=key;return true;},reply(key,text){spoken.push(text);return new Promise(resolve=>{reply=resolve;});},continueAfterCommit(){resumed++;}};
 const flow=createFieldVoiceSession({native,onActive(){},onState(){},prepare(text){const value=prepare(ctx,text);return {ok:true,candidate:value,readback:value.kind==='map'?value.mapName:'Σταθμός 1, κατανάλωση 25'};},validate:v=>validateVoiceCandidate(ctx,v),commit(v){if(v.kind==='station')rows.push(v.data);ctx=candidateContext(ctx,v);}});
 await flow.start();let pending=flow.handleEvent({code:'COMMAND',sessionId:id,commandId:'map',text:'Κάτοψη δύο'});
 assert.equal(ctx.map.mapId,'a');assert.equal(rows.length,0);assert.equal(spoken[0],'Υπόγειο');reply(true);await pending;assert.equal(ctx.map.mapId,'b');
 pending=flow.handleEvent({code:'COMMAND',sessionId:id,commandId:'station',text:'Σταθμός 1 κατανάλωση 25'});reply(true);await pending;
 assert.equal(rows.length,1);assert.equal(rows[0].mapId,'b');assert.equal(resumed,2);
});
test('stop during map readback prevents switching',async()=>{
 let ctx=context(),reply,id;
 const flow=createFieldVoiceSession({native:{stopField(){},async startField(key){id=key;return true;},reply(){return new Promise(resolve=>{reply=resolve;});},continueAfterCommit(){throw Error('must not rearm');}},onActive(){},onState(){},prepare:text=>({ok:true,candidate:prepare(ctx,text),readback:'Υπόγειο'}),validate:v=>validateVoiceCandidate(ctx,v),commit:v=>{ctx=candidateContext(ctx,v);}});
 await flow.start();const pending=flow.handleEvent({code:'COMMAND',sessionId:id,commandId:'map',text:'Κάτοψη δύο'});flow.stop();reply(true);await pending;assert.equal(ctx.map.mapId,'a');
});
test('observed katopsi vio maps only a complete map command to index two',()=>{
 const route=resolveVoiceRoute(context(),'κατωψη βιω');assert.equal(route.ok,true);assert.equal(route.mapNumber,2);assert.equal(route.targetContext.map.mapId,'b');
 assert.equal(validateVoiceCandidate(context(),prepare(context(),'κατωψη βιω')),true);
 for(const phrase of ['σταθμός βιω κατανάλωση 25','κατωψη βιω τρία','σταθμός 1 κατανάλωση βιω'])assert.equal(resolveVoiceRoute(context(),phrase).ok,false,phrase);
 assert.equal(resolveVoiceRoute(context([a]),'κατωψη βιω').code,'MAP_NOT_FOUND');
});
