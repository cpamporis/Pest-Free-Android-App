import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export function createReportDownloadsClient({request,ready,token,baseUrl}) {
  const ref = value => encodeURIComponent(String(value));
  async function download(endpoint,name,mime) {
    await ready();
    const credential=token();
    if (!credential) return {success:false,error:"SESSION_EXPIRED"};
    const headers={Authorization:`Bearer ${credential}`};
    const url=`${baseUrl}${endpoint}`;
    if (Platform.OS === "web") {
      const response=await fetch(url,{headers,cache:"no-store",redirect:"error"});
      if (!response.ok || !response.headers.get("content-type")?.startsWith(mime)) return {success:false};
      const objectUrl=URL.createObjectURL(await response.blob());
      try { const link=document.createElement("a");link.href=objectUrl;link.download=name;document.body.appendChild(link);link.click();link.remove(); }
      finally {setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);}
      return {success:true};
    }
    if (!FileSystem.cacheDirectory) return {success:false};
    const directory=`${FileSystem.cacheDirectory}report-export-${Date.now()}-${Math.random().toString(36).slice(2)}/`;
    try {
      await FileSystem.makeDirectoryAsync(directory,{intermediates:true});
      const result=await FileSystem.downloadAsync(url,`${directory}${name}`,{headers});
      const type=result.headers?.["content-type"] || result.headers?.["Content-Type"];
      if (result.status !== 200 || !type?.startsWith(mime) || !await Sharing.isAvailableAsync()) return {success:false};
      await Sharing.shareAsync(result.uri,{mimeType:type,dialogTitle:name});
      return {success:true};
    } finally {await FileSystem.deleteAsync(directory,{idempotent:true}).catch(()=>{});}
  }
  return {
    getCertificationDownloads: id=>request("GET",`/certificates/downloads/${ref(id)}`),
    downloadVisitReport:(id,lang)=>download(`/reports/pdf/${ref(id)}?lang=${ref(lang || "en")}`,"Report.pdf","application/pdf"),
    downloadVisitCertificate:id=>download(`/certificates/pdf/${ref(id)}`,"Certificate.pdf","application/pdf"),
    downloadCertificationFolder:(id,lang)=>download(`/certificates/folder/${ref(id)}?lang=${ref(lang || "en")}`,"Certification-folder.zip","application/zip"),
    downloadVisitFloorplan:(id,map)=> {
      const extension=String(map.extension).toLowerCase();
      if (!/^(png|jpe?g|webp|gif|heic|heif)$/.test(extension)) return Promise.resolve({success:false});
      return download(`/certificates/floorplan/${ref(id)}/${ref(map.id)}`,`Floorplan.${extension}`,"image/");
    }
  };
}
