import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ProtectedAdminModal as Modal } from "./AdminSessionTimer";
import apiService from "../services/apiService";
import i18n from "../services/i18n";
import { formatCents, newPaymentReference, parseAmountCents } from "../utils/customerBilling";

export function CustomerBalanceBadge({ cents }) {
  if (!(Number(cents) > 0)) return null;
  return <Text style={styles.balance}>{i18n.t("business.balance")}: €{formatCents(cents)}</Text>;
}
export default function CustomerBalancePanel({ customerId, onPaymentRecorded }) {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const inFlight = useRef(false);
  const storageKey = `@pestify:pending-payment:${customerId}`;
  async function reload() {
    const result = await apiService.getCustomerAccount(customerId);
    if (!result?.success) throw new Error(result?.error || i18n.t("business.loadFailed"));
    setAccount(result);
    return result;
  }
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await apiService.getCustomerAccount(customerId);
        if (!result?.success) throw new Error(i18n.t("business.loadFailed"));
        const stored = await AsyncStorage.getItem(storageKey);
        if (!active) return;
        setAccount(result);
        if (stored) { const intent = JSON.parse(stored); setPending(intent); setAmount(intent.amount); }
      } catch (e) { if (active) setError(e.message); }
    })();
    return () => { active = false; };
  }, [customerId]);
  async function submit() {
    if (inFlight.current || !account) return;
    const entered = parseAmountCents(amount);
    if (!pending && (!entered || entered > account.balanceCents)) { setError(i18n.t("business.invalidAmount")); return; }
    inFlight.current = true; setBusy(true); setError("");
    try {
      const intent = pending || { amount: formatCents(entered), idempotencyKey: newPaymentReference(), expectedBalanceCents: account.balanceCents };
      // Keep the same intent across network failures, screen changes and app restarts.
      await AsyncStorage.setItem(storageKey, JSON.stringify(intent));
      setPending(intent);
      const result = await apiService.recordCustomerPayment(customerId, intent);
      if (!result?.success) {
        // A rejected transaction wrote no payment. Refresh its stale balance;
        // uncertain network/server failures keep the same durable reference.
        if ([400, 409].includes(result?.status)) {
          await AsyncStorage.removeItem(storageKey);
          setPending(null);
          await reload();
        }
        throw new Error(result?.error || i18n.t("business.paymentFailed"));
      }
      await AsyncStorage.removeItem(storageKey);
      setPending(null); setAmount("");
      await reload();
      onPaymentRecorded?.();
      setOpen(false);
    } catch (e) { setError(e.message || i18n.t("business.paymentFailed")); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <View style={styles.panel}>
    {account ? <>
      {account.balanceCents > 0 || pending ? <Pressable accessibilityRole="button" onPress={() => { setError(""); setOpen(true); }}>
        <CustomerBalanceBadge cents={account.balanceCents} />
        <Text style={styles.link}>{i18n.t(pending ? "business.retryPending" : "business.recordPayment")}</Text>
      </Pressable> : <Text style={styles.help}>{i18n.t("business.noBalance")}</Text>}
    </> : error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color="#147d69" />}
    <Modal transparent visible={open} onRequestClose={() => { if (!busy) setOpen(false); }}>
      <View style={styles.shade}><View style={styles.card}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{i18n.t("business.recordPayment")}</Text>
          <CustomerBalanceBadge cents={account?.balanceCents} />
          <Text style={styles.help}>{i18n.t("business.allocationHelp")}</Text>
          {pending && <Text style={styles.help}>{i18n.t("business.pendingHelp")}</Text>}
          <Text style={styles.label}>{i18n.t("business.amountReceived")}</Text>
          <TextInput accessibilityLabel={i18n.t("business.amountReceived")} value={amount}
            onChangeText={setAmount} keyboardType="decimal-pad" editable={!busy && !pending} style={styles.input} />
          {!pending && <Pressable accessibilityRole="button" disabled={busy} onPress={() => setAmount(formatCents(account?.balanceCents))}>
            <Text style={styles.link}>{i18n.t("business.fullBalance")}</Text>
          </Pressable>}
          {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
          <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={styles.save}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{i18n.t(pending ? "business.retryPending" : "business.confirmPayment")}</Text>}
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => setOpen(false)} style={styles.cancel}><Text>{i18n.t("business.close")}</Text></Pressable>
          <Text style={styles.label}>{i18n.t("business.recentPayments")}</Text>
          {(account?.payments || []).map(p => <Text key={p.id} style={styles.help}>
            {new Date(p.receivedAt).toLocaleString()} · €{formatCents(p.amountCents)}
          </Text>)}
        </ScrollView>
      </View></View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  panel: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginVertical: 12 },
  balance: { color: "#bb2638", fontSize: 16, fontWeight: "700", marginVertical: 6 },
  title: { fontSize: 20, color: "#263c39", fontWeight: "700", marginBottom: 12 },
  label: { fontSize: 15, fontWeight: "600", marginTop: 16, color: "#263c39" },
  help: { fontSize: 13, lineHeight: 20, color: "#52635f", marginTop: 6 },
  link: { color: "#147d69", fontWeight: "600", paddingVertical: 10 },
  input: { borderWidth: 1, borderColor: "#b9c9c4", borderRadius: 8, padding: 14, fontSize: 18, marginTop: 8, color: "#193d36" },
  shade: { flex: 1, padding: 20, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  card: { width: "100%", maxWidth: 500, maxHeight: "85%", borderRadius: 16, backgroundColor: "#fff", padding: 22 },
  save: { backgroundColor: "#147d69", padding: 15, borderRadius: 8, alignItems: "center", marginTop: 16 },
  saveText: { color: "#fff", fontWeight: "600" },
  cancel: { padding: 14, alignItems: "center" },
  error: { color: "#bb2638", fontSize: 14, lineHeight: 21, marginVertical: 10 }
});
