//BaitStationForm.js
import React, { useState, useEffect} from "react";
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
import { Dimensions } from "react-native";
import i18n from "../services/i18n";


function BaitStationForm({ stationId, onClose, customerId, technician, timerData, onStationLogged, onValidationError, existingStationData }) {
  const [consumption, setConsumption] = useState(existingStationData?.consumption || "");
  const [baitType, setBaitType] = useState(existingStationData?.baitType || "");
  const [condition, setCondition] = useState(existingStationData?.condition || null);
  const [access, setAccess] = useState(existingStationData?.access || null);
  const [loading, setLoading] = useState(false);
  const { height: SCREEN_HEIGHT } = Dimensions.get("window");
  const BAIT_CONSUMPTION_OPTIONS = ["0%", "25%", "50%", "75%", "100%"];
  const [baitTypes, setBaitTypes] = useState([]);
  const [showBaitTypeDropdown, setShowBaitTypeDropdown] = useState(false);
  const [showConsumptionDropdown, setShowConsumptionDropdown] = useState(false);
  const DOSAGE_OPTIONS = [10, 20, 30, 40, 50, 60];
  const [dosageG, setDosageG] = useState(
    existingStationData?.dosage_g ?? null
  );
  const [showDosageDropdown, setShowDosageDropdown] = useState(false);

  useEffect(() => {
    if (existingStationData?.dosage_g !== undefined) {
      setDosageG(existingStationData.dosage_g);
    } else {
      setDosageG(null);
    }
  }, [existingStationData]);

  useEffect(() => {
    let isMounted = true;

    const loadBaitTypes = async () => {
      try {
        
        // Get bait types - apiService.getBaitTypes() now returns array directly
        const baitArray = await apiService.getBaitTypes();
        

        
        if (isMounted) {
          if (Array.isArray(baitArray) && baitArray.length > 0) {
            setBaitTypes(baitArray);
          } else {
            setBaitTypes([]);
          }
        }
      } catch (error) {
        console.error("❌ Error loading bait types:", error);
        if (isMounted) {
          setBaitTypes([]);
        }
      }
    };

    loadBaitTypes();

    return () => {
      isMounted = false;
    };
  }, []);

  const saveData = async () => {
    if (access === "No") {
      onStationLogged({
        stationId,
        stationType: "BS", // ADD THIS
        access: "No",
        // Explicitly set other fields to null
        consumption: null,
        baitType: null,
        condition: null,
        technicianId: technician?.id,
        technicianName: technician?.name,
        visitId: timerData?.visitId,
      });
      onClose();
      return;
    }

    // VALIDATION (top → bottom)
    if (!consumption) {
      Alert.alert(
        i18n.t("components.stationForms.common.incompleteForm"), 
        i18n.t("components.stationForms.baitStation.error.consumptionRequired")
      );
      return;
    }

    if (!baitType) {
      Alert.alert(
        i18n.t("components.stationForms.common.incompleteForm"), 
        i18n.t("components.stationForms.baitStation.error.baitTypeRequired")
      );
      return;
    }

    if (!dosageG) {
      Alert.alert(
        i18n.t("components.stationForms.common.incompleteForm"),
        i18n.t("components.stationForms.baitStation.error.dosageRequired")
      );
      return;
    }

    if (!condition) {
      Alert.alert(
        i18n.t("components.stationForms.common.incompleteForm"), 
        i18n.t("components.stationForms.baitStation.error.conditionRequired")
      );
      return;
    }

    if (!access) {
      Alert.alert(
        i18n.t("components.stationForms.common.incompleteForm"), 
        i18n.t("components.stationForms.baitStation.error.accessRequired")
      );
      return;
    }

    // 🚨 CRITICAL FIX: Don't try to save to /log endpoint
    // Instead, just notify the parent component to save locally
    const stationData = {
      stationId,
      stationType: "BS",
      access: access,
      consumption: consumption,
      baitType: baitType,
      dosage_g: dosageG,
      condition: condition,
      technicianId: technician?.id,
      technicianName: technician?.name,
      visitId: timerData?.visitId,
      timestamp: new Date().toISOString(),
      customerId: customerId
    };
    
    // Call the parent's onStationLogged to save locally
    if (onStationLogged) {
      onStationLogged(stationData);
    }
    onClose();
  };

  React.useEffect(() => {
    if (access === "No") {
      setConsumption("");
      setBaitType("");
      setCondition(null);
      setDosageG(null);
    }
  }, [access]);

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {i18n.t("components.stationForms.baitStation.title", { id: stationId })}
          </Text>

          {timerData && (
            <View style={styles.timerInfo}>
              <Text style={styles.timerInfoText}>
                {i18n.t("components.stationForms.common.timeSpent", { 
                  time: formatTime(timerData.elapsedTime) 
                })}
              </Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 10 }}
          >
            {/* Bait Consumption */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {i18n.t("components.stationForms.baitStation.baitConsumption")}
              </Text>
              <TouchableOpacity
                style={[
                  styles.dropdown, 
                  access === "No" && styles.disabledDropdown
                ]}
                onPress={() => {
                  if (access !== "No") setShowConsumptionDropdown(prev => !prev);
                }}
                disabled={access === "No"}
              >
                <Text style={[
                  styles.dropdownText,
                  !consumption && { color: "#999" },
                  access === "No" && styles.disabledText
                ]}>
                  {consumption || i18n.t("components.stationForms.baitStation.selectConsumption")}
                </Text>
              </TouchableOpacity>

              {showConsumptionDropdown && access !== "No" && (
                <View style={styles.dropdownMenu}>
                  {BAIT_CONSUMPTION_OPTIONS.map(option => (
                    <TouchableOpacity
                      key={option}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setConsumption(option);
                        setShowConsumptionDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Bait Type */}
            <View style={styles.inputContainer}>
              <Text style={[
                styles.inputLabel,
                access === "No" && styles.disabledText
              ]}>
                {i18n.t("components.stationForms.baitStation.baitType")}
              </Text>

              <TouchableOpacity
                style={[
                  styles.dropdown,
                  access === "No" && styles.disabledDropdown
                ]}
                onPress={() => {
                  if (access !== "No") {
                    setShowBaitTypeDropdown(prev => !prev);
                  }
                }}
                disabled={access === "No"}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !baitType && { color: "#999" },
                    access === "No" && styles.disabledText
                  ]}
                >
                  {baitType || i18n.t("components.stationForms.baitStation.selectBaitType")}
                </Text>
              </TouchableOpacity>

              {showBaitTypeDropdown && access !== "No" && (
                <View style={styles.dropdownMenu}>
                  {baitTypes.length === 0 && (
                    <Text style={styles.dropdownEmpty}>
                      {i18n.t("components.stationForms.baitStation.noBaitTypes")}
                    </Text>
                  )}

                  {baitTypes.map((type, index) => {
                    // Extract name if it's an object
                    const typeName = typeof type === 'string' ? type : (type.name || String(type));
                    
                    return (
                      <TouchableOpacity
                        key={`bait-${index}-${typeName}`}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setBaitType(typeName);
                          setShowBaitTypeDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{typeName}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Dosage (g) */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {i18n.t("components.stationForms.baitStation.dosage")}
              </Text>

              <TouchableOpacity
                style={[
                  styles.dropdown,
                  access === "No" && styles.disabledDropdown
                ]}
                onPress={() => {
                  if (access !== "No") {
                    setShowDosageDropdown(prev => !prev);
                  }
                }}
                disabled={access === "No"}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !dosageG && { color: "#999" },
                    access === "No" && styles.disabledText
                  ]}
                >
                  {dosageG ? `${dosageG}g` : i18n.t("components.stationForms.baitStation.selectDosage")}
                </Text>
              </TouchableOpacity>

              {showDosageDropdown && access !== "No" && (
                <View style={styles.dropdownMenu}>
                  {DOSAGE_OPTIONS.map(value => (
                    <TouchableOpacity
                      key={value}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setDosageG(value);
                        setShowDosageDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>
                        {value}g
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Condition */}
            <View style={styles.toggleContainer}>
              <Text style={[
                styles.toggleLabel,
                access === "No" && styles.disabledText
              ]}>
                {i18n.t("components.stationForms.common.condition")}
              </Text>
              <View style={styles.toggleButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    condition === "Functional" && styles.toggleActive,
                    access === "No" && styles.disabledToggle
                  ]}
                  onPress={() => {
                    if (access !== "No") setCondition("Functional");
                  }}
                  disabled={access === "No"}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      condition === "Functional" && styles.toggleTextActive,
                      access === "No" && styles.disabledText
                    ]}
                  >
                    {i18n.t("components.stationForms.common.functional")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    condition === "Damaged" && styles.toggleActive,
                    access === "No" && styles.disabledToggle
                  ]}
                  onPress={() => {
                    if (access !== "No") setCondition("Damaged");
                  }}
                  disabled={access === "No"}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      condition === "Damaged" && styles.toggleTextActive,
                      access === "No" && styles.disabledText
                    ]}
                  >
                    {i18n.t("components.stationForms.common.damaged")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Access */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>{i18n.t("components.stationForms.common.access")}</Text>
              <View style={styles.toggleButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    access === "Yes" && styles.toggleActive,
                  ]}
                  onPress={() => setAccess("Yes")}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      access === "Yes" && styles.toggleTextActive,
                    ]}
                  >
                    {i18n.t("components.stationForms.common.yes")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    access === "No" && styles.toggleActive,
                  ]}
                  onPress={() => setAccess("No")}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      access === "No" && styles.toggleTextActive,
                    ]}
                  >
                    {i18n.t("components.stationForms.common.no")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* ACTIONS */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveData}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>{i18n.t("components.stationForms.common.save")}</Text>
              )}
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
  screen: {
  flex: 1,
  backgroundColor: "#f5f5f5",
},

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50, // ← IMPORTANT
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },


  backText: {
    color: "#1f9c8b",
    fontSize: 16,
    fontWeight: "bold",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f9c8b",
  },

  content: {
    padding: 20,
    paddingBottom: 120, 
  },


  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#eee",
  },

  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    maxHeight: "85%",
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f9c8b",
    textAlign: "center",
    marginBottom: 12,
  },

  timerInfo: {
    backgroundColor: "#f1f9f8",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },

  timerInfoText: {
    color: "#1f9c8b",
    fontWeight: "600",
    textAlign: "center",
  },

  inputContainer: {
    marginBottom: 12,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#fff",
  },

  toggleContainer: {
    marginTop: 10,
  },

  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },

  toggleButtonsContainer: {
    flexDirection: "row",
    gap: 10,
  },

  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },

  toggleActive: {
    backgroundColor: "#1f9c8b",
    borderColor: "#1f9c8b",
  },

  toggleText: {
    color: "#333",
    fontWeight: "600",
  },

  toggleTextActive: {
    color: "#fff",
  },

  buttonContainer: {
    marginTop: 20,
  },

  centerWrapper: {
    maxHeight: "85%",
    justifyContent: "center",
  },

  saveButton: {
    flex: 1,
    backgroundColor: "#1f9c8b",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#dc3545", // RED background
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#fff", // White text on red background
    fontWeight: "bold",
    fontSize: 16,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#1f9c8b",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },

  dropdownText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },

  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#1f9c8b",
    borderRadius: 10,
    backgroundColor: "#fff",
    overflow: "hidden",
  },

  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  dropdownItemText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },

  dropdownEmpty: {
    padding: 12,
    textAlign: "center",
    color: "#999",
  },
  disabled: {
    backgroundColor: "#f5f5f5",
    borderColor: "#eee",
  },
  disabledText: {
    color: "#999",
  },
  disabledDropdown: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ddd",
  },
  disabledText: {
    color: "#999",
  },
  disabledToggle: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ddd",
  },
});
export default BaitStationForm;