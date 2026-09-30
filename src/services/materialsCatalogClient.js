import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { File as ExpoFile } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { fetch as expoFetch } from "expo/fetch";

export function createMaterialsCatalogClient({ request, ready, token, baseUrl }) {
  const root = "/materials-catalog";
  const ref = value => encodeURIComponent(String(value));
  let capabilityCache = null;
  async function download(endpoint, name, mime) {
    await ready();
    if (!token()) return { success:false,error:"SESSION_EXPIRED" };
    const url = `${baseUrl}${root}${endpoint}`;
    const headers = { Authorization:`Bearer ${token()}` };
    if (Platform.OS === "web") {
      const response = await fetch(url,{headers,cache:"no-store",redirect:"error"});
      if (!response.ok || !response.headers.get("content-type")?.includes(mime)) return {success:false,error:"SDS_DOWNLOAD_FAILED"};
      const objectUrl = URL.createObjectURL(await response.blob());
      try {
        const link = document.createElement("a");link.href=objectUrl;link.download=name;
        document.body.appendChild(link);link.click();link.remove();
      } finally { setTimeout(() => URL.revokeObjectURL(objectUrl),1000); }
      return {success:true};
    }
    if (!FileSystem.cacheDirectory) return {success:false,error:"SDS_DOWNLOAD_FAILED"};
    const directory = `${FileSystem.cacheDirectory}materials-${Date.now()}-${Math.random().toString(36).slice(2)}/`;
    const file = `${directory}${name}`;
    try {
      await FileSystem.makeDirectoryAsync(directory,{intermediates:true});
      const response = await FileSystem.downloadAsync(url,file,{headers});
      const type = response.headers?.["content-type"] || response.headers?.["Content-Type"];
      if (response.status !== 200 || !type?.includes(mime)) return {success:false,error:"SDS_DOWNLOAD_FAILED"};
      if (!await Sharing.isAvailableAsync()) return {success:false,error:"SHARING_UNAVAILABLE"};
      await Sharing.shareAsync(response.uri,{mimeType:mime,dialogTitle:name});
      return {success:true};
    } finally { await FileSystem.deleteAsync(directory,{idempotent:true}).catch(() => {}); }
  }
  async function upload(endpoint,selected,fields) {
    await ready();
    if (!token()) return {success:false,error:"SESSION_EXPIRED"};
    if (!selected || selected.size < 1 || selected.size > 8388608) return {success:false,error:"DOCUMENT_LIMIT_8_MB"};
    const form = new FormData();
    for (const [k,v] of Object.entries(fields)) form.append(k,String(v));
    let temporary;
    try {
      if (Platform.OS === "web") form.append("file",selected.file,selected.kind === "xls" ? "catalog.xls" : "sds.pdf");
      else {
        if (!FileSystem.cacheDirectory || typeof selected.base64 !== "string" || selected.base64.length > 11184816 || !/^[A-Za-z0-9+/]*={0,2}$/.test(selected.base64)) return {success:false,error:"INVALID_FILE"};
        temporary = `${FileSystem.cacheDirectory}catalog-${Date.now()}-${Math.random().toString(36).slice(2)}.${selected.kind === "xls" ? "xls" : "pdf"}`;
        await FileSystem.writeAsStringAsync(temporary,selected.base64,{encoding:FileSystem.EncodingType.Base64});
        form.append("file",new ExpoFile(temporary));
      }
      const transport = Platform.OS === "web" ? fetch : expoFetch;
      const response = await transport(`${baseUrl}${root}${endpoint}`,{method:"POST",headers:{Authorization:`Bearer ${token()}`},body:form});
      const data = await response.json();
      return response.ok ? data : {success:false,error:data?.error || "DOCUMENT_UPLOAD_FAILED",status:response.status};
    } catch { return {success:false,error:"DOCUMENT_UPLOAD_FAILED"}; }
    finally { if (temporary) await FileSystem.deleteAsync(temporary,{idempotent:true}).catch(() => {}); }
  }
  return {
    async getMaterialsCatalogCapabilities() {
      await ready();
      const now=Date.now();
      if (!capabilityCache || capabilityCache.token !== token() || now-capabilityCache.time > 10000) {
        capabilityCache={token:token(),time:now,promise:request("GET",`${root}/capabilities`)};
      }
      return capabilityCache.promise;
    },
    getLocalMaterials: kind => request("GET",kind === "bait" ? "/materials/bait-types" : "/materials/chemicals"),
    searchMaterialsCatalog: (q="",offset=0) => request("GET",`${root}/products?q=${ref(q)}&offset=${offset}`),
    getCatalogProduct: id => request("GET",`${root}/products/${ref(id)}`),
    saveCatalogProduct: (id,data) => request(id ? "PUT" : "POST",`${root}/products${id ? `/${ref(id)}` : ""}`,data),
    retireCatalogProduct: (id,data) => request("DELETE",`${root}/products/${ref(id)}`,data),
    previewCatalogSeed: () => request("POST",`${root}/imports/seed-preview`,{}),
    previewCatalogExcel: (file,sourceDate) => upload("/imports/preview",file,{sourceDate}),
    applyCatalogImport: id => request("POST",`${root}/imports/${ref(id)}/apply`,{confirm:true}),
    publishCatalogPilotThree: () => request("POST",`${root}/imports/pilot-three`,{confirm:true}),
    cancelCatalogImport: id => request("DELETE",`${root}/imports/${ref(id)}`),
    reprocessSavedSds: () => request("POST",`${root}/automation/reprocess-saved`,{}),
    getSdsAutomation: (offset=0) => request("GET",`${root}/automation?offset=${offset}`),
    startSdsAutomation: () => request("POST",`${root}/automation/start`,{}),
    pauseSdsAutomation: () => request("POST",`${root}/automation/pause`,{}),
    retrySdsTask: id => request("POST",`${root}/automation/tasks/${ref(id)}/retry`,{}),
    acceptSdsCandidate: id => request("POST",`${root}/automation/tasks/${ref(id)}/accept`,{confirmed:true}),
    rejectSdsTask: id => request("POST",`${root}/automation/tasks/${ref(id)}/reject`,{}),
    uploadSdsManual: (id,file,data) => upload(`/products/${ref(id)}/sds/manual`,file,data),
    approveSdsManual: (id,sdsId,data) => request("POST",`${root}/products/${ref(id)}/sds/${ref(sdsId)}/approve-manual`,data),
    getCatalogSdsResearch: id => request("GET",`${root}/products/${ref(id)}/research`),
    queueCatalogSdsResearch: (id,data) => request("POST",`${root}/products/${ref(id)}/research`,data),
    getCatalogSdsVersions: id => request("GET",`${root}/products/${ref(id)}/sds`),
    uploadCatalogSds: (id,file,data) => upload(`/products/${ref(id)}/sds`,file,data),
    verifyCatalogSds: (id,sdsId,data) => request("POST",`${root}/products/${ref(id)}/sds/${ref(sdsId)}/verify`,data),
    extractCatalogSdsText: (id,sdsId) => request("GET",`${root}/products/${ref(id)}/sds/${ref(sdsId)}/text`),
    downloadCatalogSds: (id,sdsId) => download(`/products/${ref(id)}/sds/${ref(sdsId)}/pdf`,"sds.pdf","application/pdf"),
    getReportSdsManifest: id => request("GET",`${root}/reports/${ref(id)}/sds`),
    downloadReportSds: id => download(`/reports/${ref(id)}/sds.zip`,"Δελτία Δεδομένων Ασφαλείας (MSDS).zip","application/zip")
  };
}

