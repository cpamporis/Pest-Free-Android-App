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
      Alert.alert("Error", "All required fields must be filled");
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
            <Text style={styles.title}>Add Technician</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter first name"
                placeholderTextColor="#999"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter last name"
                placeholderTextColor="#999"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter age"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Username *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter username"
                placeholderTextColor="#999"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#999"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.formButtonContainer}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { width: "45%", alignSelf: "center" },
                ]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}