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
import i18n from "../services/i18n";
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
  const [currentLanguage, setCurrentLanguage] = useState(i18n.getLocale()); // Use getter

  const changeLanguage = (lang) => {
    i18n.setLocale(lang);
    setCurrentLanguage(i18n.getLocale()); // Update state with getter
  };

  const tryLogin = async () => {
    if (!email || !password) {
      Alert.alert(i18n.t("login.error.title"), i18n.t("login.error.enterEmailAndPassword"));
      return;
    }

    const result = await apiService.login(email, password);

    if (!result || !result.success) {
      Alert.alert(i18n.t("login.error.loginFailed"));
      setPassword("");
      return;
    }

    if (result.role === "admin" || result.role === "super_admin") {
      await apiService.setAuthToken(result.token);
      onAdminLogin(result.role); 
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

    Alert.alert(i18n.t("login.error.loginFailed"));
    setPassword("");
  };

  return (
    <View style={styles.loginContainer}>
      <Image source={loginBackground} style={styles.backgroundImage} />
      <View style={styles.backgroundOverlay} />

      <View style={styles.loginContent}>
        <Image source={pestfreeLogo} style={styles.logo} resizeMode="contain" />

        {/* Language selector buttons */}
        <View style={styles.languageSelector}>
          <TouchableOpacity
            style={[
              styles.languageButton,
              currentLanguage === 'en' && styles.languageButtonActive
            ]}
            onPress={() => changeLanguage('en')}
          >
            <Text style={[
              styles.languageButtonText,
              currentLanguage === 'en' && styles.languageButtonTextActive
            ]}>
              {i18n.t("language.en")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.languageButton,
              currentLanguage === 'gr' && styles.languageButtonActive
            ]}
            onPress={() => changeLanguage('gr')}
          >
            <Text style={[
              styles.languageButtonText,
              currentLanguage === 'gr' && styles.languageButtonTextActive
            ]}>
              {i18n.t("language.gr")}
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.loginInput}
          placeholder={i18n.t("login.emailPlaceholder")}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.loginInput}
          placeholder={i18n.t("login.passwordPlaceholder")}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.loginButton} onPress={tryLogin}>
          <Text style={styles.loginButtonText}>{i18n.t("login.loginButton")}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{ marginTop: 14 }}
          onPress={onPasswordRecovery}
        >
          <Text style={{ color: "#fff", textDecorationLine: "underline" }}>
            {i18n.t("login.forgotPassword")}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => setShowPrivacy(true)}>
            <Text style={styles.footerText}>{i18n.t("login.privacyPolicy")}</Text>
          </TouchableOpacity>

          <Text style={styles.footerSeparator}>|</Text>

          <TouchableOpacity onPress={() => setShowTerms(true)}>
            <Text style={styles.footerText}>{i18n.t("login.termsOfUse")}</Text>
          </TouchableOpacity>
        </View>
      </View>
      

      <Modal visible={showPrivacy} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{i18n.t("privacyPolicy.title")}</Text>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <View style={styles.modalTextContainer}>
              <Text style={styles.modalText}>
                {i18n.t("privacyPolicy.content")}
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowPrivacy(false)}
          >
            <Text style={styles.modalCloseText}>{i18n.t("privacyPolicy.closeButton")}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={showTerms} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{i18n.t("termsOfUse.title")}</Text>
          
          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <View style={styles.modalTextContainer}>
              <Text style={styles.modalText}>
                {i18n.t("termsOfUse.content")}
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowTerms(false)}
          >
            <Text style={styles.modalCloseText}>{i18n.t("termsOfUse.closeButton")}</Text>
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
  footerLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
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
  bold: {
    fontWeight: "bold",
  },
  modalCloseText: {
    color: "#fff",
    fontWeight: "bold",
  },
  // New styles for language selector
  languageSelector: {
    flexDirection: "row",
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: 2,
  },
  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  languageButtonActive: {
    backgroundColor: "#1f9c8d",
  },
  languageButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  languageButtonTextActive: {
    color: "#fff",
  },
});