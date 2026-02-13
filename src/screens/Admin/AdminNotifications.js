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
      console.log("📋 Total customers loaded:", customers.length);
      
      // Debug: Show all customers and their compliance dates
      customers.forEach(c => {
        console.log(`🔍 ${c.customerName}:`, {
          complianceValidUntil: c.complianceValidUntil,
          parsedDate: c.complianceValidUntil ? new Date(c.complianceValidUntil).toISOString().split('T')[0] : 'No date'
        });
      });
      
      const { expiring, expired } = buildComplianceNotifications(customers);
      
      console.log("🔔 Compliance notifications:", {
        expiringCount: expiring.length,
        expiredCount: expired.length,
        totalCustomers: customers.length
      });
      
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
        <Text style={styles.loadingText}>Loading Notifications...</Text>
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
                <Text style={styles.adminBadgeText}>ALERTS</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Compliance Monitoring</Text>
            <Text style={styles.title}>Certificate Status</Text>
            <Text style={styles.subtitle}>
              Review customers with expiring or expired compliance certificates
            </Text>
          </View>
        </View>

        {/* MAIN CONTENT */}
        <View style={styles.contentContainer}>
          {/* ACTIVE ALERTS SECTION */}
          {expiring.length === 0 && expired.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="check-circle" size={64} color="#1f9c8b" />
              <Text style={styles.emptyTitle}>All Compliant</Text>
              <Text style={styles.emptyText}>
                No compliance issues detected. All customers have valid certificates.
              </Text>
            </View>
          ) : (
            <>
              {/* EXPIRING SOON CARDS */}
              {expiring.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <MaterialIcons name="warning" size={20} color="#2c3e50" />
                    <Text style={styles.sectionTitle}>Expiring Soon ({expiring.length})</Text>
                  </View>
                  <Text style={styles.sectionHint}>
                    Customers with certificates expiring in the next 7 days
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
                              {n.daysRemaining} day{n.daysRemaining === 1 ? "" : "s"}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cardContent}>
                          <View style={styles.detailRow}>
                            <MaterialIcons name="calendar-today" size={16} color="#666" />
                            <Text style={styles.detailText}>
                              Valid until{" "}
                              <Text style={styles.bold}>
                                {n.validUntil.toLocaleDateString("en-GB")}
                              </Text>
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <MaterialIcons name="timer" size={16} color="#666" />
                            <Text style={styles.detailText}>
                              Expires in {n.daysRemaining} day{n.daysRemaining === 1 ? "" : "s"}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={styles.primaryButton}
                          onPress={() => handleSchedule(n.customerId)}
                        >
                          <MaterialIcons name="event" size={18} color="#fff" />
                          <Text style={styles.primaryButtonText}>Schedule Visit</Text>
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
                        Expired ({expired.length})
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
                        These customers are no longer compliant. You may schedule a visit or leave them inactive.
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
                                <Text style={styles.statusText}>Expired</Text>
                              </View>
                            </View>

                            <View style={styles.cardContent}>
                              <View style={styles.detailRow}>
                                <MaterialIcons name="calendar-today" size={16} color="#666" />
                                <Text style={styles.detailText}>
                                  Expired on{" "}
                                  <Text style={styles.bold}>
                                    {c.expiredOn.toLocaleDateString("en-GB")}
                                  </Text>
                                </Text>
                              </View>
                            </View>

                            <TouchableOpacity
                              style={styles.primaryButton}
                              onPress={() => handleSchedule(c.customerId)}
                            >
                              <MaterialIcons name="event" size={18} color="#fff" />
                              <Text style={styles.primaryButtonText}>Schedule Visit</Text>
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
            <Text style={styles.footerText}>Compliance Monitoring System</Text>
            <Text style={styles.footerSubtext}>
              Version 1.0 • Last updated: {new Date().toLocaleDateString()}
            </Text>
            <Text style={styles.footerCopyright}>
                © {new Date().getFullYear()} Pest-Free. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}