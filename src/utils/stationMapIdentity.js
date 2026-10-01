// A station number is unique only within its floor plan and device type.
export const mapIdOf = s => String(s?.map_id ?? s?.mapId ?? s?.data?.map_id ?? "");
export const stationNumberOf = s => String(Number(s?.station_number ?? s?.stationNumber ?? s?.stationId ?? s?.station_id ?? s?.id));
export const stationTypeOf = s => String(s?.station_type ?? s?.stationType ?? s?.type ?? "BS").toUpperCase();
export function stationOnMap(station, map, maps = []) {
  const id = mapIdOf(station);
  if (id) return id === mapIdOf(map);
  // Legacy records can prefill only a single, unambiguous matching plan.
  const matching = maps.filter(m => (m.stations || []).some(s =>
    stationNumberOf(s) === stationNumberOf(station) && stationTypeOf(s) === stationTypeOf(station)));
  return matching.length === 1 && mapIdOf(matching[0]) === mapIdOf(map);
}
export function groupStationsByMap(stations = [], unknownName = "Χωρίς προσδιορισμένη κάτοψη") {
  const groups = new Map();
  for (const station of stations) {
    const id = mapIdOf(station);
    if (!groups.has(id)) groups.set(id, {id, name: id ? (station.map_name || station.mapName || id) : unknownName, stations: []});
    groups.get(id).stations.push(station);
  }
  return [...groups.values()];
}
export function nextStationNumber(stations, type, minimum = 1) {
  return Math.max(minimum, 1, ...stations.filter(s => stationTypeOf(s) === type).map(s => {
    const n = Number(stationNumberOf(s));
    return Number.isSafeInteger(n) && n > 0 ? n + 1 : 1;
  }));
}
