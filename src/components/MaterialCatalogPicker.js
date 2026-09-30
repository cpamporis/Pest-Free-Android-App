import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ProtectedAdminModal as Modal } from "./AdminSessionTimer";
import api from "../services/apiService";
import i18n from "../services/i18n";
const t = key => i18n.t(`materialsCatalog.${key}`);

export default function MaterialCatalogPicker({ onSelect, disabled=false }) {
  const [enabled,setEnabled]=useState(false),[q,setQ]=useState(""),[items,setItems]=useState([]);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[choice,setChoice]=useState(null),[more,setMore]=useState(false);
  useEffect(() => { let live=true;api.getMaterialsCatalogCapabilities().then(r => live && setEnabled(r?.success && r.enabled));return()=>{live=false;}; },[]);
  useEffect(() => {
    let live=true;
    setItems([]);setMore(false);setError("");
    if (!enabled || q.trim().length<2) {setBusy(false);return()=>{live=false;};}
    setBusy(true);
    const timer=setTimeout(async()=>{
      try { const r=await api.searchMaterialsCatalog(q.trim());if (!live)return;if (!r.success)throw Error();setItems(r.items);setMore(r.more); }
      catch {if(live)setError(t("loadError"));}finally{if(live)setBusy(false);}
    },300);
    return()=>{live=false;clearTimeout(timer);};
  },[q,enabled]);
  async function select(product,kind) {
    setChoice(null);setBusy(true);setError("");
    try {
      const r=await api.getCatalogProduct(product.id);
      if(!r.success || !r.product.selection_allowed) throw Error();
      onSelect(r.product,kind);setQ("");
    } catch {setError(t("loadError"));}finally{setBusy(false);}
  }
  function choose(product) {
    if (!product.selection_allowed || disabled || busy) return;
    if (Platform.OS === "web") setChoice(product);
    else Alert.alert(product.name,t("chooseKind"),[
      {text:t("bait"),onPress:()=>select(product,"bait")},
      {text:t("chemical"),onPress:()=>select(product,"chemicals")},
      {text:t("cancel"),style:"cancel"}
    ]);
  }
  if(!enabled)return null;
  return <View style={s.card}>
    <Text style={s.title}>{t("searchTitle")}</Text><Text style={s.help}>{t("copyHelp")}</Text>
    <TextInput style={s.input} value={q} onChangeText={setQ} maxLength={100} placeholder={t("searchHint")} editable={!disabled} accessibilityLabel={t("searchTitle")} />
    {busy && <ActivityIndicator color="#1f9c8b"/>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {!busy && q.trim().length>=2 && !items.length && !error && <Text style={s.help}>{t("noResults")}</Text>}
    {items.map(product=><Pressable accessibilityRole="button" key={product.id} onPress={()=>choose(product)} disabled={!product.selection_allowed || disabled || busy} style={[s.row,!product.selection_allowed && {opacity:0.55}]}>
      <Text style={s.name}>{product.name}</Text><Text style={s.help}>{product.approval_id} · {product.active_ingredient}</Text>
      <Text style={s.help}>{product.selection_allowed ? t(product.sds_state === "verified" ? "sdsVerified" : "sdsPending") : t("unavailable")}</Text>
    </Pressable>)}
    {more && <Text style={s.help}>{t("refineSearch")}</Text>}
    <Modal transparent visible={!!choice} onRequestClose={()=>setChoice(null)}>
      <View style={s.shade}><View style={s.dialog}><Text style={s.title}>{choice?.name}</Text><Text style={s.help}>{t("chooseKind")}</Text>
        {[ ["bait","bait"],["chemical","chemicals"] ].map(([label,kind])=><Pressable key={kind} accessibilityRole="button" style={s.action} onPress={()=>select(choice,kind)}><Text style={s.white}>{t(label)}</Text></Pressable>)}
        <Pressable accessibilityRole="button" style={s.cancel} onPress={()=>setChoice(null)}><Text>{t("cancel")}</Text></Pressable>
      </View></View>
    </Modal>
  </View>;
}
const s=StyleSheet.create({card:{margin:16,padding:18,borderRadius:12,backgroundColor:"#fff",borderWidth:1,borderColor:"#dce6e3"},title:{fontSize:18,fontWeight:"700",color:"#243d36"},help:{fontSize:13,lineHeight:20,color:"#52645e",marginVertical:5},input:{padding:12,borderWidth:1,borderColor:"#baccc5",borderRadius:8,fontSize:16,marginVertical:10},row:{paddingVertical:12,borderTopWidth:1,borderColor:"#e6eeea"},name:{fontSize:16,fontWeight:"600",color:"#186858"},error:{color:"#9b2929",marginVertical:8},shade:{flex:1,backgroundColor:"#0008",alignItems:"center",justifyContent:"center",padding:20},dialog:{width:"100%",maxWidth:440,backgroundColor:"#fff",padding:24,borderRadius:14},action:{backgroundColor:"#1f9c8b",padding:14,borderRadius:8,alignItems:"center",marginTop:12},white:{color:"#fff",fontWeight:"600"},cancel:{padding:14,alignItems:"center"}});
