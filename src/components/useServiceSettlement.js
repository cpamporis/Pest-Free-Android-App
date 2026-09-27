import React, { useEffect, useRef, useState } from "react";
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import apiService from "../services/apiService";
import i18n from "../services/i18n";

// One prompt per completion attempt. The server computes the amount; technicians
// cannot post an arbitrary amount or collect a different customer's debt.
export default function useServiceSettlement(session) {
  const [open, setOpen] = useState(false);
  const resolver = useRef(null);
  const alive = useRef(true);
  const busy = useRef(false);
  const pendingChoice = useRef(undefined);
  useEffect(() => { alive.current = true; return () => { alive.current = false; resolver.current?.(null); }; }, []);
  function answer(value) { setOpen(false); resolver.current?.(value); resolver.current = null; }
  async function confirmPayment() {
    if (busy.current) return null;
    busy.current = true;
    try {
      if (session?.status === "completed") return {};
      if (!session?.appointmentId) throw new Error(i18n.t("business.appointmentRequired"));
      const capabilities = await apiService.getBusinessCapabilities();
      if (!alive.current) { busy.current = false; return null; }
      if (!capabilities?.success || !capabilities.enabled) throw new Error(i18n.t("business.unavailable"));
      if (pendingChoice.current !== undefined) return { paymentReceived: pendingChoice.current };
      const choice = await new Promise(resolve => {
        resolver.current = resolve;
        if (Platform.OS === "web") { resolver.current = resolve; setOpen(true); }
        else Alert.alert(i18n.t("business.paymentQuestion"), i18n.t("business.paymentHelp"), [
          { text: i18n.t("business.no"), onPress: () => resolve(false) },
          { text: i18n.t("business.yes"), onPress: () => resolve(true) },
          { text: i18n.t("business.cancel"), style: "cancel", onPress: () => resolve(null) }
        ], { cancelable: true, onDismiss: () => resolve(null) });
      });
      if (choice === null) { busy.current = false; return null; }
      pendingChoice.current = choice;
      return { paymentReceived: choice };
    } catch (error) {
      busy.current = false;
      if (Platform.OS === "web") window.alert(error.message);
      else Alert.alert(i18n.t("common.error"), error.message);
      return null;
    }
  }
  function finishPaymentAttempt() { busy.current = false; }
  const paymentDialog = Platform.OS !== "web" ? null : <Modal transparent visible={open} onRequestClose={() => answer(null)}>
    <View style={styles.shade}><View style={styles.card} accessibilityViewIsModal>
      <Text style={styles.title}>{i18n.t("business.paymentQuestion")}</Text>
      <Text style={styles.help}>{i18n.t("business.paymentHelp")}</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => answer(false)} style={styles.no}><Text>{i18n.t("business.no")}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => answer(true)} style={styles.yes}><Text style={{ color: "#fff" }}>{i18n.t("business.yes")}</Text></Pressable>
      </View>
      <Pressable accessibilityRole="button" onPress={() => answer(null)} style={styles.cancel}><Text>{i18n.t("business.cancel")}</Text></Pressable>
    </View></View>
  </Modal>;
  return { confirmPayment, finishPaymentAttempt, paymentDialog };
}
const styles = StyleSheet.create({
  shade: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { maxWidth: 460, width: "100%", padding: 24, borderRadius: 16, backgroundColor: "#fff" },
  title: { fontSize: 19, lineHeight: 27, fontWeight: "600", color: "#193d36" },
  help: { fontSize: 15, lineHeight: 22, color: "#51625e", marginVertical: 16 },
  actions: { flexDirection: "row", gap: 12 },
  no: { flex: 1, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#b9c9c4", borderRadius: 8 },
  yes: { flex: 1, padding: 14, alignItems: "center", backgroundColor: "#147d69", borderRadius: 8 },
  cancel: { alignItems: "center", padding: 14, marginTop: 8 }
});
