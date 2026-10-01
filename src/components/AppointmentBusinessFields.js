import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import i18n from "../services/i18n";
import { RECURRENCE_DAYS } from "../utils/customerBilling";

function Dropdown({ label, value, options, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setOpen(!open)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[styles.value, !selected && styles.placeholder]}>
          {selected?.label || i18n.t("business.choose")}
        </Text>
        <MaterialIcons name={open ? "expand-less" : "expand-more"} size={24} color="#666" />
      </TouchableOpacity>
      {open && !disabled && (
        <ScrollView style={styles.menu} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {options.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, value === option.value && styles.optionSelected]}
              onPress={() => { onChange(option.value); setOpen(false); }}
            >
              <Text style={styles.optionText}>{option.label}</Text>
              {value === option.value && <MaterialIcons name="check" size={20} color="#1f9c8b" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default function AppointmentBusinessFields({
  category, recurrenceDays, onRecurrenceChange, totalVisits, onTotalVisitsChange,
  customerType, onCustomerTypeChange, customerTypeDisabled = false,
  containerStyle, disabled = false
}) {
  const countRequired = [7, 14, 30].includes(Number(recurrenceDays));
  return (
    <View style={[styles.card, containerStyle]}>
      <Dropdown label={i18n.t("business.customerType")} value={customerType || null}
        options={["private", "business"].map(value => ({value, label:i18n.t(`business.${value}`)}))}
        onChange={onCustomerTypeChange}
        disabled={disabled || customerTypeDisabled || !onCustomerTypeChange} />
      {category === "contract_service" && <>
      <Dropdown
        label={i18n.t("business.frequency")}
        value={recurrenceDays || null}
        options={RECURRENCE_DAYS.map(days => ({ value: days, label: i18n.t(`business.repeat${days}`) }))}
        onChange={days => {
          onRecurrenceChange(days);
          onTotalVisitsChange?.(null);
        }}
        disabled={disabled}
      />
      {countRequired && (
        <Dropdown
          label={i18n.t("business.totalVisits")}
          value={totalVisits || null}
          options={Array.from({ length: 12 }, (_, index) => ({
            value: index + 1, label: String(index + 1)
          }))}
          onChange={onTotalVisitsChange}
          disabled={disabled}
        />
      )}
      <Text style={styles.help}>{i18n.t("business.recurrenceHelp")}</Text>
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  field: { marginBottom: 12 },
  label: { fontSize: 15, fontWeight: "600", color: "#263c39", marginBottom: 8 },
  selector: { minHeight: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: "#dce6e4",
    borderRadius: 12, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  value: { color: "#2c3e50", fontSize: 15 },
  placeholder: { color: "#888" },
  menu: { maxHeight: 230, borderWidth: 1, borderColor: "#dce6e4", borderRadius: 12, backgroundColor: "#fff", marginTop: 4 },
  option: { minHeight: 45, paddingHorizontal: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  optionSelected: { backgroundColor: "#eff8f5" },
  optionText: { fontSize: 15, color: "#2c3e50" },
  help: { color: "#52635f", fontSize: 13, lineHeight: 19 }
});
