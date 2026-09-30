import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text } from "react-native";
import api from "../services/apiService";
import i18n from "../services/i18n";
const t=key=>i18n.t(`materialsCatalog.${key}`);
const notify=message=>Platform.OS === "web" ? window.alert(message) : Alert.alert(t("sdsDownload"),message);
const confirm=message=>Platform.OS === "web" ? Promise.resolve(window.confirm(message)) : new Promise(resolve=>Alert.alert(t("sdsDownload"),message,[
  {text:t("cancel"),style:"cancel",onPress:()=>resolve(false)}, {text:t("downloadAvailable"),onPress:()=>resolve(true)}
],{cancelable:true,onDismiss:()=>resolve(false)}));
export default function SdsDownloadButton({reportId,style,onAvailabilityChange}) {
  const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false);
  useEffect(()=>{let live=true;api.getMaterialsCatalogCapabilities().then(r=>{if(live){const available=!!(r?.success && r.enabled);setEnabled(available);onAvailabilityChange?.(available);}});return()=>{live=false;};},[onAvailabilityChange]);
  async function download() {
    if(busy)return;setBusy(true);
    try {
      const data=await api.getReportSdsManifest(reportId);
      if(!data.success)throw Error();
      if(data.legacy){notify(t("legacySds"));return;}
      if(!data.files.length){notify(data.missing.length ? t("noVerifiedSds") : t("noMaterials"));return;}
      if(data.missing.length && !await confirm(`${t("partialSds")}\n${data.missing.map(v=>v.name).join("\n")}`))return;
      const result=await api.downloadReportSds(reportId);
      if(!result.success)throw Error();
    } catch {notify(t("downloadError"));} finally{setBusy(false);}
  }
  if(!enabled || !reportId)return null;
  return <Pressable style={[s.button,style,busy && {opacity:0.65}]} accessibilityRole="button" accessibilityLabel={t("sdsDownload")} onPress={event=>{event?.stopPropagation?.();download();}} disabled={busy}>
    {busy ? <ActivityIndicator size="small" color="#fff"/> : <Text style={s.text}>{t("sdsDownload")}</Text>}
  </Pressable>;
}
const s=StyleSheet.create({button:{paddingHorizontal:12,paddingVertical:12,margin:4,borderRadius:8,backgroundColor:"#285e79",alignItems:"center",justifyContent:"center",minHeight:42},text:{fontSize:12,fontWeight:"600",color:"#fff",textAlign:"center"}});
