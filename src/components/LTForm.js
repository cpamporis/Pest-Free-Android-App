// LightTrapForm.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet
} from "react-native";
import i18n from "../services/i18n";

function LightTrapForm({
  stationId,
  onClose,
  technician,
  timerData,
  onStationLogged,
  onValidationError,
  existingStationData
}) {

  const [mosquitoes, setMosquitoes] = useState(existingStationData?.mosquitoes || "");
  const [lepidoptera, setLepidoptera] = useState(existingStationData?.lepidoptera || "");
  const [drosophila, setDrosophila] = useState(existingStationData?.drosophila || "");
  const [flies, setFlies] = useState(existingStationData?.flies || "");
  const [others, setOthers] = useState(existingStationData?.others || []);
  const [otherInput, setOtherInput] = useState("");

  const [replaceBulb, setReplaceBulb] = useState(existingStationData?.replaceBulb || null);
  const [condition, setCondition] = useState(existingStationData?.condition || null);
  const [access, setAccess] = useState(existingStationData?.access || null);
  const [loading, setLoading] = useState(false);

  const addOther = () => {
    if (!otherInput.trim()) return;
    setOthers(prev => [...prev, otherInput.trim()]);
    setOtherInput("");
  };

  const handleSave = () => {
    // ACCESS EXCEPTION
    if (access === "No") {
      onStationLogged({
        stationType: "LT",
        stationId,
        access: "No",
        // Explicitly set other fields to null
        mosquitoes: null,
        lepidoptera: null,
        drosophila: null,
        flies: null,
        others: null,
        replaceBulb: null,
        condition: null,
        technicianId: technician?.id,
        technicianName: technician?.name,
        visitId: timerData?.visitId,
      });
      onClose();
      return;
    }

    // REQUIRED TOGGLES ONLY
    if (!replaceBulb) {
      Alert.alert(
        i18n.t("components.stationForms.common.incompleteForm"),
        i18n.t("components.stationForms.lightTrap.error.replaceBulbRequired")
      );
      return;
    }

    if (!condition) {
      Alert.alert(
        i18n.t("components.stationForms.common.incompleteForm"),
        i18n.t("components.stationForms.lightTrap.error.conditionRequired")
      );
      return;
    }

    if (!access) {
      Alert.alert(
        i18n.t("components.stationForms.common.incompleteForm"),
        i18n.t("components.stationForms.lightTrap.error.accessRequired")
      );
      return;
    }

    const payload = {
      stationType: "LT",
      stationId,
      timestamp: new Date().toISOString(),
      mosquitoes,
      lepidoptera,
      drosophila,
      flies,
      others, // This should be an array
      replaceBulb,
      condition,
      access,
      technicianId: technician?.id,
      technicianName: technician?.name,
      startTime: timerData?.startTime,
      endTime: Date.now(),
      duration: timerData?.elapsedTime,
      visitId: timerData?.visitId,
    };

    onStationLogged(payload);
    onClose();
  };

  React.useEffect(() => {
    if (access === "No") {
      setMosquitoes("");
      setLepidoptera("");
      setDrosophila("");
      setFlies("");
      setOthers([]);
      setReplaceBulb(null);
      setCondition(null);
    }
  }, [access]);


  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {i18n.t("components.stationForms.lightTrap.title", { id: stationId })}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              ["Mosquitoes", mosquitoes, setMosquitoes],
              ["Lepidoptera", lepidoptera, setLepidoptera],
              ["Drosophila", drosophila, setDrosophila],
              ["Flies", flies, setFlies]
            ].map(([label, value, setter]) => (
              <View key={label}>
                <Text style={[
                  styles.label,
                  access === "No" && styles.disabledLabel
                ]}>
                  {label === "Mosquitoes" ? i18n.t("components.stationForms.lightTrap.mosquitoes") :
                   label === "Lepidoptera" ? i18n.t("components.stationForms.lightTrap.lepidoptera") :
                   label === "Drosophila" ? i18n.t("components.stationForms.lightTrap.drosophila") :
                   i18n.t("components.stationForms.lightTrap.flies")} :
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    access === "No" && styles.disabledInput
                  ]}
                  keyboardType="numeric"
                  placeholder={i18n.t("components.stationForms.lightTrap.enterValue") || "Enter value"}
                  value={value}
                  onChangeText={(text) => {
                    if (access !== "No") setter(text);
                  }}
                  editable={access !== "No"}
                />
              </View>
            ))}

            {/* Others */}
            <Text style={[
              styles.label,
              access === "No" && styles.disabledLabel
            ]}>{i18n.t("components.stationForms.lightTrap.others")} :</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[
                  styles.input, 
                  { flex: 1 },
                  access === "No" && styles.disabledInput
                ]}
                placeholder={i18n.t("components.stationForms.lightTrap.otherPlaceholder")}
                value={otherInput}
                onChangeText={(text) => {
                  if (access !== "No") setOtherInput(text);
                }}
                editable={access !== "No"}
              />
              <TouchableOpacity 
                style={[
                  styles.addBtn,
                  access === "No" && styles.disabledAddBtn
                ]} 
                onPress={() => {
                  if (access !== "No") addOther();
                }}
                disabled={access === "No"}
              >
                <Text style={[
                  styles.addText,
                  access === "No" && styles.disabledText
                ]}>+</Text>
              </TouchableOpacity>
            </View>

            {others.map((o, i) => (
              <Text key={i} style={[
                styles.otherItem,
                access === "No" && styles.disabledText
              ]}>• {o}</Text>
            ))}

            {/* Replace Bulb */}
            <Text style={[
              styles.label,
              access === "No" && styles.disabledLabel
            ]}>{i18n.t("components.stationForms.lightTrap.replaceBulb")}</Text>
            <View style={styles.row}>
              {["Yes", "No"].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.toggle, 
                    replaceBulb === v && styles.active,
                    access === "No" && styles.disabledToggle
                  ]}
                  onPress={() => {
                    if (access !== "No") setReplaceBulb(v);
                  }}
                  disabled={access === "No"}
                >
                  <Text style={[
                    replaceBulb === v && styles.activeText,
                    access === "No" && styles.disabledText
                  ]}>
                    {v === "Yes" ? i18n.t("components.stationForms.common.yes") : i18n.t("components.stationForms.common.no")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Condition */}
            <Text style={[
              styles.label,
              access === "No" && styles.disabledLabel
            ]}>{i18n.t("components.stationForms.common.condition")}</Text>
            <View style={styles.row}>
              {["Functional", "Damaged"].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.toggle, 
                    condition === v && styles.active,
                    access === "No" && styles.disabledToggle
                  ]}
                  onPress={() => {
                    if (access !== "No") setCondition(v);
                  }}
                  disabled={access === "No"}
                >
                  <Text style={[
                    condition === v && styles.activeText,
                    access === "No" && styles.disabledText
                  ]}>
                    {v === "Functional" 
                      ? i18n.t("components.stationForms.common.functional") 
                      : i18n.t("components.stationForms.common.damaged")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Access */}
            <Text style={styles.label}>{i18n.t("components.stationForms.common.access")}</Text>
            <View style={styles.row}>
              {["Yes", "No"].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.toggle, 
                    access === v && styles.active
                  ]}
                  onPress={() => setAccess(v)}
                >
                  <Text style={access === v && styles.activeText}>
                    {v === "Yes" ? i18n.t("components.stationForms.common.yes") : i18n.t("components.stationForms.common.no")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.save} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{i18n.t("components.stationForms.common.save")}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>{i18n.t("components.stationForms.common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, width: "90%", maxHeight: "85%" },
  title: { fontSize: 18, fontWeight: "bold", color: "#1f9c8b", textAlign: "center", marginBottom: 12 },
  label: { fontWeight: "600", marginTop: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 },
  row: { flexDirection: "row", gap: 10, marginTop: 6 },
  toggle: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, alignItems: "center" },
  active: { backgroundColor: "#1f9c8b", borderColor: "#1f9c8b" },
  activeText: { color: "#fff", fontWeight: "bold" },
  addBtn: { backgroundColor: "#1f9c8b", padding: 12, borderRadius: 8 },
  addText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  otherItem: { fontSize: 13, marginTop: 4, color: "#333" },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  save: { flex: 1, backgroundColor: "#1f9c8b", padding: 14, borderRadius: 10, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "bold" },
  cancel: { flex: 1, backgroundColor: "#dc3545", padding: 14, borderRadius: 10, alignItems: "center" },
  cancelText: { color: "#fff", fontWeight: "bold" },
  
  // ADD THESE NEW STYLES:
  disabledLabel: {
    color: "#999",
  },
  disabledInput: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ddd",
    color: "#999",
  },
  disabledToggle: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ddd",
  },
  disabledText: {
    color: "#999",
  },
  disabledAddBtn: {
    backgroundColor: "#ddd",
  },
});

export default LightTrapForm;