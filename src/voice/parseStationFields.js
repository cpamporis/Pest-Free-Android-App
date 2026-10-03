"use strict";
const { parseGreekStationCommand } = require('./parseGreekStationCommand');
const clean = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ς/g,'σ').trim();
const edge = value => value.trim().replace(/[,;:.!··—–]+$/u,'').trim();
function parseStationFields(text) {
  const s = require('./normalizeVoiceWords').normalizeVoiceWords(text);
  if (!s || s.length > 240) return {ok:false,code:'INVALID_COMMAND'};
  const fields = [...s.matchAll(/καταναλωση|κατασταση|προσβαση/gu)];
  const stationText = edge(s.slice(0,fields[0]?.index ?? s.length));
  const station = parseGreekStationCommand(`${stationText} κατανάλωση 0`);
  if (!station.ok) return {ok:false,code:'INVALID_COMMAND'};
  const result = {ok:true,stationNumber:station.stationNumber,consumption:null,condition:'Functional',access:'Yes'};
  const seen = new Set();
  for (let i=0;i<fields.length;i++) {
    const field = fields[i][0];
    if (seen.has(field)) return {ok:false,code:'INVALID_COMMAND'};
    seen.add(field);
    const value = edge(s.slice(fields[i].index+field.length,fields[i+1]?.index ?? s.length).replace(/^[\s,;:··]+/u,''));
    if (field === 'καταναλωση') {
      const parsed = parseGreekStationCommand(`Σταθμός 1 κατανάλωση ${value}`);
      if (!parsed.ok) return {ok:false,code:'INVALID_CONSUMPTION'};
      result.consumption = `${parsed.consumption}%`;
    } else if (field === 'κατασταση') {
      const conditions = {λειτουργικο:'Functional',λειτουργικοσ:'Functional',λειτουργικη:'Functional',λειπει:'Missing',λιπι:'Missing',κατεστραμμενο:'Damaged',κατεστραμενο:'Damaged',κατεστραμενοσ:'Damaged',κατεστραμενη:'Damaged',κατεστραμμενοσ:'Damaged',κατεστραμμενη:'Damaged'};
      if(/(^|\s)(?:δεν|οχι|μη|μην)(?=\s|$)/u.test(value))return {ok:false,code:'INVALID_CONDITION'};
      const conditionWord=value.replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/^[\s«»"“”]+|[\s«»"“”!.,;··]+$/gu,'').replace(/\s+/g,'');
      const matched=Object.hasOwn(conditions,conditionWord)?conditions[conditionWord]:require('./phoneticVoiceWords').matchVoiceWord(conditionWord,Object.entries(conditions).map(([word,value])=>({word,value})));
      if (!matched) return {ok:false,code:'INVALID_CONDITION'};
      result.condition = matched;
    } else {
      const access=require('./phoneticVoiceWords').matchVoiceWord(value,[{word:'ναι',value:'Yes'},{word:'προσβασιμο',value:'Yes'},{word:'οχι',value:'No'}]);
      if (!access) return {ok:false,code:'INVALID_ACCESS'};
      result.access = access;
    }
  }
  // Same priority as the existing form: no access means no condition observation.
  if (result.access === 'No') result.condition = null;
  result.terminal = result.access === 'No' || ['Missing','Damaged'].includes(result.condition);
  if (result.terminal) result.consumption = null;
  return result;
}
function stationDraft(target, defaults) {
  return {stationId:target.stationId,stationType:'BS',access:target.access,condition:target.condition,
    consumption:target.terminal ? null : target.consumption,
    baitType:target.terminal ? null : defaults?.baitType || '',
    dosage_g:target.terminal ? null : defaults?.dosageG ?? null};
}
module.exports = {parseStationFields,stationDraft};
