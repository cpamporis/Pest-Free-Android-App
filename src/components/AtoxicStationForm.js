// AtoxicStationForm.js - Updated
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet
} from "react-native";

function AtoxicStationForm({
  stationId,
  stationType, // "ST" | "RM"
  onClose,
  technician,
  customerId,
  timerData,
  onStationLogged,
  onValidationError,
  existingStationData
}) {
  console.log("🚨 AtoxicStationForm received existingStationData:", existingStationData);
  
  
  // In AtoxicStationForm.js - Update the useState initializations
  const [capture, setCapture] = useState(
    existingStationData?.capture != null ? String(existingStationData.capture) : ''
  );
  const [rodentsCaptured, setRodentsCaptured] = useState(
    existingStationData?.rodentsCaptured != null ? String(existingStationData.rodentsCaptured) : ''
  );
  const [condition, setCondition] = useState(
    existingStationData?.condition !== undefined ? existingStationData.condition : null
  );
  const [access, setAccess] = useState(
    existingStationData?.access !== undefined ? existingStationData.access : null
  );
  const [triggered, setTriggered] = useState(
    existingStationData?.triggered !== undefined ? existingStationData.triggered : null
  );
  const [replacedSurface, setReplacedSurface] = useState(
    existingStationData?.replacedSurface !== undefined ? existingStationData.replacedSurface : null
  );
  const [loading, setLoading] = useState(false);

  // Add this effect to reset form when access changes to "No"
  React.useEffect(() => {
    if (access === "No") {
      console.log("🔄 Resetting form because access is 'No'");
      setCapture(null);
      setRodentsCaptured("");
      setCondition(null);
      setTriggered(null);
      setReplacedSurface(null);
    }
  }, [access]);

  console.log("🚨 AtoxicStationForm initialization:", {
    stationId,
    stationType,
    existingStationData,
    capture,
    access,
    hasAccessNo: existingStationData?.access === "No"
  });

  const handleSave = () => {
    console.log("🚨 AtoxicStationForm handleSave called!");
    console.log("🚨 Form values:", {
      stationId,
      stationType,
      capture,
      rodentsCaptured,
      replacedSurface,
      triggered,
      condition,
      access
    });

    // ACCESS EXCEPTION
    if (access === "No") {
      console.log("🚨 Access is 'No', logging minimal data");
      onStationLogged({
        stationId,
        stationType,
        access: "No",
        // Set other fields to null explicitly
        capture: null,
        rodentsCaptured: null,
        condition: null,
        triggered: stationType === "ST" ? null : undefined,
        replacedSurface: stationType === "RM" ? null : undefined,
        technicianId: technician?.id,
        technicianName: technician?.name,
        visitId: timerData?.visitId,
      });
      onClose();
      return;
    }

    // CAPTURE
    if (!capture) {
      Alert.alert("Incomplete Form", "You need to log Capture before saving");
      return;
    }

    // RODENTS (only if capture yes)
    if (capture === "Yes" && !rodentsCaptured) {
      Alert.alert("Incomplete Form", "You need to log Rodents Captured before saving");
      return;
    }

    // TYPE-SPECIFIC
    if (stationType === "RM" && !replacedSurface) {
      Alert.alert("Incomplete Form", "You need to log Replaced Surface before saving");
      return;
    }

    if (stationType === "ST" && !triggered) {
      Alert.alert("Incomplete Form", "You need to log Triggered before saving");
      return;
    }

    // CONDITION
    if (!condition) {
      Alert.alert("Incomplete Form", "You need to log Condition before saving");
      return;
    }

    // ACCESS (should always be "Yes" here since we handled "No" above)
    if (!access) {
      Alert.alert("Incomplete Form", "You need to log Access before saving");
      return;
    }

    setLoading(true);

    const payload = {
      stationId,
      stationType,
      timestamp: new Date().toISOString(),
      capture,
      rodentsCaptured: capture === "Yes" ? Number(rodentsCaptured || 0) : null,
      condition,
      access,
      triggered: stationType === "ST" ? triggered : null,
      replacedSurface: stationType === "RM" ? replacedSurface : null,
    };

    console.log("🚨 Sending payload to onStationLogged:", payload);
    onStationLogged(payload);
    setLoading(false);
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible={true}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {stationType === "ST" ? "Snap Trap" : "Multicatch"} {stationId}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Capture */}
            <Text style={styles.label}>Capture</Text>
            <View style={styles.row}>
              {["Yes", "No"].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.toggle, 
                    capture === v && styles.active,
                    access === "No" && styles.disabled // Disable when access is "No"
                  ]}
                  onPress={() => {
                    if (access !== "No") setCapture(v);
                  }}
                  disabled={access === "No"}
                >
                  <Text style={[
                    capture === v && styles.activeText,
                    access === "No" && styles.disabledText
                  ]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {capture === "Yes" && access !== "No" && (
              <>
                <Text style={styles.label}>Rodents Captured</Text>
                <TextInput
                  style={[styles.input, access === "No" && styles.disabledInput]}
                  keyboardType="numeric"
                  value={rodentsCaptured}
                  onChangeText={setRodentsCaptured}
                  placeholder="Rodents Captured"
                  editable={access !== "No"}
                />
              </>
            )}

            {/* Type-specific */}
            {stationType === "ST" && (
              <>
                <Text style={styles.label}>Triggered</Text>
                <View style={styles.row}>
                  {["Yes", "No"].map(v => (
                    <TouchableOpacity
                      key={v}
                      style={[
                        styles.toggle, 
                        triggered === v && styles.active,
                        access === "No" && styles.disabled
                      ]}
                      onPress={() => {
                        if (access !== "No") setTriggered(v);
                      }}
                      disabled={access === "No"}
                    >
                      <Text style={[
                        triggered === v && styles.activeText,
                        access === "No" && styles.disabledText
                      ]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {stationType === "RM" && (
              <>
                <Text style={styles.label}>Replaced Surface</Text>
                <View style={styles.row}>
                  {["Yes", "No"].map(v => (
                    <TouchableOpacity
                      key={v}
                      style={[
                        styles.toggle, 
                        replacedSurface === v && styles.active,
                        access === "No" && styles.disabled
                      ]}
                      onPress={() => {
                        if (access !== "No") setReplacedSurface(v);
                      }}
                      disabled={access === "No"}
                    >
                      <Text style={[
                        replacedSurface === v && styles.activeText,
                        access === "No" && styles.disabledText
                      ]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Condition */}
            <Text style={styles.label}>Condition</Text>
            <View style={styles.row}>
              {["Functional", "Damaged"].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.toggle, 
                    condition === v && styles.active,
                    access === "No" && styles.disabled
                  ]}
                  onPress={() => {
                    if (access !== "No") setCondition(v);
                  }}
                  disabled={access === "No"}
                >
                  <Text style={[
                    condition === v && styles.activeText,
                    access === "No" && styles.disabledText
                  ]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Access */}
            <Text style={styles.label}>Access</Text>
            <View style={styles.row}>
              {["Yes", "No"].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.toggle, access === v && styles.active]}
                  onPress={() => {
                    setAccess(v);
                  }}
                >
                  <Text style={access === v && styles.activeText}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.save} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
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
  row: { flexDirection: "row", gap: 10, marginTop: 6 },
  toggle: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: "#ccc", 
    borderRadius: 8, 
    padding: 10, 
    alignItems: "center" 
  },
  active: { backgroundColor: "#1f9c8b", borderColor: "#1f9c8b" },
  disabled: { backgroundColor: "#f5f5f5", borderColor: "#eee" },
  activeText: { color: "#fff", fontWeight: "bold" },
  disabledText: { color: "#999" },
  input: { 
    borderWidth: 1, 
    borderColor: "#ccc", 
    borderRadius: 8, 
    padding: 10,
    backgroundColor: "#fff"
  },
  disabledInput: {
    backgroundColor: "#f5f5f5",
    borderColor: "#eee",
    color: "#999"
  },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  save: { flex: 1, backgroundColor: "#1f9c8b", padding: 14, borderRadius: 10, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "bold" },
  cancel: { flex: 1, backgroundColor: "#dc3545", padding: 14, borderRadius: 10, alignItems: "center" },
  cancelText: { color: "#fff", fontWeight: "bold" },
});

export default AtoxicStationForm;