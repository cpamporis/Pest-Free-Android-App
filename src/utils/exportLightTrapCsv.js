//exportLightTrapCsv.js
import * as FileSystem from 'expo-file-system/legacy';

export async function exportLightTrapCsv({
  headers,
  rows,
  customerName,
  visitId,
}) {
  console.log("🔍 exportLightTrapCsv called with:", {
    headers,
    rowCount: rows.length,
    customerName,
    visitId
  });
  
  if (rows.length === 0) {
    console.log("⚠️ No rows to export!");
    return null;
  }

  const csvContent = [
    headers.join(","),
    ...rows.map(row =>
      row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  console.log("📝 CSV Content (first 500 chars):", csvContent.substring(0, 500));

  const safeCustomer = customerName
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "");

  const date = new Date().toISOString().slice(0, 10);
  const fileName = `LT_${safeCustomer}_${date}_${visitId}.csv`;
  const fileUri = FileSystem.documentDirectory + fileName;

  console.log("💾 Saving to:", fileUri);
  console.log("📁 Document Directory:", FileSystem.documentDirectory);

  try {
    await FileSystem.writeAsStringAsync(fileUri, csvContent);
    console.log("✅ LT CSV saved successfully at:", fileUri);
    
    // Verify the file was created
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    console.log("📄 File info:", fileInfo);
    
    if (fileInfo.exists) {
      const fileSize = fileInfo.size;
      console.log("📏 File size:", fileSize, "bytes");
    }
    
    return fileUri;
  } catch (err) {
    console.error("❌ Failed to write LT CSV:", err);
    throw err;
  }
}