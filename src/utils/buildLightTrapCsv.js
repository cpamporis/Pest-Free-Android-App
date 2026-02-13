//buildLightTrapCsv.js
export function buildLightTrapCsv({
  stations,
  customerName,
  technicianName,
  visitId,
}) {
  console.log("🔍 buildLightTrapCsv called with:", {
    stationCount: stations.length,
    customerName,
    technicianName,
    visitId
  });
  
  // Log each station's data
  stations.forEach((station, index) => {
    console.log(`📊 Station ${index + 1}:`, {
      stationId: station.stationId,
      stationType: station.stationType,
      mosquitoes: station.mosquitoes,
      lepidoptera: station.lepidoptera,
      drosophila: station.drosophila,
      flies: station.flies,
      others: station.others,
      replaceBulb: station.replaceBulb,
      condition: station.condition,
      access: station.access
    });
  });
  
  // 🔹 Find max number of "Others" entries across all LT stations
  const maxOthersCount = Math.max(
    0,
    ...stations.map(s => Array.isArray(s.others) ? s.others.length : 0)
  );

  // 🔹 Dynamic "Other X" headers
  const otherHeaders = Array.from(
    { length: maxOthersCount },
    (_, i) => `Other ${i + 1}`
  );

  const headers = [
    "Customer Name",
    "LT ID",
    "Mosquitoes",
    "Lepidoptera",
    "Drosophila",
    "Flies",
    ...otherHeaders,
    "Replace",
    "Condition",
    "Access",
    "Technician Name",
    "Duration",
    "Date",
    "Visit ID",
  ];

  const rows = stations.map(station => {
    const others = Array.isArray(station.others) ? station.others : [];

    const paddedOthers = Array.from(
      { length: maxOthersCount },
      (_, i) => others[i] ?? ""
    );

    return [
      customerName,
      `LT${station.stationId}`,
      station.mosquitoes ?? "",
      station.lepidoptera ?? "",
      station.drosophila ?? "",
      station.flies ?? "",
      ...paddedOthers,
      station.replaceBulb ?? "",
      station.condition ?? "",
      station.access ?? "",
      technicianName ?? "",
      station.duration ?? "",
      new Date().toLocaleDateString("en-GB"),
      visitId,
    ];
  });

  console.log("📋 CSV Headers:", headers);
  console.log("📊 Number of rows:", rows.length);
  
  return { headers, rows };
}