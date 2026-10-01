import React, {useState} from "react";
import {Modal, View, Text, TouchableOpacity, StyleSheet} from "react-native";
import {mapIdOf, nextStationNumber} from "../utils/stationMapIdentity";
import i18n from "../services/i18n";
export default function useStationNumbering({map, maps, stations, type, onReady}) {
  const [choices, setChoices] = useState({});
  const [question, setQuestion] = useState(null);
  const english = String(i18n.locale || "el").startsWith("en");
  const key = JSON.stringify([mapIdOf(map), type]);
  const next = nextStationNumber(stations, type, choices[key] || 1);
  const requestAdd = () => {
    if (!map) return;
    if (choices[key] !== undefined) { onReady(); return; }
    const others = maps.filter(m => mapIdOf(m) !== mapIdOf(map)).flatMap(m => m.stations || []);
    const continued = nextStationNumber([...others, ...stations], type);
    const local = nextStationNumber(stations, type);
    if (continued <= local) { setChoices(c => ({...c, [key]: local})); onReady(); return; }
    setQuestion({key, continued, local, type});
  };
  const choose = minimum => {
    setChoices(c => ({...c, [question.key]: minimum}));
    setQuestion(null);
    onReady();
  };
  const prompt = <Modal visible={!!question} transparent animationType="fade" onRequestClose={() => setQuestion(null)}>
    <View style={styles.overlay}><View style={styles.card}>
      <Text style={styles.title}>{english ? "Station numbering" : "Αρίθμηση συσκευών"}</Text>
      <Text style={styles.body}>{english
        ? `Continue ${question?.type} numbering from ${question?.continued}? Existing devices keep their numbers.`
        : `Συνέχεια αρίθμησης ${question?.type} από το ${question?.continued}; Οι υπάρχουσες συσκευές διατηρούν τους αριθμούς τους.`}</Text>
      <TouchableOpacity style={styles.primary} onPress={() => choose(question.continued)}><Text style={styles.white}>{english ? "Yes, continue" : "Ναι, συνέχεια"}</Text></TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={() => choose(question.local)}><Text style={styles.green}>{english ? `No, from ${question?.local} on this plan` : `Όχι, από το ${question?.local} σε αυτή την κάτοψη`}</Text></TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={() => setQuestion(null)}><Text>{english ? "Cancel" : "Ακύρωση"}</Text></TouchableOpacity>
    </View></View>
  </Modal>;
  return {requestAdd, next, prompt};
}
const styles = StyleSheet.create({overlay:{flex:1,backgroundColor:"rgba(0,0,0,0.4)",alignItems:"center",justifyContent:"center",padding:24},card:{width:"100%",maxWidth:440,backgroundColor:"white",borderRadius:16,padding:24},title:{fontSize:20,fontWeight:"700",color:"#263238",marginBottom:14},body:{fontSize:16,lineHeight:24,marginBottom:18},primary:{backgroundColor:"#1f9c8b",padding:14,borderRadius:10,alignItems:"center",marginBottom:10},secondary:{padding:14,alignItems:"center",borderRadius:10},white:{color:"white",fontWeight:"700"},green:{color:"#1f9c8b",fontWeight:"600"}});
