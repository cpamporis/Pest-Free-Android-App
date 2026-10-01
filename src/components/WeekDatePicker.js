import React from "react";
import {View, Text, TouchableOpacity, ScrollView, StyleSheet} from "react-native";
import {Calendar, LocaleConfig} from "react-native-calendars";
import {ProtectedAdminModal as Modal} from "./AdminSessionTimer";
import i18n from "../services/i18n";

export default function WeekDatePicker({visible, selectedDate, onSelect, onClose}) {
  if (!visible) return null;
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].map(k=>i18n.t(`months.${k}`));
  const days = ["sun","mon","tue","wed","thu","fri","sat"].map(k=>i18n.t(`weekdays.short.${k}`));
  const locale = i18n.getLocale();
  LocaleConfig.locales[locale] = {monthNames:months, monthNamesShort:months, dayNames:days, dayNamesShort:days, today:i18n.t("common.today")};
  LocaleConfig.defaultLocale = locale;
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View style={styles.card}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{locale === 'en' ? 'Select a date to view its week' : 'Επιλέξτε ημερομηνία για προβολή εβδομάδας'}</Text>
          <Calendar current={selectedDate} firstDay={1} enableSwipeMonths
            markedDates={{[selectedDate]:{selected:true, selectedColor:'#1f9c8b'}}}
            onDayPress={day=>onSelect(day.dateString)}
            theme={{arrowColor:'#1f9c8b', todayTextColor:'#1f9c8b'}}/>
          <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>{i18n.t("common.cancel")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.45)',justifyContent:'center',alignItems:'center',padding:24},
  card:{width:'100%',maxWidth:440,maxHeight:'90%',backgroundColor:'#fff',borderRadius:18,padding:16},
  title:{fontSize:17,fontWeight:'600',color:'#2c3e50',marginBottom:12},
  button:{padding:14,alignItems:'center',borderRadius:10,backgroundColor:'#1f9c8b',marginTop:12},
  buttonText:{color:'#fff',fontWeight:'600'}
});
