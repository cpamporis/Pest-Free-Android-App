//components/PheromoneTrapForm.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator
} from "react-native";
import { formatTime } from "../utils/timeUtils";
import apiService from "../services/apiService";
import { StyleSheet } from "react-native";
import i18n from "../services/i18n";

function PheromoneTrapForm({
  stationId,
  onClose,
  technician,
  timerData,
  onStationLogged,
  existingStationData
}) {
  const [pheromoneType, setPheromoneType] = useState(existingStationData?.pheromoneType || "");
  const [replacedPheromone, setReplacedPheromone] = useState(existingStationData?.replacedPheromone || null);
  const [insectsCaptured, setInsectsCaptured] = useState(existingStationData?.insectsCaptured || "");
  const [damaged, setDamaged] = useState(existingStationData?.damaged || null);
  const [access, setAccess] = useState(existingStationData?.access || null);

  const [loading, setLoading] = useState(false);
  const [pheromoneTypes, setPheromoneTypes] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadTypes = async () => {
        try {
        const types = await apiService.getChemicals();

        if (!mounted) return;

        const normalized = Array.isArray(types)
            ? types.map(t => (typeof t === "string" ? t : t?.name))
            : [];

        setPheromoneTypes(normalized);

        } catch (e) {
        console.error("❌ Error loading pheromone types:", e);
        if (mounted) setPheromoneTypes([]);
        }
    };

    loadTypes();
    return () => { mounted = false; };

  }, []);

  useEffect(() => {
    if (access === "No") {
      setPheromoneType("");
      setReplacedPheromone(null);
      setInsectsCaptured("");
      setDamaged(null);
      setShowDropdown(false);
    }
  }, [access]);

  const saveData = async () => {
    if (access === "No") {
      onStationLogged({
        stationId,
        stationType: "PT",
        access: "No",
        pheromoneType: null,
        replacedPheromone: null,
        insectsCaptured: null,
        damaged: null,
        technicianId: technician?.id,
        technicianName: technician?.name,
        visitId: timerData?.visitId,
        timestamp: new Date().toISOString(),
      });
      onClose();
      return;
    }

    if (!pheromoneType) {
      Alert.alert(
        i18n.t("components.stationForms.common.incompleteForm"),
        i18n.t("components.stationForms.pheromoneTrap.error.pheromoneTypeRequired")
      );
      return;
    }

    if (!replacedPheromone) {
      Alert.alert(
        i18n.t("components.stationForms.common.incompleteForm"),
        i18n.t("components.stationForms.pheromoneTrap.error.replacedPheromoneRequired")
      );
      return;
    }

    // insectsCaptured: allow empty, since user may want to leave blank.
    if (!damaged) {
      Alert.alert(
        i18n.t("components.stationForms.common.incompleteForm"),
        i18n.t("components.stationForms.pheromoneTrap.error.damagedRequired")
      );
      return;
    }

    if (!access) {
      Alert.alert(
        i18n.t("components.stationForms.common.incompleteForm"),
        i18n.t("components.stationForms.pheromoneTrap.error.accessRequired")
      );
      return;
    }

    onStationLogged({
      stationId,
      stationType: "PT",
      pheromoneType,
      replacedPheromone,
      insectsCaptured,
      damaged,
      access,
      technicianId: technician?.id,
      technicianName: technician?.name,
      visitId: timerData?.visitId,
      timestamp: new Date().toISOString(),
    });

    onClose();
  };

  const disabled = access === "No";

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {i18n.t("components.stationForms.pheromoneTrap.title", { id: stationId })}
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 10 }}
          >
            {/* Pheromone Type Dropdown */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, disabled && styles.disabledText]}>
                {i18n.t("components.stationForms.pheromoneTrap.pheromoneType")}
              </Text>

              <TouchableOpacity
                style={[styles.dropdown, disabled && styles.disabledDropdown]}
                onPress={() => { if (!disabled) setShowDropdown(v => !v); }}
                disabled={disabled}
              >
                <Text style={[
                  styles.dropdownText,
                  !pheromoneType && { color: "#999" },
                  disabled && styles.disabledText
                ]}>
                  {pheromoneType || i18n.t("components.stationForms.pheromoneTrap.selectPheromoneType")}
                </Text>
              </TouchableOpacity>

              {showDropdown && !disabled && (
                <View style={styles.dropdownMenu}>
                  {pheromoneTypes.length === 0 && (
                    <Text style={styles.dropdownEmpty}>
                      {i18n.t("components.stationForms.pheromoneTrap.noPheromoneTypes")}
                    </Text>
                  )}

                  {pheromoneTypes.map((t, idx) => (
                    <TouchableOpacity
                      key={`pt-${idx}-${t}`}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setPheromoneType(t);
                        setShowDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Replaced Pheromone */}
            <View style={styles.toggleContainer}>
              <Text style={[styles.toggleLabel, disabled && styles.disabledText]}>
                {i18n.t("components.stationForms.pheromoneTrap.replacedPheromone")}
              </Text>
              <View style={styles.toggleButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    replacedPheromone === "Yes" && styles.toggleActive,
                    disabled && styles.disabledToggle
                  ]}
                  onPress={() => { if (!disabled) setReplacedPheromone("Yes"); }}
                  disabled={disabled}
                >
                  <Text style={[
                    styles.toggleText,
                    replacedPheromone === "Yes" && styles.toggleTextActive,
                    disabled && styles.disabledText
                  ]}>
                    {i18n.t("components.stationForms.common.yes")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    replacedPheromone === "No" && styles.toggleActive,
                    disabled && styles.disabledToggle
                  ]}
                  onPress={() => { if (!disabled) setReplacedPheromone("No"); }}
                  disabled={disabled}
                >
                  <Text style={[
                    styles.toggleText,
                    replacedPheromone === "No" && styles.toggleTextActive,
                    disabled && styles.disabledText
                  ]}>
                    {i18n.t("components.stationForms.common.no")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Insects Captured */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, disabled && styles.disabledText]}>
                {i18n.t("components.stationForms.pheromoneTrap.insectsCaptured")}
              </Text>
              <TextInput
                style={[styles.textArea, disabled && styles.disabledInput]}
                multiline
                numberOfLines={4}
                value={insectsCaptured}
                onChangeText={setInsectsCaptured}
                placeholder={i18n.t("components.stationForms.pheromoneTrap.insectsPlaceholder")}
                editable={!disabled}
                textAlignVertical="top"
              />
            </View>

            {/* Damaged */}
            <View style={styles.toggleContainer}>
              <Text style={[styles.toggleLabel, disabled && styles.disabledText]}>
                {i18n.t("components.stationForms.pheromoneTrap.damaged")}
              </Text>
              <View style={styles.toggleButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    damaged === "Yes" && styles.toggleActive,
                    disabled && styles.disabledToggle
                  ]}
                  onPress={() => { if (!disabled) setDamaged("Yes"); }}
                  disabled={disabled}
                >
                  <Text style={[
                    styles.toggleText,
                    damaged === "Yes" && styles.toggleTextActive,
                    disabled && styles.disabledText
                  ]}>
                    {i18n.t("components.stationForms.common.yes")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    damaged === "No" && styles.toggleActive,
                    disabled && styles.disabledToggle
                  ]}
                  onPress={() => { if (!disabled) setDamaged("No"); }}
                  disabled={disabled}
                >
                  <Text style={[
                    styles.toggleText,
                    damaged === "No" && styles.toggleTextActive,
                    disabled && styles.disabledText
                  ]}>
                    {i18n.t("components.stationForms.common.no")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Access (same as BS) */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>{i18n.t("components.stationForms.common.access")}</Text>
              <View style={styles.toggleButtonsContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, access === "Yes" && styles.toggleActive]}
                  onPress={() => setAccess("Yes")}
                >
                  <Text style={[styles.toggleText, access === "Yes" && styles.toggleTextActive]}>
                    {i18n.t("components.stationForms.common.yes")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleButton, access === "No" && styles.toggleActive]}
                  onPress={() => setAccess("No")}
                >
                  <Text style={[styles.toggleText, access === "No" && styles.toggleTextActive]}>
                    {i18n.t("components.stationForms.common.no")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveData}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{i18n.t("components.stationForms.common.save")}</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>{i18n.t("components.stationForms.common.cancel")}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  timerInfo: { marginBottom: 10 },
  timerInfoText: { color: "#555" },

  inputContainer: { marginBottom: 14 },
  inputLabel: { fontWeight: "600", marginBottom: 6 },

  textArea: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    minHeight: 90,
  },

  dropdown: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  dropdownText: { fontSize: 14 },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginTop: 8,
    overflow: "hidden",
  },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  dropdownItemText: { fontSize: 14 },
  dropdownEmpty: { padding: 12, color: "#888" },

  toggleContainer: { marginBottom: 14 },
  toggleLabel: { fontWeight: "600", marginBottom: 6 },
  toggleButtonsContainer: { flexDirection: "row", gap: 10 },

  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  toggleActive: { backgroundColor: "#1f9c8d", borderColor: "#1f9c8d" },
  toggleText: { color: "#333" },
  toggleTextActive: { color: "#fff", fontWeight: "700" },

  buttonRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  saveButton: {
    flex: 1,
    backgroundColor: "#1f9c8d",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontWeight: "700" },
  cancelButton: {
    flex: 1,
    backgroundColor: "#dc3545",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: { color: "#fff", fontWeight: "700" },

  disabledDropdown: { opacity: 0.5 },
  disabledToggle: { opacity: 0.5 },
  disabledInput: { opacity: 0.5 },
  disabledText: { opacity: 0.6 },
});

export default PheromoneTrapForm;