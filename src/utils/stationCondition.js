function unavailable(station) {
  return String(station?.access || "").toLowerCase() === "no" ||
    ["Damaged", "Missing"].includes(station?.condition);
}
function normalizeStation(station) {
  const result = { ...station };
  if (result.condition != null && !["Functional", "Damaged", "Missing"].includes(result.condition)) {
    const error = new Error("INVALID_STATION_CONDITION"); error.status = 400; throw error;
  }
  if (unavailable(result)) {
    for (const field of ["consumption", "baitType", "bait_type", "dosage_g", "capture", "rodentsCaptured", "rodents_captured", "triggered", "replacedSurface", "replaced_surface", "mosquitoes", "lepidoptera", "drosophila", "flies", "others", "replaceBulb", "replace_bulb", "pheromoneType", "pheromone_type", "replacedPheromone", "replaced_pheromone", "insectsCaptured", "insects_captured"]) result[field] = null;
  }
  return result;
}
export { unavailable, normalizeStation };
