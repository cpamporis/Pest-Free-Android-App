import React from "react";
import {
  ActivityIndicator,
  Modal as NativeModal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useAdminSession } from "../security/AdminSessionContext";

function formatRemaining(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const minuteText = String(minutes).padStart(2, "0");
  const secondText = String(seconds).padStart(2, "0");

  return hours > 0
    ? hours + ":" + minuteText + ":" + secondText
    : minuteText + ":" + secondText;
}

export function AdminSessionTimer() {
  const {
    session,
    remainingSeconds,
    refreshing,
    refreshError,
    refreshAdminSession
  } = useAdminSession();

  if (!session) {
    return null;
  }

  const urgent = remainingSeconds <= 60;
  const warning = !urgent && remainingSeconds <= 300;

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={
          "Session " + formatRemaining(remainingSeconds) +
          ". Press to refresh the session."
        }
        accessibilityHint={
          refreshError
            ? "The last refresh failed. Session time continues."
            : "Refreshes the 15-minute access window."
        }
        disabled={refreshing || remainingSeconds === 0}
        hitSlop={6}
        onPress={refreshAdminSession}
        style={[
          styles.timer,
          warning && styles.warning,
          urgent && styles.urgent,
          refreshError && styles.refreshError,
          refreshing && styles.disabled
        ]}
      >
        {refreshing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <MaterialIcons name="refresh" size={17} color="#fff" />
        )}

        <Text
          accessibilityLiveRegion="polite"
          style={styles.timerText}
        >
          {formatRemaining(remainingSeconds)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function ProtectedAdminSurface({ children }) {
  return <View style={styles.surface}>{children}</View>;
}

export function ProtectedAdminModal({ children, ...modalProps }) {
  return (
    <NativeModal {...modalProps}>
      <ProtectedAdminSurface>
        {children}
      </ProtectedAdminSurface>
    </NativeModal>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1
  },
  container: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  timer: {
    minWidth: 76,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  warning: {
    backgroundColor: "#b26a00"
  },
  urgent: {
    backgroundColor: "#b42318"
  },
  refreshError: {
    backgroundColor: "#b42318"
  },
  disabled: {
    opacity: 0.8
  },
  timerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    marginLeft: 5
  }
});
