//screens/PasswordRecovery.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // Updated import
import { MaterialIcons } from '@expo/vector-icons';
import apiService from "../services/apiService";
import pestfreeLogo from "../../assets/pestfree_logo.png";
import i18n from "../services/i18n";

export default function PasswordRecovery({ onBack, onDone }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submitRecovery = async () => {
    if (!email) {
      Alert.alert(
        i18n.t("common.error"), 
        i18n.t("passwordRecovery.errors.noEmail")
      );
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert(
        i18n.t("common.error"), 
        i18n.t("passwordRecovery.errors.invalidEmail")
      );
      return;
    }

    setLoading(true);
    
    try {
      const result = await apiService.submitPasswordRecovery(email);

      if (!result?.success) {
        Alert.alert(
          i18n.t("common.error"), 
          result?.error || i18n.t("passwordRecovery.errors.submitFailed")
        );
        return;
      }

      Alert.alert(
        i18n.t("passwordRecovery.success.title"),
        i18n.t("passwordRecovery.success.message"),
        [
          {
            text: i18n.t("common.ok") || "OK",
            onPress: onDone
          }
        ]
      );
    } catch (error) {
      console.error("Password recovery error:", error);
      Alert.alert(
        i18n.t("common.error"), 
        i18n.t("passwordRecovery.errors.unexpected")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <Image source={pestfreeLogo} style={styles.logo} resizeMode="contain" />
            <View style={styles.adminBadge}>
              <MaterialIcons name="lock-reset" size={14} color="#fff" />
              <Text style={styles.adminBadgeText}>{i18n.t("passwordRecovery.badge")}</Text>
            </View>
          </View>
        </View>

        {/* CONTENT */}
        <View style={styles.contentContainer}>
          <View style={styles.formCard}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="lock-reset" size={48} color="#1f9c8b" />
            </View>
            
            <Text style={styles.title}>{i18n.t("passwordRecovery.title")}</Text>
            
            <Text style={styles.subtitle}>
              {i18n.t("passwordRecovery.subtitle")}
            </Text>
            
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{i18n.t("passwordRecovery.emailLabel")}</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={i18n.t("passwordRecovery.emailPlaceholder")}
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                />
              </View>
            </View>
            
            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.button, loading && styles.disabledButton]} 
              onPress={submitRecovery}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="send" size={18} color="#fff" />
                  <Text style={styles.buttonText}>{i18n.t("passwordRecovery.submitButton")}</Text>
                </>
              )}
            </TouchableOpacity>
            
            {/* Back Link */}
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={onBack}
              disabled={loading}
            >
              <MaterialIcons name="arrow-back" size={18} color="#1f9c8b" />
              <Text style={styles.backText}>{i18n.t("passwordRecovery.backButton")}</Text>
            </TouchableOpacity>
          </View>
          
          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{i18n.t("passwordRecovery.footer.help")}</Text>
            <Text style={styles.footerSubtext}>
              {i18n.t("passwordRecovery.footer.contact")}
            </Text>
            <Text style={styles.footerCopyright}>
              {i18n.t("passwordRecovery.footer.copyright", { year: new Date().getFullYear() })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  
  // HEADER
  header: {
    backgroundColor: "#1f9c8b",
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 120,
    height: 50,
    marginRight: 10,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  adminBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
    fontFamily: 'System',
  },
  
  // CONTENT
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    marginBottom: 24,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 12,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
    fontFamily: 'System',
  },
  
  // INPUT
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
    fontFamily: 'System',
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#333",
    fontFamily: 'System',
  },
  
  // BUTTONS
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f9c8b",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'System',
  },
  disabledButton: {
    backgroundColor: "#cccccc",
    opacity: 0.7,
  },
  
  // BACK BUTTON
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  backText: {
    fontSize: 14,
    color: "#1f9c8b",
    fontWeight: "500",
    fontFamily: 'System',
  },
  
  // FOOTER
  footer: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
    fontFamily: 'System',
  },
  footerSubtext: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
    fontFamily: 'System',
  },
  footerCopyright: {
    fontSize: 11,
    color: "#aaa",
    fontFamily: 'System',
  },
});