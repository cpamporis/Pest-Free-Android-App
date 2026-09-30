import React from "react";
import { View, Text, TouchableOpacity, Keyboard } from "react-native";
export default function StationConditionPicker({value, onChange, disabled = false}) {
  return <View style={{marginVertical:12}}><Text style={{fontWeight:"600", marginBottom:8}}>Κατάσταση</Text>
    <View style={{flexDirection:"row", flexWrap:"wrap", gap:6}}>
      {[["Functional","Λειτουργικό"],["Damaged","Κατεστραμμένο"],["Missing","Λείπει"]].map(([key,label]) =>
        <TouchableOpacity key={key} accessibilityRole="radio" accessibilityState={{checked:value===key,disabled}} disabled={disabled}
          onPress={()=>{if(disabled)return;Keyboard.dismiss();onChange(key);}} style={{opacity:disabled?0.45:1,padding:10,borderRadius:8,borderWidth:1,borderColor:value===key?"#1f9c8b":"#ccc",backgroundColor:value===key?"#1f9c8b":"white"}}>
          <Text style={{color:value===key?"white":"#234"}}>{label}</Text>
        </TouchableOpacity>)}
    </View>
  </View>;
}
