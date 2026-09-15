import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import apiService from "../services/apiService";

const { initialMfaStep } = require(
  "../security/adminMfaUiPolicy"
);

function errorMessage(result) {
  const remaining =
    result?.attemptsRemaining ??
    result?.data?.attemptsRemaining;
  const base = result?.error || "Η ενέργεια MFA απέτυχε.";

  return Number.isInteger(remaining)
    ? `${base} Απομένουν ${remaining} προσπάθειες.`
    : base;
}

export default function MFAScreen({
  flow,
  onAuthenticated,
  onCancel
}) {
  const [step, setStep] = useState(() => initialMfaStep(flow));
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState("");
  const [pendingAuthentication, setPendingAuthentication] =
    useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSkip = flow?.canSkipMfa === true;
  const recoveryText = useMemo(
    () =>
      Array.isArray(pendingAuthentication?.recoveryCodes)
        ? pendingAuthentication.recoveryCodes.join("\n")
        : "",
    [pendingAuthentication]
  );

  const run = async operation => {
    if (busy) {
      return null;
    }

    setBusy(true);
    setError("");

    try {
      return await operation();
    } catch {
      setError("Δεν ήταν δυνατή η ολοκλήρωση της ενέργειας.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const startEnrollment = async () => {
    const result = await run(() =>
      apiService.startMfaEnrollment(flow.challengeToken)
    );

    if (!result) {
      return;
    }

    if (!result.success) {
      setError(errorMessage(result));
      return;
    }

    if (
      typeof result.secret !== "string" ||
      typeof result.otpauthUri !== "string"
    ) {
      setError("Ο διακομιστής επέστρεψε μη έγκυρα στοιχεία MFA.");
      return;
    }

    setEnrollment(result);
    setCode("");
    setStep("enroll");
  };

  const declineEnrollment = async () => {
    if (!canSkip) {
      return;
    }

    const result = await run(() =>
      apiService.declineMfaEnrollment(flow.challengeToken)
    );

    if (!result) {
      return;
    }

    if (!result.success) {
      setError(errorMessage(result));
      return;
    }

    onAuthenticated(result);
  };

  const confirmEnrollment = async () => {
    const normalizedCode = code.replace(/\s/g, "");

    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("Πληκτρολόγησε τον εξαψήφιο κωδικό της εφαρμογής.");
      return;
    }

    const result = await run(() =>
      apiService.confirmMfaEnrollment(
        flow.challengeToken,
        normalizedCode,
        flow.deviceAccount
      )
    );

    if (!result) {
      return;
    }

    if (!result.success) {
      setError(errorMessage(result));
      return;
    }

    if (
      !Array.isArray(result.recoveryCodes) ||
      result.recoveryCodes.length === 0
    ) {
      setError("Δεν παραδόθηκαν οι κωδικοί ανάκτησης.");
      return;
    }

    setPendingAuthentication(result);
    setCode("");
    setStep("recovery");
  };

  const verifyLogin = async () => {
    const normalizedCode = code.trim();

    if (!normalizedCode) {
      setError("Πληκτρολόγησε κωδικό επαλήθευσης ή ανάκτησης.");
      return;
    }

    const result = await run(() =>
      apiService.verifyMfaLogin(
        flow.challengeToken,
        normalizedCode,
        flow.deviceAccount
      )
    );

    if (!result) {
      return;
    }

    if (!result.success) {
      setError(errorMessage(result));
      setCode("");
      return;
    }

    if (
      result.role === "admin" &&
      result.mfaDeviceStored === false
    ) {
      Alert.alert(
        "Ασφαλής συσκευή",
        "Η σύνδεση πέτυχε, αλλά δεν αποθηκεύτηκε η επαλήθευση 7 ημερών. Στην επόμενη σύνδεση θα ζητηθεί ξανά MFA."
      );
    }

    onAuthenticated(result);
  };

  const openAuthenticator = async () => {
    try {
      await Linking.openURL(enrollment.otpauthUri);
    } catch {
      Alert.alert(
        "Google Authenticator",
        "Δεν άνοιξε αυτόματα. Αντέγραψε το κλειδί και πρόσθεσέ το χειροκίνητα."
      );
    }
  };

  const copyText = async (value, label) => {
    await Clipboard.setStringAsync(value);
    Alert.alert(
      label,
      "Αντιγράφηκε. Μην το αφήσεις στο πρόχειρο περισσότερο από όσο χρειάζεται."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialIcons
              name="security"
              size={38}
              color="#1f9c8b"
            />
          </View>

          {step === "offer" && (
            <>
              <Text style={styles.title}>
                Προστασία λογαριασμού με MFA
              </Text>
              <Text style={styles.body}>
                Σύνδεσε το Google Authenticator ώστε ένας κλεμμένος
                κωδικός πρόσβασης να μην αρκεί για είσοδο.
              </Text>
              <Text style={styles.policyText}>
                Μετά τη ρύθμιση, η επαλήθευση ισχύει για 7 ημέρες
                σε αυτή τη συσκευή.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                disabled={busy}
                onPress={startEnrollment}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Ρύθμιση Google Authenticator
                  </Text>
                )}
              </TouchableOpacity>

              {canSkip ? (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  disabled={busy}
                  onPress={declineEnrollment}
                >
                  <Text style={styles.secondaryButtonText}>
                    Ρύθμιση αργότερα
                  </Text>
                  <Text style={styles.secondaryHint}>
                    Θα εμφανιστεί ξανά σε 30 ημέρες
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}

          {step === "enroll" && enrollment && (
            <>
              <Text style={styles.title}>
                Σύνδεση Google Authenticator
              </Text>
              <Text style={styles.body}>
                Άνοιξε το Authenticator και πρόσθεσε τον λογαριασμό.
                Έπειτα πληκτρολόγησε τον τρέχοντα εξαψήφιο κωδικό.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={openAuthenticator}
              >
                <Text style={styles.primaryButtonText}>
                  Άνοιγμα Authenticator
                </Text>
              </TouchableOpacity>

              <View style={styles.secretBox}>
                <Text style={styles.secretLabel}>Χειροκίνητο κλειδί</Text>
                <Text selectable style={styles.secretValue}>
                  {enrollment.secret}
                </Text>
                <Text style={styles.accountText}>
                  {enrollment.issuer} · {enrollment.accountName}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    copyText(enrollment.secret, "Κλειδί MFA")
                  }
                >
                  <Text style={styles.copyText}>Αντιγραφή κλειδιού</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                accessibilityLabel="Εξαψήφιος κωδικός Authenticator"
                autoComplete="one-time-code"
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={value =>
                  setCode(value.replace(/\D/g, ""))
                }
                placeholder="000000"
                style={styles.codeInput}
                value={code}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                disabled={busy}
                onPress={confirmEnrollment}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Επιβεβαίωση και ενεργοποίηση
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {step === "verify" && (
            <>
              <Text style={styles.title}>Επαλήθευση MFA</Text>
              <Text style={styles.body}>
                Πληκτρολόγησε τον κωδικό Authenticator αυτής της
                στιγμής.
              </Text>
              <TextInput
                accessibilityLabel="Κωδικός MFA ή ανάκτησης"
                autoCapitalize="characters"
                autoComplete="one-time-code"
                onChangeText={setCode}
                placeholder="6ψήφιος ή κωδικός ανάκτησης"
                style={styles.codeInput}
                value={code}
              />
              <TouchableOpacity
                style={styles.primaryButton}
                disabled={busy}
                onPress={verifyLogin}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Επαλήθευση και είσοδος
                  </Text>
                )}
              </TouchableOpacity>
              <Text style={styles.secondaryHint}>
                Μπορείς επίσης να χρησιμοποιήσεις έναν αχρησιμοποίητο
                κωδικό ανάκτησης.
              </Text>
            </>
          )}

          {step === "recovery" && pendingAuthentication && (
            <>
              <Text style={styles.title}>Κωδικοί ανάκτησης</Text>
              <Text style={styles.warningText}>
                Εμφανίζονται μόνο τώρα. Φύλαξέ τους σε ασφαλές μέρος.
                Κάθε κωδικός χρησιμοποιείται μία φορά.
              </Text>
              <Text selectable style={styles.recoveryCodes}>
                {recoveryText}
              </Text>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() =>
                  copyText(recoveryText, "Κωδικοί ανάκτησης")
                }
              >
                <Text style={styles.secondaryButtonText}>
                  Αντιγραφή όλων
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => onAuthenticated(pendingAuthentication)}
              >
                <Text style={styles.primaryButtonText}>
                  Τους αποθήκευσα — είσοδος
                </Text>
              </TouchableOpacity>
            </>
          )}

          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          ) : null}

          {step !== "recovery" ? (
            <TouchableOpacity
              disabled={busy}
              onPress={onCancel}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Ακύρωση σύνδεσης</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eef7f5"
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20
  },
  card: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#e4f4f1",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18
  },
  title: {
    color: "#173b37",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12
  },
  body: {
    color: "#445c59",
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
    marginBottom: 12
  },
  policyText: {
    color: "#176d64",
    backgroundColor: "#eef8f6",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 11,
    backgroundColor: "#1f9c8b",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 12
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center"
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#1f9c8b",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    marginTop: 12
  },
  secondaryButtonText: {
    color: "#176d64",
    fontSize: 15,
    fontWeight: "700"
  },
  secondaryHint: {
    color: "#667a77",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 5
  },
  secretBox: {
    borderWidth: 1,
    borderColor: "#c9dedb",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    backgroundColor: "#f8fbfa"
  },
  secretLabel: {
    color: "#667a77",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  secretValue: {
    color: "#173b37",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 8
  },
  accountText: {
    color: "#667a77",
    fontSize: 12,
    marginTop: 8
  },
  copyText: {
    color: "#176d64",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10
  },
  codeInput: {
    width: "100%",
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#aac8c3",
    borderRadius: 11,
    paddingHorizontal: 14,
    marginTop: 16,
    color: "#173b37",
    backgroundColor: "#fff",
    fontSize: 18,
    letterSpacing: 1.5,
    textAlign: "center"
  },
  warningText: {
    color: "#7a3e00",
    backgroundColor: "#fff4df",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14
  },
  recoveryCodes: {
    color: "#173b37",
    backgroundColor: "#f3f6f5",
    borderRadius: 10,
    padding: 16,
    fontFamily: "monospace",
    fontSize: 16,
    lineHeight: 25,
    textAlign: "center"
  },
  error: {
    color: "#b42318",
    backgroundColor: "#fef0ee",
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
    textAlign: "center"
  },
  cancelButton: {
    alignSelf: "center",
    padding: 12,
    marginTop: 8
  },
  cancelText: {
    color: "#667a77",
    textDecorationLine: "underline"
  }
});
