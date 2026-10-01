import React, {useMemo} from "react";
import {View,Text,StyleSheet} from "react-native";
import {buildMapAnalysis} from "../utils/stationMapAnalysis";
import i18n from "../services/i18n";
export default function MapStationAnalysis({rows,maps,latest,type,year,period}) {
 const en=String(i18n.locale || "el").startsWith("en");
 const groups=useMemo(()=>buildMapAnalysis({rows,maps,latest,type,year,months:parseInt(period,10)||3,unknownName:en?"Unassigned floor plan":"Χωρίς προσδιορισμένη κάτοψη"}),[rows,maps,latest,type,year,period,en]);
 const format=v=>v==null?"—":`${Math.round(v*10)/10}${type==="BS"?"%":""}`;
 return <View>{groups.length===0?<Text style={styles.note}>{en?"No station data":"Δεν υπάρχουν δεδομένα συσκευών"}</Text>:groups.map(g=>{
  const max=Math.max(1,...g.monthly.map(m=>m.value||0));
  return <View key={g.id || "unassigned"} style={styles.card}>
   <Text style={styles.title}>{g.name}</Text>
   <Text style={styles.note}>{en?"Missing / damaged / inaccessible: no measurement (—).":"Λείπει / κατεστραμμένο / χωρίς πρόσβαση: χωρίς μέτρηση (—)."}</Text>
   <View style={styles.row}><Text style={styles.cell}>{en?"Device":"Συσκευή"}</Text><Text style={styles.cell}>{en?"Latest visit":"Τελευταία επίσκεψη"}</Text><Text style={styles.cell}>{en?"Period average":"Μ.Ο. περιόδου"}</Text></View>
   {g.devices.map(d=><View key={d.id} style={styles.row}><Text style={styles.cell}>{type}{d.id}</Text><Text style={styles.cell}>{format(d.latest)}</Text><Text style={styles.cell}>{format(d.average)}</Text></View>)}
   <Text style={styles.subtitle}>{en?"Period comparison":"Σύγκριση περιόδων"}</Text>
   <Text style={styles.note}>{en?"Current":"Τρέχουσα"}: {format(g.current)} · {en?"Previous":"Προηγούμενη"}: {format(g.previous)}</Text>
   <Text style={styles.subtitle}>{en?"Monthly activity":"Μηνιαία δραστηριότητα"} · {year}</Text>
   {g.monthly.map(m=><View key={m.id} style={styles.barRow}><Text style={styles.month}>{String(m.id).padStart(2,"0")}</Text><View style={styles.track}>{m.value!==null && <View style={[styles.bar,{width:`${Math.max(0,m.value/max*100)}%`}]} />}</View><Text style={styles.value}>{format(m.value)}</Text></View>)}
   {type==="BS" && g.top.length>0 && <><Text style={styles.subtitle}>{en?"Top 10 bait stations":"10 πιο ενεργοί δολωματικοί σταθμοί"}</Text>{g.top.map(d=><Text key={d.id} style={styles.note}>BS{d.id}: {format(d.average)} · {d.count} {en?"checks at 100%":"έλεγχοι με 100%"}</Text>)}</>}
  </View>;
 })}</View>;
}
const styles=StyleSheet.create({card:{backgroundColor:"#fff",borderRadius:12,padding:16,marginTop:16,borderWidth:1,borderColor:"#e0e7e5"},title:{fontSize:18,fontWeight:"700",color:"#263238",marginBottom:10},subtitle:{fontSize:15,fontWeight:"700",color:"#263238",marginTop:18,marginBottom:8},note:{fontSize:13,color:"#526460",lineHeight:20,marginBottom:8},row:{flexDirection:"row",paddingVertical:10,borderBottomWidth:1,borderColor:"#edf1ef"},cell:{flex:1,fontSize:13,color:"#263238"},barRow:{flexDirection:"row",alignItems:"center",marginVertical:5},month:{width:28,fontSize:12},track:{flex:1,height:14,backgroundColor:"#eef4f2",borderRadius:4,overflow:"hidden"},bar:{height:14,backgroundColor:"#1f9c8b",borderRadius:4},value:{width:65,textAlign:"right",fontSize:12}});
