import {groupStationsByMap, stationNumberOf, stationTypeOf, mapIdOf} from "./stationMapIdentity";
import {unavailable} from "./stationCondition";
export function measurement(s, type) {
  if (unavailable(s)) return null;
  const number = v => {
    if (v == null || v === "") return null;
    const n = Number(String(v).replace("%", "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  if (type === "BS") return number(s.consumption);
  if (type === "RM" || type === "ST") return number(s.rodents_captured ?? s.rodentsCaptured);
  if (type === "PT") return number(s.insects_captured ?? s.insectsCaptured);
  const counts = [s.mosquitoes, s.lepidoptera, s.drosophila, s.flies, ...(Array.isArray(s.others) ? s.others.map(o => o.count ?? o.number) : [])].map(number).filter(v => v !== null);
  return counts.length ? counts.reduce((a,b)=>a+b,0) : null;
}
export function average(rows, type) {
  const values = rows.map(s=>measurement(s,type)).filter(v=>v!==null);
  return values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
}
export function buildMapAnalysis({rows = [], maps = [], latest = [], type, year, months, now = new Date(), unknownName}) {
  const end = Number(year) === now.getFullYear() ? new Date(now) : new Date(Number(year)+1,0,1);
  const start = new Date(end); start.setMonth(start.getMonth()-months);
  const previousStart = new Date(start); previousStart.setMonth(previousStart.getMonth()-months);
  const groups = groupStationsByMap(rows, unknownName);
  for (const map of maps) {
    if (!groups.some(g=>g.id===mapIdOf(map))) groups.push({id:mapIdOf(map),name:map.name || mapIdOf(map),stations:[]});
  }
  for (const group of groupStationsByMap(latest, unknownName)) {
    if (!groups.some(g=>g.id===group.id)) groups.push({...group,stations:[]});
  }
  return groups.map(group => {
    const typed = group.stations.filter(s=>stationTypeOf(s)===type);
    const current = typed.filter(s=>new Date(s.date)>=start && new Date(s.date)<=end);
    const previous = typed.filter(s=>new Date(s.date)>=previousStart && new Date(s.date)<start);
    const latestRows = latest.filter(s=>mapIdOf(s)===group.id && stationTypeOf(s)===type);
    const layout = (maps.find(m=>mapIdOf(m)===group.id)?.stations || []).filter(s=>stationTypeOf(s)===type);
    const ids = [...new Set([...typed,...latestRows,...layout].map(stationNumberOf))].sort((a,b)=>Number(a)-Number(b));
    const devices = ids.map(id=>({id, latest: measurement(latestRows.find(s=>stationNumberOf(s)===id) || {}, type), average: average(current.filter(s=>stationNumberOf(s)===id),type)}));
    const monthly = Array.from({length:12},(_,month)=>({id:month+1,value:average(typed.filter(s=>{const d=new Date(s.date);return d.getFullYear()===Number(year)&&d.getMonth()===month;}),type)}));
    const top = devices.map(d=>({...d, count: current.filter(s=>stationNumberOf(s)===d.id && measurement(s,type)===100).length})).filter(d=>d.average!==null).sort((a,b)=>b.count-a.count || b.average-a.average).slice(0,10);
    return {...group, devices, monthly, top, current:average(current,type), previous:average(previous,type)};
  }).filter(g=>g.devices.length);
}
