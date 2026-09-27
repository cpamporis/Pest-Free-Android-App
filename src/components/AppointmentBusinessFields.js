import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import i18n from "../services/i18n";
import { RECURRENCE_DAYS } from "../utils/customerBilling";

export default function AppointmentBusinessFields({ customerType, onCustomerTypeChange,
  category, recurrenceDays, onRecurrenceChange, disabled = false, showCustomerType = true }) {
  if (!showCustomerType && category !== "contract_service") return null;
  return <View style={styles.card}>
    {showCustomerType && <>
    <Text style={styles.label}>{i18n.t("business.customerType")}</Text>
    <View style={styles.select}>
      <Picker selectedValue={customerType || ""} onValueChange={onCustomerTypeChange}
        enabled={!disabled} accessibilityLabel={i18n.t("business.customerType")}>
        <Picker.Item label={i18n.t("business.choose")} value="" />
        <Picker.Item label={i18n.t("business.private")} value="private" />
        <Picker.Item label={i18n.t("business.business")} value="business" />
      </Picker>
    </View>
    <Text style={styles.help}>{i18n.t(customerType === "business" ? "business.businessCertificate" : "business.privateCertificate")}</Text>
    </>}
    {category === "contract_service" && <>
      <Text style={styles.label}>{i18n.t("business.frequency")}</Text>
      <View style={styles.select}>
        <Picker selectedValue={recurrenceDays || ""} onValueChange={value => onRecurrenceChange(value ? Number(value) : null)}
          enabled={!disabled} accessibilityLabel={i18n.t("business.frequency")}>
          <Picker.Item label={i18n.t("business.choose")} value="" />
          {RECURRENCE_DAYS.map(days => <Picker.Item key={days} label={i18n.t(`business.repeat${days}`)} value={days} />)}
        </Picker>
      </View>
      <Text style={styles.help}>{i18n.t("business.recurrenceHelp")}</Text>
    </>}
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderColor: "#dce6e4", borderWidth: 1, borderRadius: 12, padding: 14, marginVertical: 12 },
  label: { fontSize: 15, fontWeight: "600", color: "#263c39", marginBottom: 6 },
  select: { borderWidth: 1, borderColor: "#ccd9d6", borderRadius: 8, overflow: "hidden", minHeight: 48 },
  help: { color: "#52635f", fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 10 }
});
