import React, {useEffect,useRef,useState} from "react";
import {ActivityIndicator,Alert,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from "react-native";
import api from "../services/apiService";
import i18n from "../services/i18n";
import SdsDownloadButton from "./SdsDownloadButton";

export default function ReportDownloadsMenu({visit,canDownloadCertificate,style}) {
  const anchor=useRef(null),generation=useRef(0),lock=useRef(false);
  const [open,setOpen]=useState(false),[position,setPosition]=useState({x:12,y:100});
  const [maps,setMaps]=useState([]),[loading,setLoading]=useState(false),[failed,setFailed]=useState(false),[busy,setBusy]=useState(false);
  const {width,height}=useWindowDimensions();
  useEffect(()=>()=>{generation.current++;},[]);
  const id=visit.visitId || visit.logId || visit.id || visit.visit_id;
  const type=String(visit.serviceType || visit.service_type || visit.serviceCategory || visit.service_category || visit.workType || "").toLowerCase().trim();
  const certification=["certificate","certification","st"].includes(type);
  const greek=String(i18n.getLocale()).startsWith("el") || String(i18n.getLocale()).startsWith("gr");
  const text=greek ? {downloads:"Λήψεις",report:"Αναφορά (PDF)",certificate:"Πιστοποιητικό (PDF)",floorplan:"Κάτοψη πελάτη",folder:"Λήψη Φακέλου (ZIP)",close:"Κλείσιμο",unavailable:"Οι κατόψεις δεν είναι διαθέσιμες.",year:"Πιστοποιητικό και φάκελος διατίθενται μόνο για το τρέχον έτος.",error:"Η λήψη δεν ολοκληρώθηκε. Για τον πλήρη φάκελο χρειάζονται διαθέσιμα όλα τα έγγραφα και η κάτοψη."} : {downloads:"Downloads",report:"Report (PDF)",certificate:"Certificate (PDF)",floorplan:"Customer floorplan",folder:"Download folder (ZIP)",close:"Close",unavailable:"Floorplans are unavailable.",year:"Certificate and folder are available for the current year only.",error:"Download failed. A complete folder requires all documents and the customer floorplan."};
  function close(){generation.current++;setOpen(false);}
  async function show(event) {
    event?.stopPropagation?.();
    const current=++generation.current;
    anchor.current?.measureInWindow((x,y,w,h)=>setPosition({x,y:y+h}));
    setOpen(true);setMaps([]);setFailed(false);setLoading(false);
    if (!certification || !canDownloadCertificate) return;
    setLoading(true);
    try {const result=await api.getCertificationDownloads(id);if(current!==generation.current)return;if(!result?.success)throw Error();setMaps(result.maps || []);}
    catch {if(current===generation.current)setFailed(true);}
    finally {if(current===generation.current)setLoading(false);}
  }
  async function run(action) {
    if(lock.current)return;lock.current=true;setBusy(true);
    try {const result=await action();if(!result?.success)throw Error();close();}
    catch {Platform.OS === "web" ? window.alert(text.error) : Alert.alert(text.downloads,text.error);}
    finally {lock.current=false;setBusy(false);}
  }
  function option(label,action,disabled=false) {return <Pressable key={label} accessibilityRole="button" accessibilityState={{disabled:busy || disabled}} disabled={busy || disabled} style={[s.option,(busy || disabled)&&s.disabled]} onPress={()=>run(action)}><Text style={s.label}>{label}</Text></Pressable>;}
  const menuWidth=Math.min(320,width-24),menuHeight=Math.min(440,height-48);
  return <>
    <Pressable ref={anchor} style={[s.trigger,style]} accessibilityRole="button" accessibilityLabel={text.downloads} accessibilityState={{expanded:open}} onPress={show}><Text style={s.triggerText}>{text.downloads} ▾</Text></Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={s.backdrop} onPress={close} accessibilityLabel={text.close}/>
      <View accessibilityViewIsModal style={[s.menu,{width:menuWidth,maxHeight:menuHeight,left:Math.max(12,Math.min(position.x,width-menuWidth-12)),top:Math.max(24,Math.min(position.y,height-menuHeight-24))}]}>
        <ScrollView>
          {option(text.report,()=>api.downloadVisitReport(id,i18n.getLocale()))}
          <SdsDownloadButton reportId={id} style={s.sds}/>
          {certification && <>
            {option(text.certificate,()=>api.downloadVisitCertificate(id),!canDownloadCertificate)}
            {!canDownloadCertificate && <Text style={s.notice}>{text.year}</Text>}
            {loading && <ActivityIndicator style={s.notice}/>}
            {canDownloadCertificate && !loading && (failed || !maps.length) && <Text style={s.notice}>{text.unavailable}</Text>}
            {maps.map((map,index)=>option(`${text.floorplan} ${index+1}${map.name ? ` — ${map.name}` : ""}`,()=>api.downloadVisitFloorplan(id,map)))}
            {option(text.folder,()=>api.downloadCertificationFolder(id,i18n.getLocale()),!canDownloadCertificate || loading || failed || !maps.length)}
          </>}
          {busy && <ActivityIndicator style={s.notice}/>}
          <Pressable style={s.option} onPress={close} accessibilityRole="button"><Text>{text.close}</Text></Pressable>
        </ScrollView>
      </View>
    </Modal>
  </>;
}
const s=StyleSheet.create({trigger:{backgroundColor:"#176f64",padding:12,borderRadius:8,justifyContent:"center",minHeight:44},triggerText:{color:"white",fontWeight:"600"},backdrop:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(0,0,0,0.2)"},menu:{position:"absolute",backgroundColor:"white",borderRadius:10,elevation:8,shadowColor:"#000",shadowOpacity:0.2,shadowRadius:8},option:{padding:15,minHeight:48,borderBottomWidth:1,borderColor:"#eee"},label:{color:"#174c46",fontSize:14},notice:{padding:14,color:"#666"},disabled:{opacity:0.45},sds:{margin:0,borderRadius:0,minHeight:48}});
