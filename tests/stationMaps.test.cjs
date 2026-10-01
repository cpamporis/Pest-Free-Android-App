const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
// Use the pure ES-module sources without adding a transpiler dependency.
const base=path.resolve(__dirname,'../src/utils');
const identitySource=fs.readFileSync(path.join(base,'stationMapIdentity.js'),'utf8').replace(/export /g,'');
const conditionSource=fs.readFileSync(path.join(base,'stationCondition.js'),'utf8').replace(/export \{[^}]+\};?/g,'');
const analysisSource=fs.readFileSync(path.join(base,'stationMapAnalysis.js'),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
const utils=new Function(identitySource+'\n'+conditionSource+'\n'+analysisSource+'\nreturn {stationOnMap,groupStationsByMap,nextStationNumber,buildMapAnalysis};')();
const maps=[{mapId:'a',name:'Plan',stations:[{id:1,type:'BS'},{id:25,type:'BS'}]},{mapId:'b',name:'Plan',stations:[{id:1,type:'BS'},{id:101,type:'BS'}]}];
test('same number in another floor plan never prefills',()=>{
 assert.equal(utils.stationOnMap({mapId:'a',stationId:1,stationType:'BS'},maps[1],maps),false);
 assert.equal(utils.stationOnMap({stationId:1,stationType:'BS'},maps[0],maps),false);
 assert.equal(utils.stationOnMap({stationId:'25',stationType:'BS'},maps[0],maps),true);
});
test('numbering continues by device type and preserves current numbers',()=>{
 assert.equal(utils.nextStationNumber([{id:100,type:'BS'},{id:150,type:'LT'}],'BS'),101);
 assert.equal(utils.nextStationNumber([],'BS'),1);
 assert.equal(utils.nextStationNumber([{id:26,type:'BS'},{id:31,type:'BS'}],'BS'),32);
 assert.equal(utils.nextStationNumber([],'BS',101),101);
});
test('report groups identical labels by map id and keeps ambiguous history separate',()=>{
 assert.equal(utils.groupStationsByMap([{map_id:'a',map_name:'Plan'},{map_id:'b',map_name:'Plan'},{}]).length,3);
});
test('charts separate maps; unavailable readings stay null and do not dilute averages',()=>{
 const rows=[{map_id:'a',station_id:1,station_type:'BS',date:'2026-09-25',consumption:20},{map_id:'b',station_id:1,station_type:'BS',date:'2026-09-25',consumption:80},{map_id:'a',station_id:1,station_type:'BS',date:'2026-09-26',consumption:100,condition:'Missing'},{map_id:'a',station_id:25,station_type:'BS',date:'2026-09-26',consumption:null,access:'No'}];
 const groups=utils.buildMapAnalysis({rows,maps,latest:rows.slice(2),type:'BS',year:2026,months:3,now:new Date('2026-10-01')});
 assert.equal(groups[0].devices.find(d=>d.id==='1').average,20);
 assert.equal(groups[1].devices.find(d=>d.id==='1').average,80);
 assert.equal(groups[0].devices.find(d=>d.id==='1').latest,null);
 assert.equal(groups[0].devices.find(d=>d.id==='25').average,null);
 assert.equal(groups[0].monthly[8].value,20);
});
