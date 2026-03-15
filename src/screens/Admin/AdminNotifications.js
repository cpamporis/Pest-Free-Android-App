//Admin/AdminNotifications.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import apiService from "../../services/apiService";
import { buildComplianceNotifications } from "../../utils/complianceNotifications";
import styles from "./AdminNotifications.styles";
import { Image } from "react-native"; 
import pestfreeLogo from "../../../assets/pestfree_logo.png"; 
import i18n from "../../services/i18n";

export default function AdminNotifications({ onClose, onOpenSchedule }) {
  const [loading, setLoading] = useState(true);
  const [expiring, setExpiring] = useState([]);
  const [expired, setExpired] = useState([]);
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const customers = await apiService.getCustomers();
      
      const { expiring, expired } = buildComplianceNotifications(customers);
      
      setExpiring(expiring);
      setExpired(expired);
    } catch (error) {
      console.error("❌ Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = (customerId) => {
    onClose();
    onOpenSchedule(customerId);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f9c8b" />
        <Text style={styles.loadingText}>{i18n.t("admin.notifications.loading")}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER - Now part of the scrollable content */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandContainer}>
              <Image source={pestfreeLogo} style={styles.logo} resizeMode="contain" />
              <View style={styles.adminBadge}>
                <MaterialIcons name="notifications-active" size={14} color="#fff" />
                <Text style={styles.adminBadgeText}>{i18n.t("admin.notifications.header.badge")}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>{i18n.t("admin.notifications.header.welcome")}</Text>
            <Text style={styles.title}>{i18n.t("admin.notifications.header.title")}</Text>
            <Text style={styles.subtitle}>
              {i18n.t("admin.notifications.header.subtitle")}
            </Text>
          </View>
        </View>

        {/* MAIN CONTENT */}
        <View style={styles.contentContainer}>
          {/* ACTIVE ALERTS SECTION */}
          {expiring.length === 0 && expired.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="check-circle" size={64} color="#1f9c8b" />
              <Text style={styles.emptyTitle}>{i18n.t("admin.notifications.emptyState.title")}</Text>
              <Text style={styles.emptyText}>
                {i18n.t("admin.notifications.emptyState.text")}
              </Text>
            </View>
          ) : (
            <>
              {/* EXPIRING SOON CARDS */}
              {expiring.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <MaterialIcons name="warning" size={20} color="#2c3e50" />
                    <Text style={styles.sectionTitle}>
                      {i18n.t("admin.notifications.sections.expiringSoon", { count: expiring.length })}
                    </Text>
                  </View>
                  <Text style={styles.sectionHint}>
                    {i18n.t("admin.notifications.hints.expiring")}
                  </Text>

                  <View style={styles.cardsContainer}>
                    {expiring.map(n => (
                      <View key={n.customerId} style={styles.notificationCard}>
                        <View style={styles.cardHeader}>
                          <View style={styles.customerInfo}>
                            <View style={styles.customerIcon}>
                              <MaterialIcons name="person" size={18} color="#1f9c8b" />
                            </View>
                            <Text style={styles.customerName}>{n.customerName}</Text>
                          </View>
                          <View style={styles.statusBadge}>
                            <MaterialIcons name="schedule" size={14} color="#fff" />
                            <Text style={styles.statusText}>
                              {n.daysRemaining} {n.daysRemaining === 1 ? i18n.t("common.days_one") : i18n.t("common.days_other")}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cardContent}>
                          <View style={styles.detailRow}>
                            <MaterialIcons name="calendar-today" size={16} color="#666" />
                            <Text style={styles.detailText}>
                              {i18n.t("admin.notifications.cards.validUntil", { 
                                date: n.validUntil.toLocaleDateString("en-GB") 
                              })}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <MaterialIcons name="timer" size={16} color="#666" />
                            <Text style={styles.detailText}>
                              {i18n.t("admin.notifications.cards.expiresIn", { 
                                count: n.daysRemaining,
                                days: n.daysRemaining === 1 ? i18n.t("common.days_one") : i18n.t("common.days_other")
                              })}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={styles.primaryButton}
                          onPress={() => handleSchedule(n.customerId)}
                        >
                          <MaterialIcons name="event" size={18} color="#fff" />
                          <Text style={styles.primaryButtonText}>{i18n.t("admin.notifications.cards.scheduleButton")}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* EXPIRED SECTION */}
              {expired.length > 0 && (
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.expandedHeader}
                    onPress={() => setShowExpired(prev => !prev)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sectionHeader}>
                      <MaterialIcons name="error" size={20} color="#2c3e50" />
                      <Text style={styles.sectionTitle}>
                        {i18n.t("admin.notifications.sections.expired", { count: expired.length })}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={showExpired ? "expand-less" : "expand-more"}
                      size={24}
                      color="#333"
                    />
                  </TouchableOpacity>

                  {showExpired && (
                    <>
                      <Text style={styles.expiredHint}>
                        {i18n.t("admin.notifications.hints.expired")}
                      </Text>

                      <View style={styles.cardsContainer}>
                        {expired.map(c => (
                          <View key={c.customerId} style={[styles.notificationCard, styles.expiredCard]}>
                            <View style={styles.cardHeader}>
                              <View style={styles.customerInfo}>
                                <View style={[styles.customerIcon, { backgroundColor: "#f7f8fa" }]}>
                                  <MaterialIcons name="person-off" size={18} color="#1f9c8b" />
                                </View>
                                <Text style={styles.customerName}>{c.customerName}</Text>
                              </View>
                              <View style={[styles.statusBadge, { backgroundColor: '#1f9c8b' }]}>
                                <MaterialIcons name="block" size={14} color="#fff" />
                                <Text style={styles.statusText}>{i18n.t("admin.notifications.status.expired")}</Text>
                              </View>
                            </View>

                            <View style={styles.cardContent}>
                              <View style={styles.detailRow}>
                                <MaterialIcons name="calendar-today" size={16} color="#666" />
                                <Text style={styles.detailText}>
                                  {i18n.t("admin.notifications.cards.expiredOn", { 
                                    date: c.expiredOn.toLocaleDateString("en-GB") 
                                  })}
                                </Text>
                              </View>
                            </View>

                            <TouchableOpacity
                              style={styles.primaryButton}
                              onPress={() => handleSchedule(c.customerId)}
                            >
                              <MaterialIcons name="event" size={18} color="#fff" />
                              <Text style={styles.primaryButtonText}>{i18n.t("admin.notifications.cards.scheduleButton")}</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </View>
              )}
            </>
          )}

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{i18n.t("admin.notifications.footer.system")}</Text>
            <Text style={styles.footerSubtext}>
              {i18n.t("admin.notifications.footer.version", { date: new Date().toLocaleDateString() })}
            </Text>
            <Text style={styles.footerCopyright}>
              {i18n.t("admin.notifications.footer.copyright", { year: new Date().getFullYear() })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}