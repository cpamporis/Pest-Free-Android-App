'use strict';
const { contextKey, resolveStation, validateCandidate } = require('./stationVoiceSession');
const { parseNumber } = require('./parseGreekStationCommand');
const id = m => String(m?.mapId ?? m?.map_id ?? '');
function mapContext(c, map) {
  return {...c,map,stations:id(map)===id(c.map)?c.stations:(map.stations||[])};
}
function resolveVoiceRoute(c,text) {
  if(!c.active || !contextKey(c))return {ok:false,code:'INACTIVE_CONTEXT'};
  const maps=c.maps || [c.map];
  if(!maps.some(m=>id(m)===id(c.map)))return {ok:false,code:'CONTEXT_CHANGED'};
  if(maps.some(m=>!id(m)) || new Set(maps.map(id)).size!==maps.length)return {ok:false,code:'AMBIGUOUS_MAP'};
  const normalized=String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ς/g,'σ').trim();
  const command=/^κατοψη\s+(.+?)\s*[.!;]?$/u.exec(normalized);
  if(command){
    const mapNumber=parseNumber(command[1].trim());
    const map=Number.isInteger(mapNumber)&&mapNumber>0?maps[mapNumber-1]:null;
    if(!map)return {ok:false,code:'MAP_NOT_FOUND'};
    return {ok:true,kind:'map',mapNumber,targetContext:mapContext(c,map)};
  }
  const local=resolveStation(c,text);
  if(local.ok)return {...local,kind:'station',targetContext:c};
  if(local.code!=='STATION_NOT_FOUND')return local;
  const matches=maps.filter(m=>id(m)!==id(c.map)).map(m=>{
    const targetContext=mapContext(c,m);return {...resolveStation(targetContext,text),targetContext};
  });
  const valid=matches.filter(m=>m.ok);
  if(matches.some(m=>m.code==='AMBIGUOUS_STATION') || valid.length>1)return {ok:false,code:'CHOOSE_MAP'};
  if(!valid.length)return {ok:false,code:'STATION_NOT_FOUND'};
  return {...valid[0],kind:'station'};
}
function validateVoiceCandidate(c,value,now=Date.now()) {
  if(!value || !c.active || value.sourceKey!==contextKey(c) || now>=value.expiresAt || !Number.isFinite(value.expiresAt))return false;
  const route=resolveVoiceRoute(c,value.kind==='map'?`Κάτοψη ${value.mapNumber}`:`Σταθμός ${value.stationNumber}`);
  if(!['map','station'].includes(value.kind) || !route.ok || id(route.targetContext.map)!==value.targetMapId || contextKey(route.targetContext)!==value.targetKey)return false;
  if(value.kind==='map')return route.kind==='map' && (route.targetContext.map.name||'')===value.mapName;
  return validateCandidate(route.targetContext,value,now).ok;
}
function candidateContext(c,value) {
  const map=(c.maps || [c.map]).find(m=>id(m)===value.targetMapId);
  return map?mapContext(c,map):null;
}
module.exports={resolveVoiceRoute,validateVoiceCandidate,candidateContext};
