//AdminHomeScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl
} from "react-native";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import AdminTechSchedule from "./AdminTechSchedule";
import CustomersScreen from "./CustomersScreen";
import TechniciansScreen from "./TechniciansScreen";
import apiService from "../../services/apiService";
import pestfreeLogo from "../../../assets/pestfree_logo.png";
import MaterialsScreen from "./MaterialsScreen";
import CustomerRequestScreen from "./CustomerRequestScreen";
import AdminNotifications from "./AdminNotifications";
import { buildComplianceNotifications } from "../../utils/complianceNotifications";
import ReportScreen from "../Technician/ReportScreen";
import Statistics from "./Statistics";
import AdminTechCalendarPreview from "./AdminTechCalendarPreview"; //temporary
import i18n from "../../services/i18n";

export default function AdminHomeScreen({
  onLogout,
  forcePasswordChange = false,
  onPasswordChanged
}) {
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [todayVisits, setTodayVisits] = useState(0);
  const [screenLoading, setScreenLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCustomers, setShowCustomers] = useState(false);
  const [showTechSchedule, setShowTechSchedule] = useState(false);
  const [showTechnicians, setShowTechnicians] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [todayCustomerRequests, setTodayCustomerRequests] = useState(0);
  const [showCustomerRequests, setShowCustomerRequests] = useState(false);  
  const [showAdminNotifications, setShowAdminNotifications] = useState(false);
  const [complianceAlertsCount, setComplianceAlertsCount] = useState(0);
  const [scheduleCustomerId, setScheduleCustomerId] = useState(null);
  const handleOpenSchedule = (customerId) => {
    setScheduleCustomerId(customerId);
    setShowTechSchedule(true);
  };
  const [showPasswordChange, setShowPasswordChange] =
  useState(forcePasswordChange);

const [currentAdminPassword, setCurrentAdminPassword] =
  useState("");

const [newAdminPassword, setNewAdminPassword] =
  useState("");

const [confirmAdminPassword, setConfirmAdminPassword] =
  useState("");

const [changingAdminPassword, setChangingAdminPassword] =
  useState(false);
  const [adminReportContext, setAdminReportContext] = useState(null);
  const [showAdminReport, setShowAdminReport] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showCalendarPreview, setShowCalendarPreview] = useState(false); //temporary
  const [showInlineCalendar, setShowInlineCalendar] = useState(true);
  const [usage, setUsage] = useState(null);


  useEffect(() => {
    if (forcePasswordChange) {
      setShowPasswordChange(true);
      setScreenLoading(false);
      return;
    }

    loadAllData();
  }, [forcePasswordChange]);

  const loadAllData = async (forceRefresh = false) => {
    setScreenLoading(true);
    try {
      // Load customers
      const customersResult = await apiService.getCustomers();
      if (!Array.isArray(customersResult)) {
        throw new Error("Invalid customers response");
      }
      setCustomers(customersResult);

      const { expiring, expired } =
        buildComplianceNotifications(customersResult);

      setComplianceAlertsCount(expiring.length);

      // Load technicians
      const techniciansResult = await apiService.getTechnicians();
      
      // Handle different response formats
      if (Array.isArray(techniciansResult)) {
        setTechnicians(techniciansResult);
      } else if (techniciansResult?.success && Array.isArray(techniciansResult.technicians)) {
        setTechnicians(techniciansResult.technicians);
      } else if (techniciansResult?.technicians && Array.isArray(techniciansResult.technicians)) {
        setTechnicians(techniciansResult.technicians);
      } else {
        console.warn("Unexpected technicians response format:", techniciansResult);
        setTechnicians([]);
      }

      const today = new Date().toISOString().split("T")[0];

      const todaysAppointments = await apiService.getAppointments({
        dateFrom: today,
        dateTo: today
      });

      setTodayVisits(
        Array.isArray(todaysAppointments) && todaysAppointments.length > 0
          ? todaysAppointments.filter(a => a.status === "scheduled").length
          : Array.isArray(todaysAppointments?.appointments) 
            ? todaysAppointments.appointments.filter(a => a.status === "scheduled").length
            : 0
      );

      // FORCE REFRESH: Add timestamp to prevent caching
      const timestamp = forceRefresh ? `?t=${Date.now()}` : '';
      // Load today's customer requests count WITH DEBUG
      const requestsCountResult = await apiService.getTodayCustomerRequestsCount();
      
      if (requestsCountResult?.success) {
        // Make sure we're using the correct count
        const actualCount = requestsCountResult.count || 0;
        setTodayCustomerRequests(actualCount);
      } else {
        console.error("❌ Failed to get requests count:", requestsCountResult);
        setTodayCustomerRequests(0);
      }

      const usageRes = await apiService.getOrganizationUsage();
      if (usageRes?.success) {
        setUsage(usageRes);
      }

    } catch (error) {
      console.error("Failed to fetch data:", error);
      setTodayCustomerRequests(0); // Reset on error
    } finally {
      setScreenLoading(false);
    }
  };

  const handleChangeAdminPassword = async () => {
  if (
    !currentAdminPassword ||
    !newAdminPassword ||
    !confirmAdminPassword
  ) {
    Alert.alert(
      i18n.t("common.error"),
      i18n.t("admin.password.errors.required")
    );
    return;
  }

  if (newAdminPassword.length < 8) {
    Alert.alert(
      i18n.t("common.error"),
      i18n.t("admin.password.errors.tooShort")
    );
    return;
  }

  if (newAdminPassword !== confirmAdminPassword) {
    Alert.alert(
      i18n.t("common.error"),
      i18n.t("admin.password.errors.notMatching")
    );
    return;
  }

  setChangingAdminPassword(true);

  try {
    const result = await apiService.changeAdminPassword(
      currentAdminPassword,
      newAdminPassword
    );

    if (!result?.success) {
      const code =
        result?.data?.code ||
        result?.code;

      const errorMessage =
        code === "INCORRECT_CURRENT_PASSWORD"
          ? i18n.t(
              "admin.password.errors.currentIncorrect"
            )
          : code === "PASSWORDS_ARE_SAME"
            ? i18n.t(
                "admin.password.errors.samePassword"
              )
            : code === "PASSWORD_TOO_SHORT"
              ? i18n.t(
                  "admin.password.errors.tooShort"
                )
              : result?.error ||
                i18n.t(
                  "admin.password.errors.failed"
                );

      Alert.alert(
        i18n.t("common.error"),
        errorMessage
      );

      return;
    }

    Alert.alert(
      i18n.t("admin.password.successTitle"),
      i18n.t("admin.password.successMessage"),
      [
        {
          text: i18n.t("common.ok"),
          onPress: () => {
            setCurrentAdminPassword("");
            setNewAdminPassword("");
            setConfirmAdminPassword("");
            setShowPasswordChange(false);

            onPasswordChanged?.();
          }
        }
      ]
    );
  } catch (error) {
    console.error(
      "Administrator password change error:",
      error
    );

    Alert.alert(
      i18n.t("common.error"),
      i18n.t("admin.password.errors.failed")
    );
  } finally {
    setChangingAdminPassword(false);
  }
};

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const refreshAllData = () => {
    loadAllData();
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadAllData().finally(() => {
      setRefreshing(false);
    });
  };

  const getSubscriptionPlanName = (plan) => {
    const planKey = String(plan || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    return i18n.t(`admin.home.subscription.plans.${planKey}`, {
      defaultValue: String(plan || "").toUpperCase()
    });
  };

  const handleOpenAdminReport = (visit) => {
    setAdminReportContext({
      visitId: visit.visitId || visit.id,
      serviceType: visit.serviceType,
      readOnly: true
    });

    setShowAdminReport(true);
  };


// Call this in loadAllData or add a debug button

  if (screenLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f9c8b" />
        <Text style={styles.loadingText}>{i18n.t("admin.home.loading")}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1f9c8b"]}
            tintColor="#1f9c8b"
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandContainer}>
              <Image source={pestfreeLogo} style={styles.logo} resizeMode="contain" />
              <View style={styles.adminBadge}>
                <MaterialIcons name="admin-panel-settings" size={14} color="#fff" />
                <Text style={styles.adminBadgeText}>{i18n.t("admin.home.header.badge")}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.logoutButtonTop} 
              onPress={onLogout}
              activeOpacity={0.7}
            >
              <MaterialIcons name="logout" size={18} color="#fff" />
              <Text style={styles.logoutTextTop}>{i18n.t("admin.home.header.logout")}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>{i18n.t("admin.home.header.welcome")}</Text>
            <Text style={styles.title}>{i18n.t("admin.home.header.title")}</Text>
            <Text style={styles.subtitle}>
              {i18n.t("admin.home.header.subtitle")}
            </Text>
          </View>
        </View>

        {usage && (
                  <View style={styles.subscriptionCard}>
        
                    {/* PLAN HEADER */}
                    <View style={styles.subscriptionHeader}>
                      <Text style={styles.subscriptionPlan}>
                        {i18n.t("admin.home.subscription.plan", {
                          plan: getSubscriptionPlanName(usage.subscriptionPlan)
                        })}
                      </Text>
        
                      <View style={styles.subscriptionBadge}>
                        <Text style={styles.subscriptionBadgeText}>
                          {i18n.t("admin.home.subscription.active")}
                        </Text>
                      </View>
                    </View>
        
                    {/* CUSTOMERS */}
                    <Text style={styles.subscriptionLabel}>
                      {i18n.t("admin.home.subscription.customers", {
                        used: usage.customers.used,
                        max: usage.customers.max
                      })}
                    </Text>
        
                    <View style={styles.subscriptionBarContainer}>
                      <View
                        style={[
                          styles.subscriptionBarFill,
                          {
                            width: `${(usage.customers.used / usage.customers.max) * 100}%`,
                            backgroundColor:
                              usage.customers.used >= usage.customers.max
                                ? "#e74c3c"
                                : "#1f9c8b"
                          }
                        ]}
                      />
                    </View>
        
                    {/* TECHNICIANS */}
                    <Text style={[styles.subscriptionLabel, { marginTop: 10 }]}>
                      {i18n.t("admin.home.subscription.technicians", {
                        used: usage.technicians.used,
                        max: usage.technicians.max
                      })}
                    </Text>
        
                    <View style={styles.subscriptionBarContainer}>
                      <View
                        style={[
                          styles.subscriptionBarFill,
                          {
                            width: `${(usage.technicians.used / usage.technicians.max) * 100}%`,
                            backgroundColor:
                              usage.technicians.used >= usage.technicians.max
                                ? "#e74c3c"
                                : "#1f9c8b"
                          }
                        ]}
                      />
                    </View>
        
                  </View>
                )}

        {/* QUICK STATS CARDS */}
        <View style={styles.sectionHeader}>
          <MaterialIcons name="dashboard" size={20} color="#2c3e50" />
          <Text style={styles.sectionTitle}>{i18n.t("admin.home.sections.quickOverview")}</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <FontAwesome5 name="users" size={20} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>{customers.length}</Text>
            <Text style={styles.statLabel}>{i18n.t("admin.home.stats.totalCustomers")}</Text>
            <Text style={styles.statTrend}>{i18n.t("admin.home.stats.active")}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialIcons name="engineering" size={22} color="#1f8c8b" />
            </View>
            <Text style={styles.statNumber}>{technicians.length}</Text>
            <Text style={styles.statLabel}>{i18n.t("admin.home.stats.technicians")}</Text>
            <Text style={styles.statTrend}>{i18n.t("admin.home.stats.onDuty")}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialIcons name="today" size={20} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>{todayVisits}</Text>
            <Text style={styles.statLabel}>{i18n.t("admin.home.stats.todayVisits")}</Text>
            <Text style={styles.statTrend}>{i18n.t("admin.home.stats.scheduled")}</Text>
          </View>

          {/* 🔥 NEW: Today's Customer Requests Block */}
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialIcons name="request-page" size={20} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>{todayCustomerRequests}</Text>
            <Text style={styles.statLabel}>{i18n.t("admin.home.stats.todayRequests")}</Text>
            <Text style={[styles.statTrend, { color: todayCustomerRequests > 0 ? '#F44336' : '#1f9c8b' }]}>
              {todayCustomerRequests > 0 ? i18n.t("admin.home.stats.pending") : i18n.t("admin.home.stats.none")}
            </Text>
          </View>
        </View>

        {/* INLINE CALENDAR PREVIEW */}
        <View style={styles.sectionHeader}>
          <MaterialIcons name="calendar-view-week" size={20} color="#2c3e50" />
          <Text style={styles.sectionTitle}>{i18n.t("admin.home.sections.weeklyOverview")}</Text>

          <TouchableOpacity
            onPress={() => setShowInlineCalendar(prev => !prev)}
            style={{ marginLeft: "auto" }}
          >
            <MaterialIcons
              name={showInlineCalendar ? "expand-less" : "expand-more"}
              size={24}
              color="#1f9c8b"
            />
          </TouchableOpacity>
        </View>

        {showInlineCalendar && (
          <View style={styles.inlineCalendarContainer}>
            <AdminTechCalendarPreview />
          </View>
        )}

        {/* ADMINISTRATION MODULES */}
        <View style={styles.sectionHeader}>
          <MaterialIcons name="admin-panel-settings" size={20} color="#2c3e50" />
          <Text style={styles.sectionTitle}>{i18n.t("admin.home.sections.administrationModules")}</Text>
        </View>

        <View style={styles.modulesGrid}>
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => setShowAdminNotifications(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconContainer, { backgroundColor: '#1f9c8b' }]}>
              <MaterialIcons name="notifications-active" size={24} color="#fff" />
            </View>

            <Text style={styles.moduleTitle}>{i18n.t("admin.home.modules.complianceAlerts.title")}</Text>

            <Text style={styles.moduleDescription}>
              {i18n.t("admin.home.modules.complianceAlerts.description")}
            </Text>

            <View style={styles.moduleFooter}>
              <Text
                style={[
                  styles.moduleCount,
                  complianceAlertsCount > 0 && { color: '#1f9c8b', fontWeight: '700' }
                ]}
              >
                {complianceAlertsCount === 1 
                  ? i18n.t("admin.home.modules.complianceAlerts.alerts_one", { count: complianceAlertsCount })
                  : i18n.t("admin.home.modules.complianceAlerts.alerts_other", { count: complianceAlertsCount })}
              </Text>

              <MaterialIcons name="chevron-right" size={20} color="#1f9c8b" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => setShowCustomers(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconContainer, { backgroundColor: '#1f9c8b' }]}>
              <FontAwesome5 name="users-cog" size={24} color="#fff" />
            </View>
            <Text style={styles.moduleTitle}>{i18n.t("admin.home.modules.customers.title")}</Text>
            <Text style={styles.moduleDescription}>
              {i18n.t("admin.home.modules.customers.description")}
            </Text>
            <View style={styles.moduleFooter}>
              <Text style={styles.moduleCount}>
                {customers.length === 1
                  ? i18n.t("admin.home.modules.customers.registered_one", { count: customers.length })
                  : i18n.t("admin.home.modules.customers.registered_other", { count: customers.length })}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color="#1f9c8b" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => setShowCustomerRequests(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconContainer, { backgroundColor: '#1f9c8b' }]}>
              <MaterialIcons name="request-page" size={24} color="#fff" />
            </View>
            <Text style={styles.moduleTitle}>{i18n.t("admin.home.modules.customerRequests.title")}</Text>
            <Text style={styles.moduleDescription}>
              {i18n.t("admin.home.modules.customerRequests.description")}
            </Text>
            <View style={styles.moduleFooter}>
              <Text style={[styles.moduleCount, todayCustomerRequests > 0 && { color: '#1f9c8b' }]}>
                {todayCustomerRequests === 1
                  ? i18n.t("admin.home.modules.customerRequests.pending_one", { count: todayCustomerRequests })
                  : i18n.t("admin.home.modules.customerRequests.pending_other", { count: todayCustomerRequests })}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color="#1f9c8b" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => setShowTechnicians(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconContainer, { backgroundColor: '#1f9c8b' }]}>
              <MaterialIcons name="engineering" size={24} color="#fff" />
            </View>
            <Text style={styles.moduleTitle}>{i18n.t("admin.home.modules.technicians.title")}</Text>
            <Text style={styles.moduleDescription}>
              {i18n.t("admin.home.modules.technicians.description")}
            </Text>
            <View style={styles.moduleFooter}>
              <Text style={styles.moduleCount}>
                {technicians.length === 1
                  ? i18n.t("admin.home.modules.technicians.active_one", { count: technicians.length })
                  : i18n.t("admin.home.modules.technicians.active_other", { count: technicians.length })}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color="#1f9c8b" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => setShowTechSchedule(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconContainer, { backgroundColor: '#1f9c8b' }]}>
              <MaterialIcons name="schedule" size={24} color="#fff" />
            </View>
            <Text style={styles.moduleTitle}>{i18n.t("admin.home.modules.schedule.title")}</Text>
            <Text style={styles.moduleDescription}>
              {i18n.t("admin.home.modules.schedule.description")}
            </Text>
            <View style={styles.moduleFooter}>
              <Text style={styles.moduleCount}>
                {todayVisits === 1
                  ? i18n.t("admin.home.modules.schedule.today_one", { count: todayVisits })
                  : i18n.t("admin.home.modules.schedule.today_other", { count: todayVisits })}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color="#1f9c8b" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => setShowMaterials(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconContainer, { backgroundColor: '#1f9c8b' }]}>
              <MaterialIcons name="inventory" size={24} color="#fff" />
            </View>
            <Text style={styles.moduleTitle}>{i18n.t("admin.home.modules.materials.title")}</Text>
            <Text style={styles.moduleDescription}>
              {i18n.t("admin.home.modules.materials.description")}
            </Text>
            <View style={styles.moduleFooter}>
              <Text style={styles.moduleCount}>{i18n.t("admin.home.modules.materials.inventory")}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#1f9c8b" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => setShowStatistics(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIconContainer, { backgroundColor: '#1f9c8b' }]}>
              <MaterialIcons name="bar-chart" size={24} color="#fff" />
            </View>

            <Text style={styles.moduleTitle}>{i18n.t("admin.home.modules.statistics.title")}</Text>

            <Text style={styles.moduleDescription}>
              {i18n.t("admin.home.modules.statistics.description")}
            </Text>

            <View style={styles.moduleFooter}>
              <Text style={styles.moduleCount}>{i18n.t("admin.home.modules.statistics.overview")}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#1f9c8b" />
            </View>
          </TouchableOpacity>
        </View>

        {/* SYSTEM ACTIONS */}
        <View style={styles.sectionHeader}>
          <MaterialIcons name="settings" size={20} color="#2c3e50" />
          <Text style={styles.sectionTitle}>{i18n.t("admin.home.sections.systemActions")}</Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleManualRefresh}
            disabled={refreshing}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              {refreshing ? (
                <ActivityIndicator size="small" color="#1f9c8b" />
              ) : (
                <MaterialIcons name="refresh" size={22} color="#1f9c8b" />
              )}
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>
                {refreshing 
                  ? i18n.t("admin.home.actions.refreshDashboard.title_refreshing")
                  : i18n.t("admin.home.actions.refreshDashboard.title")}
              </Text>
              <Text style={styles.actionSubtitle}>
                {i18n.t("admin.home.actions.refreshDashboard.subtitle")}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
              <MaterialIcons name="logout" size={20} color="#F44336" />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: '#F44336' }]}>
                {i18n.t("admin.home.actions.logout.title")}
              </Text>
              <Text style={styles.actionSubtitle}>
                {i18n.t("admin.home.actions.logout.subtitle")}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#F44336" />
          </TouchableOpacity>

          <TouchableOpacity
  style={styles.actionButton}
  onPress={() => setShowPasswordChange(true)}
  activeOpacity={0.7}
