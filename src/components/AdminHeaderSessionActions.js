import React from "react";
import {
  StyleSheet,
  View
} from "react-native";

import { AdminSessionTimer } from "./AdminSessionTimer";

export default function AdminHeaderSessionActions({
  children,
  style
}) {
  return (
    <View style={[styles.actions, style]}>
      <AdminSessionTimer inline headerAction />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexShrink: 0
  }
});
