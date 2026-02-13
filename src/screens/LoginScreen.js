//LoginScreen.js
import React, { useState } from "react";
import { Modal, ScrollView } from "react-native";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert
} from "react-native";
import { StyleSheet } from "react-native";

import apiService from "../services/apiService";
import pestfreeLogo from "../../assets/pestfree_logo.png";
import loginBackground from "../../assets/background.jpg";

export default function LoginScreen({
  onTechnicianLogin,
  onAdminLogin,
  onCustomerLogin,
  onPasswordRecovery
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const tryLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    const result = await apiService.login(email, password);

    if (!result || !result.success) {
      Alert.alert("Login Failed");
      setPassword("");
      return;
    }

    if (result.role === "admin") {
      await apiService.setAuthToken(result.token);
      onAdminLogin();
      return;
    }

    if (result.role === "tech") {
      await apiService.setAuthToken(result.token);
      onTechnicianLogin(result.technician);
      return;
    }
    if (result.role === "customer") {
      await apiService.setAuthToken(result.token);
      onCustomerLogin(result.customer);
      return;
    }

    Alert.alert("Login Failed");
    setPassword("");
  };

  return (
    <View style={styles.loginContainer}>
      <Image source={loginBackground} style={styles.backgroundImage} />
      <View style={styles.backgroundOverlay} />

      <View style={styles.loginContent}>
        <Image source={pestfreeLogo} style={styles.logo} resizeMode="contain" />

        <TextInput
          style={styles.loginInput}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.loginInput}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.loginButton} onPress={tryLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ marginTop: 14 }}
          onPress={onPasswordRecovery}
        >
          <Text style={{ color: "#fff", textDecorationLine: "underline" }}>
            Forgot Password
          </Text>
        </TouchableOpacity>
        
        {/* Footer links moved here to be centered and higher up */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => setShowPrivacy(true)}>
            <Text style={styles.footerText}>Privacy Policy</Text>
          </TouchableOpacity>

          <Text style={styles.footerSeparator}>|</Text>

          <TouchableOpacity onPress={() => setShowTerms(true)}>
            <Text style={styles.footerText}>Terms of Use</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showPrivacy} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Privacy Policy</Text>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <View style={styles.modalTextContainer}>
              <Text style={styles.modalText}>
                Privacy Policy – Pest-Free{"\n\n"}
                Pest-Free is a business-to-business mobile application designed to support
                professional pest control operations, including inspections, service logging,
                and compliance reporting.{"\n\n"}
                This application is intended exclusively for authorized business users,
                such as administrators, technicians, and approved customer representatives.
                It is not intended for public or consumer use.{"\n\n"}
                Data We Process{"\n"}
                We process only the data necessary to provide the service, which may include:{"\n"}
                • User identification details (name, email address, role){"\n"}
                • Authentication credentials (securely encrypted){"\n"}
                • Top-view photos of the property uploaded by users{"\n"}
                • Service logs, visit records, and compliance reports{"\n"}
                • Customer and location identifiers related to inspections{"\n\n"}
                Purpose of Processing{"\n"}
                All data is processed solely for:{"\n"}
                • User authentication and access control{"\n"}
                • Performing and documenting pest control services{"\n"}
                • Generating inspection and compliance reports{"\n"}
                • Meeting regulatory and contractual obligations{"\n"}
                • Ensuring system security and operational integrity{"\n\n"}
                We do not use data for advertising, tracking, profiling, or marketing purposes.{"\n\n"}
                Data Storage & Security{"\n"}
                All data is stored on secure cloud infrastructure using encrypted
                communications (HTTPS). Access to data is strictly limited to authorized users
                within the same organization and is protected by role-based permissions.{"\n\n"}
                Data Sharing{"\n"}
                Personal data is not sold, rented, or shared with third parties.
                Data may be processed by infrastructure providers solely for hosting
                and technical operation purposes.{"\n\n"}
                User Rights{"\n"}
                Users have the right to access, correct, or request deletion of their data
                in accordance with the General Data Protection Regulation (GDPR).
                Such requests must be made through the organization administering access
                to the application.{"\n\n"}
                By using this application, you acknowledge and accept this Privacy Policy.{"\n\n"}
                For full legal details or privacy-related inquiries, contact:{"\n"}
                info@pest-free.gr
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowPrivacy(false)}
          >
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={showTerms} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Terms of Use</Text>
          
          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <View style={styles.modalTextContainer}>
              <Text style={styles.modalText}>
                Terms of Use – Pest-Free{"\n\n"}
                Pest-Free is a professional business-to-business application provided for
                authorized use in pest control operations, inspections, and reporting.{"\n\n"}
                Authorized Use{"\n"}
                This application may only be used by individuals who have been granted
                explicit authorization by their organization. Unauthorized access or use
                is strictly prohibited.{"\n\n"}
                User Responsibilities{"\n"}
                Users are responsible for:{"\n"}
                • Maintaining the confidentiality of their login credentials{"\n"}
                • Ensuring the accuracy and completeness of submitted data{"\n"}
                • Using the application only for lawful and professional purposes{"\n"}
                • Complying with applicable laws, regulations, and internal company policies{"\n\n"}
                Accuracy of Data{"\n"}
                All inspection data, reports, photos, and records entered into the application
                are the responsibility of the user and their organization.{"\n\n"}
                Availability{"\n"}
                The application is provided "as is" and "as available".
                While reasonable efforts are made to ensure reliability, uninterrupted
                availability is not guaranteed.{"\n\n"}
                Limitation of Liability{"\n"}
                Pest-Free shall not be liable for:{"\n"}
                • Incorrect or incomplete data entered by users{"\n"}
                • Operational or business decisions made based on application data{"\n"}
                • Misuse of the application or violation of these terms{"\n"}
                • Service interruptions beyond reasonable technical control{"\n\n"}
                Account Management{"\n"}
                Access to the application may be suspended or revoked at any time
                for security, compliance, or operational reasons.{"\n\n"}
                Governing Law{"\n"}
                Use of this application is governed by the laws of Greece and
                applicable European Union regulations.{"\n\n"}
                By using this application, you agree to these Terms of Use.{"\n\n"}
                For questions regarding usage or access, contact:{"\n"}
                info@pest-free.gr
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowTerms(false)}
          >
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  backgroundOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  loginContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 180,
    height: 100,
    marginBottom: 30,
  },
  loginInput: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  loginButton: {
    width: "100%",
    backgroundColor: "#1f9c8d",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  // Updated footer links styling - centered and moved up
  footerLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40, // Increased margin to move it higher up
    paddingHorizontal: 20,
  },
  footerText: {
    color: "#fff",
    textDecorationLine: "underline",
    fontSize: 13,
  },
  footerSeparator: {
    color: "#fff",
    marginHorizontal: 8,
    fontSize: 13,
  },
  modalContainer: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  modalContent: {
    flex: 1,
  },
  modalTextContainer: {
    maxWidth: 520,
    alignSelf: "center",
    width: "100%",
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#333",
    textAlign: "left",
  },
  modalCloseButton: {
    padding: 16,
    backgroundColor: "#1f9c8d",
    borderRadius: 10,
    marginVertical: 16,
    alignItems: "center",
  },
  modalCloseText: {
    color: "#fff",
    fontWeight: "bold",
  },
});