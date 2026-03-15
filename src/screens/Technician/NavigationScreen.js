// NavigationScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import i18n from "../../services/i18n";

export default function NavigationScreen({ customer, technician, onBack, onNavigateToMap }) {
  const [loading, setLoading] = useState(false);

  const openNavigationApp = (appType) => {
    if (!customer || !customer.address) {
      Alert.alert(
        i18n.t("technician.navigation.errors.noAddress"),
        i18n.t("technician.navigation.errors.noAddressMessage")
      );
      return;
    }

    const encodedAddress = encodeURIComponent(customer.address);
    let url = "";

    switch (appType) {
      case "google-maps":
        url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
        break;
      case "apple-maps":
        url = `http://maps.apple.com/?daddr=${encodedAddress}&dirflg=d`;
        break;
      case "waze":
        url = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
        break;
      default:
        url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    }

    setLoading(true);
    Linking.openURL(url)
      .then(() => {
        setTimeout(() => setLoading(false), 1000);
      })
      .catch((err) => {
        setLoading(false);
        Alert.alert(
          i18n.t("common.error"),
          i18n.t("technician.navigation.errors.appNotInstalled")
        );
      });
  };

  const quickNavigate = () => {
    Alert.alert(
      i18n.t("technician.navigation.quickNav.chooseApp"),
      i18n.t("technician.navigation.quickNav.prompt", { name: customer.customerName }),
      [
        {
          text: i18n.t("technician.navigation.apps.googleMaps.name"),
          onPress: () => openNavigationApp("google-maps"),
        },
        {
          text: i18n.t("technician.navigation.apps.waze.name"),
          onPress: () => openNavigationApp("waze"),
        },
        {
          text: i18n.t("technician.navigation.apps.appleMaps.name"),
          onPress: () => openNavigationApp("apple-maps"),
        },
        {
          text: i18n.t("common.cancel"),
          style: "cancel",
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← {i18n.t("technician.common.back")}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{i18n.t("technician.navigation.title")}</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Customer Info */}
        <View style={styles.customerCard}>
          <Text style={styles.customerName}>{customer.customerName}</Text>
          <Text style={styles.customerId}>{i18n.t("technician.navigation.customerInfo.id", { id: customer.customerId })}</Text>
          
          <View style={styles.addressSection}>
            <Text style={styles.sectionLabel}>{i18n.t("technician.navigation.customerInfo.address")}</Text>
            <Text style={styles.address}>{customer.address || i18n.t("technician.common.noAddress")}</Text>
          </View>

          <View style={styles.technicianSection}>
            <Text style={styles.sectionLabel}>{i18n.t("technician.navigation.customerInfo.technician")}</Text>
            <Text style={styles.technicianName}>
              {technician.firstName} {technician.lastName}
            </Text>
          </View>
        </View>

        {/* Quick Navigation Button */}
        <TouchableOpacity
          style={styles.quickNavButton}
          onPress={quickNavigate}
          disabled={loading || !customer.address}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.navIcon}>📍</Text>
              <Text style={styles.quickNavText}>
                {customer.address 
                  ? i18n.t("technician.navigation.quickNav.button")
                  : i18n.t("technician.navigation.quickNav.noAddress")}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Navigation Apps */}
        <Text style={styles.sectionTitle}>{i18n.t("technician.navigation.quickNav.chooseApp")}</Text>
        
        <TouchableOpacity
          style={[styles.appButton, styles.googleMapsButton]}
          onPress={() => openNavigationApp("google-maps")}
          disabled={!customer.address}
        >
          <Text style={styles.appIcon}>🗺️</Text>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>{i18n.t("technician.navigation.apps.googleMaps.name")}</Text>
            <Text style={styles.appDescription}>{i18n.t("technician.navigation.apps.googleMaps.description")}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.appButton, styles.wazeButton]}
          onPress={() => openNavigationApp("waze")}
          disabled={!customer.address}
        >
          <Text style={styles.appIcon}>🚗</Text>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>{i18n.t("technician.navigation.apps.waze.name")}</Text>
            <Text style={styles.appDescription}>{i18n.t("technician.navigation.apps.waze.description")}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.appButton, styles.appleMapsButton]}
          onPress={() => openNavigationApp("apple-maps")}
          disabled={!customer.address}
        >
          <Text style={styles.appIcon}>🍎</Text>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>{i18n.t("technician.navigation.apps.appleMaps.name")}</Text>
            <Text style={styles.appDescription}>{i18n.t("technician.navigation.apps.appleMaps.description")}</Text>
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {onNavigateToMap && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onNavigateToMap}
            >
              <Text style={styles.secondaryButtonText}>{i18n.t("technician.navigation.mapScreen.button")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>{i18n.t("technician.navigation.tips.title")}</Text>
          <Text style={styles.tip}>{i18n.t("technician.navigation.tips.tip1")}</Text>
          <Text style={styles.tip}>{i18n.t("technician.navigation.tips.tip2")}</Text>
          <Text style={styles.tip}>{i18n.t("technician.navigation.tips.tip3")}</Text>
          <Text style={styles.tip}>{i18n.t("technician.navigation.tips.tip4")}</Text>
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
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: "#1f9c8d",
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    flex: 1,
  },
  customerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  customerId: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  addressSection: {
    marginBottom: 16,
  },
  technicianSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  sectionLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    marginBottom: 4,
  },
  address: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
  },
  technicianName: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  quickNavButton: {
    backgroundColor: "#1f9c8d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 25,
  },
  navIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  quickNavText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  appButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  googleMapsButton: {
    borderLeftWidth: 4,
    borderLeftColor: "#4285F4",
  },
  wazeButton: {
    borderLeftWidth: 4,
    borderLeftColor: "#3333CC",
  },
  appleMapsButton: {
    borderLeftWidth: 4,
    borderLeftColor: "#000",
  },
  appIcon: {
    fontSize: 28,
    marginRight: 15,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  appDescription: {
    fontSize: 14,
    color: "#666",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 30,
  },
  secondaryButton: {
    backgroundColor: "#6c757d",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  tipsContainer: {
    backgroundColor: "#f0f9f8",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f9c8d",
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f9c8d",
    marginBottom: 10,
  },
  tip: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
    lineHeight: 20,
  },
});