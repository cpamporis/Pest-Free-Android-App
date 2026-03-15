//exportLightTrapCsv.js
import * as FileSystem from 'expo-file-system/legacy';

export async function exportLightTrapCsv({
  headers,
  rows,
  customerName,
  visitId,
}) {
  
  if (rows.length === 0) {
    return null;
  }

  const csvContent = [
    headers.join(","),
    ...rows.map(row =>
      row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const safeCustomer = customerName
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "");

  const date = new Date().toISOString().slice(0, 10);
  const fileName = `LT_${safeCustomer}_${date}_${visitId}.csv`;
  const fileUri = FileSystem.documentDirectory + fileName;


  try {
    await FileSystem.writeAsStringAsync(fileUri, csvContent);
    
    // Verify the file was created
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    
    if (fileInfo.exists) {
      const fileSize = fileInfo.size;
    }
    
    return fileUri;
  } catch (err) {
    console.error("❌ Failed to write LT CSV:", err);
    throw err;
  }
}