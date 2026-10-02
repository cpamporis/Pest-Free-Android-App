"use strict";
const { parseStationFields } = require('./parseStationFields');
const mapId = x => String(x?.mapId ?? x?.map_id ?? '');
function contextKey(c) {
  if (![c?.appointmentId,c?.customerId,c?.technicianId,mapId(c?.map)].every(x => x !== undefined && x !== null && String(x) !== '')) return null;
  return JSON.stringify([String(c.appointmentId),String(c.customerId),String(c.technicianId),String(c.visitId ?? ''),mapId(c.map)]);
}
function resolveStation(c, text) {
  const key = contextKey(c);
  if (!key || !c.active) return {ok:false,code:'INACTIVE_CONTEXT'};
  const command = parseStationFields(text);
  if (!command.ok) return command;
  // Match only the current map's actual station list and BS type, never another plan.
  const matches = (c.stations || []).filter(s => String(s.type ?? s.stationType ?? 'BS').toUpperCase() === 'BS' && Number(s.id) === command.stationNumber);
  if (matches.length !== 1) return {ok:false,code:matches.length ? 'AMBIGUOUS_STATION' : 'STATION_NOT_FOUND'};
  const station = matches[0];
  if ((mapId(station) && mapId(station) !== mapId(c.map)) ||
      (station.station_number != null && Number(station.station_number) !== Number(station.id))) return {ok:false,code:'AMBIGUOUS_STATION'};
  return {...command,key,stationId:station.id};
}
function confirmation(text) {
  const value = String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[.!;]+$/,'').trim();
  if (value === 'αποθηκευση') return 'save';
  if (value === 'ακυρωση') return 'cancel';
  return 'invalid';
}
function validateCandidate(c, candidate, now=Date.now()) {
  if (!candidate || candidate.key !== contextKey(c) || !c.active) return {ok:false,code:'CONTEXT_CHANGED'};
  if (!Number.isFinite(candidate.expiresAt) || now >= candidate.expiresAt) return {ok:false,code:'EXPIRED'};
  const d = candidate.data;
  if (!d || d.stationType !== 'BS' || mapId(d) !== mapId(c.map)) return {ok:false,code:'INVALID_DATA'};
  const match = resolveStation(c, `Σταθμός ${d.stationId}`);
  if (!match.ok || match.stationId !== candidate.stationId) return {ok:false,code:'CONTEXT_CHANGED'};
  if (d.access === 'No' || ['Missing','Damaged'].includes(d.condition)) {
    const valid = (d.access === 'No' ? d.condition === null : d.access === 'Yes') &&
      d.consumption === null && d.baitType === null && d.dosage_g === null;
    return valid ? {ok:true} : {ok:false,code:'INCOMPLETE_DATA'};
  }
  if (d.access !== 'Yes' || d.condition !== 'Functional' || !String(d.baitType || '').trim() ||
      ![10,20,30,40,50,60,70,80,90,100].includes(Number(d.dosage_g)) ||
      !['0%','25%','50%','75%','100%'].includes(d.consumption)) return {ok:false,code:'INCOMPLETE_DATA'};
  return {ok:true};
}
module.exports = { contextKey, resolveStation, confirmation, validateCandidate };
