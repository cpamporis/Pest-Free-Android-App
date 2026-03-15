//AddTechnicianModal.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import i18n from "../services/i18n";

// ⚠️ Adjust this import if your styles live elsewhere
import { styles } from "../styles/commonStyles";

export default function AddTechnicianModal({ onClose, onSave }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSave = () => {
    if (!firstName || !lastName || !username || !password) {
      Alert.alert(
        i18n.t("common.error"), 
        i18n.t("components.addTechnicianModal.error.requiredFields")
      );
      return;
    }

    onSave({
      technicianId: `tech_${Date.now()}`,
      firstName,
      lastName,
      age,
      username,
      password,
    });

    onClose();
  };

  return (
    <Modal animationType="slide" transparent visible>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.customerFormCard}>
            <Text style={styles.title}>{i18n.t("components.addTechnicianModal.title")}</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{i18n.t("components.addTechnicianModal.firstName")}</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("components.addTechnicianModal.firstNamePlaceholder")}
                placeholderTextColor="#999"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{i18n.t("components.addTechnicianModal.lastName")}</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("components.addTechnicianModal.lastNamePlaceholder")}
                placeholderTextColor="#999"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{i18n.t("components.addTechnicianModal.age")}</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("components.addTechnicianModal.agePlaceholder")}
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{i18n.t("components.addTechnicianModal.username")}</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("components.addTechnicianModal.usernamePlaceholder")}
                placeholderTextColor="#999"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{i18n.t("components.addTechnicianModal.password")}</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("components.addTechnicianModal.passwordPlaceholder")}
                placeholderTextColor="#999"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.formButtonContainer}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>{i18n.t("components.addTechnicianModal.save")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { width: "45%", alignSelf: "center" },
                ]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>{i18n.t("components.addTechnicianModal.back")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}