>
  <View style={styles.actionIconContainer}>
    <MaterialIcons
      name="lock-reset"
      size={22}
      color="#1f9c8b"
    />
  </View>

  <View style={styles.actionContent}>
    <Text style={styles.actionTitle}>
      {i18n.t(
        "admin.home.actions.changePassword.title"
      )}
    </Text>

    <Text style={styles.actionSubtitle}>
      {i18n.t(
        "admin.home.actions.changePassword.subtitle"
      )}
    </Text>
  </View>

  <MaterialIcons
    name="chevron-right"
    size={20}
    color="#666"
  />
</TouchableOpacity>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{i18n.t("admin.home.footer.system")}</Text>
          <Text style={styles.footerSubtext}>
            {i18n.t("admin.home.footer.version", { date: new Date().toLocaleDateString() })}
          </Text>
          <Text style={styles.footerCopyright}>
            {i18n.t("admin.home.footer.copyright", { year: new Date().getFullYear() })}
          </Text>
        </View>

        {/* MODALS */}
        {showTechSchedule && (
          <Modal animationType="slide" visible>
            <AdminTechSchedule
              onClose={() => setShowTechSchedule(false)}
              initialCustomerId={scheduleCustomerId}
            />
          </Modal>
        )}

        {showCustomers && (
          <Modal animationType="slide" visible>
            <CustomersScreen 
              onClose={() => {
                setShowCustomers(false);
                refreshAllData();
              }}
              onOpenReport={handleOpenAdminReport}
            />
          </Modal>
        )}

        {showCustomerRequests && (
          <Modal animationType="slide" visible>
            <CustomerRequestScreen 
              onClose={() => {
                setShowCustomerRequests(false);
                // Force refresh with a slight delay to ensure backend has updated
                setTimeout(() => {
                  loadAllData(true);
                }, 500);
              }} 
            />
          </Modal>
        )}

        {showTechnicians && (
          <Modal animationType="slide" visible>
            <TechniciansScreen 
              onClose={() => {
                setShowTechnicians(false);
                refreshAllData();
              }} 
            />
          </Modal>
        )}

        {showMaterials && (
          <Modal animationType="slide" visible>
            <MaterialsScreen onClose={() => setShowMaterials(false)} />
          </Modal>
        )}
        {showAdminNotifications && (
          <Modal animationType="slide" visible>
            <AdminNotifications
              onClose={() => setShowAdminNotifications(false)}
              onOpenSchedule={handleOpenSchedule}
            />
          </Modal>
        )}

        {showAdminReport && adminReportContext && (
          <Modal animationType="slide" visible>
            <ReportScreen
              context={adminReportContext}
              onBack={() => {
                setShowAdminReport(false);
                setAdminReportContext(null);
              }}
            />
          </Modal>
        )}

        {showStatistics && (
          <Modal animationType="slide" visible>
            <Statistics
              onClose={() => setShowStatistics(false)}
            />
          </Modal>
        )}

        {showCalendarPreview && (
          <Modal animationType="slide" visible>
            <AdminTechCalendarPreview
              onClose={() => setShowCalendarPreview(false)}
            />
          </Modal>
        )}

        {showPasswordChange && (
  <Modal
    animationType="slide"
    visible
    onRequestClose={() => {
      if (!forcePasswordChange) {
        setShowPasswordChange(false);
      }
    }}
  >
    <SafeAreaView
      style={styles.passwordScreen}
      edges={["top", "right", "bottom", "left"]}
    >
      <ScrollView
        style={styles.passwordScrollView}
        contentContainerStyle={
          styles.passwordScrollContent
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.passwordHeader}>
          <TouchableOpacity
            style={styles.passwordCloseButton}
            hitSlop={{
              top: 8,
              right: 8,
              bottom: 8,
              left: 8
            }}
            onPress={
              forcePasswordChange
                ? onLogout
                : () =>
                    setShowPasswordChange(false)
            }
          >
            <MaterialIcons
              name={
                forcePasswordChange
                  ? "logout"
                  : "close"
              }
              size={26}
              color="#fff"
            />
          </TouchableOpacity>

          <Text style={styles.passwordHeaderTitle}>
            {i18n.t("admin.password.title")}
          </Text>

          <View
            style={styles.passwordHeaderSpacer}
          />
        </View>

        <View style={styles.passwordContent}>
          <MaterialIcons
            name="lock-reset"
            size={58}
            color="#1f9c8b"
          />

          <Text style={styles.passwordDescription}>
            {forcePasswordChange
              ? i18n.t(
                  "admin.password.forcedDescription"
                )
              : i18n.t(
                  "admin.password.description"
                )}
          </Text>

          <TextInput
            style={styles.passwordInput}
            placeholder={i18n.t(
              "admin.password.currentPassword"
            )}
            secureTextEntry
            autoCapitalize="none"
            value={currentAdminPassword}
            onChangeText={setCurrentAdminPassword}
          />

          <TextInput
            style={styles.passwordInput}
            placeholder={i18n.t(
              "admin.password.newPassword"
            )}
            secureTextEntry
            autoCapitalize="none"
            value={newAdminPassword}
            onChangeText={setNewAdminPassword}
          />

          <TextInput
            style={styles.passwordInput}
            placeholder={i18n.t(
              "admin.password.confirmPassword"
            )}
            secureTextEntry
            autoCapitalize="none"
            value={confirmAdminPassword}
            onChangeText={setConfirmAdminPassword}
          />

          <TouchableOpacity
            style={[
              styles.passwordSubmitButton,
              changingAdminPassword && {
                opacity: 0.6
              }
            ]}
            disabled={changingAdminPassword}
            onPress={handleChangeAdminPassword}
          >
            {changingAdminPassword ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={styles.passwordSubmitText}
              >
                {i18n.t(
                  "admin.password.submit"
                )}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  </Modal>
)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontFamily: 'System',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 50,
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
  logoutButtonTop: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  logoutTextTop: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
    fontFamily: 'System',
  },
  headerContent: {
    marginTop: 10,
  },
  passwordScreen: {
  flex: 1,
  backgroundColor: "#f8f9fa",
},

passwordScrollView: {
  flex: 1,
},

passwordScrollContent: {
  flexGrow: 1,
  backgroundColor: "#f8f9fa",
},

passwordHeader: {
  backgroundColor: "#1f9c8b",
  paddingHorizontal: 20,
  paddingVertical: 10,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

passwordCloseButton: {
  width: 44,
  height: 44,
  alignItems: "center",
  justifyContent: "center",
},

passwordHeaderSpacer: {
  width: 44,
  height: 44,
},

passwordHeaderTitle: {
  color: "#fff",
  fontSize: 18,
  fontWeight: "700",
},

passwordContent: {
  flexGrow: 1,
  padding: 24,
  alignItems: "center",
  justifyContent: "center",
},

passwordDescription: {
  maxWidth: 500,
  marginTop: 20,
  marginBottom: 28,
  color: "#666",
  fontSize: 15,
  lineHeight: 22,
  textAlign: "center",
},

passwordInput: {
  width: "100%",
  maxWidth: 500,
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "#e1e5e8",
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 15,
  marginBottom: 14,
  fontSize: 16,
},

passwordSubmitButton: {
  width: "100%",
  maxWidth: 500,
  backgroundColor: "#1f9c8b",
  borderRadius: 12,
  paddingVertical: 16,
  alignItems: "center",
  marginTop: 10,
},

passwordSubmitText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "700",
},
  welcomeText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
    fontFamily: 'System',
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
    fontFamily: 'System',
  },
  
  // SECTIONS
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
    marginHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginLeft: 8,
    fontFamily: 'System',
  },
  
  // STATS GRID
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 24,
    marginBottom: 8,
  },
  statCard: {
    backgroundColor: "#fff",
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
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
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4,
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
    fontFamily: 'System',
  },
  statTrend: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1f9c8b",
    fontFamily: 'System',
  },
  
  // MODULES GRID
  modulesGrid: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  moduleCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
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
  },
  moduleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
    fontFamily: 'System',
  },
  moduleDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: 'System',
  },
  moduleFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f8f9fa",
    paddingTop: 16,
  },
  moduleCount: {
    fontSize: 13,
    color: "#1f9c8b",
    fontWeight: "600",
    fontFamily: 'System',
  },
  
  // ACTIONS
  actionsContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
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
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f9fa",
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(31, 156, 139, 0.1)',
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 4,
    fontFamily: 'System',
  },
  actionSubtitle: {
    fontSize: 13,
    color: "#666",
    fontFamily: 'System',
  },
  
  // FOOTER
  footer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 8,
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
  inlineCalendarContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 3
  },
  subscriptionCard: {
    backgroundColor: "#fff",
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },

  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  subscriptionPlan: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2c3e50",
  },

  subscriptionBadge: {
    backgroundColor: "#e9f7f6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  subscriptionBadgeText: {
    color: "#1f9c8b",
    fontWeight: "700",
    fontSize: 12,
  },

  subscriptionBarContainer: {
    height: 8,
    backgroundColor: "#ecf0f1",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
  },

  subscriptionBarFill: {
    height: "100%",
    backgroundColor: "#1f9c8b",
  },

  subscriptionText: {
    fontSize: 12,
    color: "#666",
  },
  subscriptionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 4,
  },
});