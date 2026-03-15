// CustomerHomeScreen.js - Update the import statement
import React from "react";
import { Image } from "react-native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  Linking,
  Platform,
  Pressable,
  Modal,
  FlatList,
  RefreshControl,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, FontAwesome5, Ionicons, Feather, Entypo, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService, { request } from "../../services/apiService";
import styles from "./CustomerHome.styles";
import useCustomerHome from "./CustomerHome.hooks";
import { 
  loadNotifications, 
  markAllNotificationsAsRead  
} from "./CustomerHome.notifications";
import i18n from "../../services/i18n";

export default function CustomerHomeScreen({
  customer,
  onLogout,
  onViewVisits
}) {

  const home = useCustomerHome({ customer, onLogout, onViewVisits });

  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = (i % 2) * 30;
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    return {
      id: i,
      label: timeStr,
      hour: hour.toString().padStart(2, '0'),
      minute: minute.toString().padStart(2, '0')
    };
  });

  const notificationsToShow = home.showAllNotifications 
    ? home.notifications 
    : home.notifications.slice(0, 3);
  const selectedService = home.serviceTypes.find(s => s.id === home.serviceType);
  const selectedUrgency =
    home.urgencyOptions.find(u => u.id === home.urgency) ||
    home.urgencyOptions[1];

  const getServiceFromDescription = (description) => {
    if (!description) return i18n.t("customer.visits.serviceTypes.default") || 'Service';
    
    const desc = description.toLowerCase();
    if (desc.includes('disinfection')) return i18n.t("customer.visits.serviceTypes.disinfection");
    if (desc.includes('insecticide')) return i18n.t("customer.visits.serviceTypes.insecticide");
    if (desc.includes('special service')) return i18n.t("customer.visits.serviceTypes.special");
    if (desc.includes('myocide')) return i18n.t("customer.visits.serviceTypes.myocide");
    if (desc.includes('appointment')) {
      // Extract service type from appointment completed notifications
      const match = description.match(/Your (.*?) appointment has been completed/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return i18n.t("customer.visits.serviceTypes.default") || 'Service';
  };


  if (home.loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1f9c8b" />
        <Text style={styles.loadingText}>{i18n.t("customer.loading")}</Text>
      </SafeAreaView>
    );
  }

  if (!home.dashboard) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
        <View style={styles.header}>
          <Text style={styles.title}>{i18n.t("customer.dashboardUnavailable")}</Text>
        </View>
        <View style={styles.content}>
          <TouchableOpacity style={styles.logoutButton} onPress={home.onLogout}>
            <Text style={styles.logoutText}>{i18n.t("customer.logout")}</Text>
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const statusColor = home.getStatusColor(home.dashboard.compliance?.status || 'pending');

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return "—";
      
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIndex = d.getMonth();
      const day = d.getDate();
      const year = d.getFullYear();
      
      return `${day} ${i18n.t(`months.${months[monthIndex]}`)} ${year}`;
    } catch {
      return "—";
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    
    // If it's already in HH:MM format, return it
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }
    
    // If it's in HH:MM:SS format, remove seconds
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr.substring(0, 5);
    }
    
    // If it's an ISO string, extract time
    try {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
    } catch {
      // Ignore
    }
    
    return timeStr;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
       <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={home.refreshing}
              onRefresh={home.onRefresh}
              colors={["#1f9c8b"]}
              tintColor="#1f9c8b"
            />
          }
        >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {/* Extract first character from customer name */}
                {(() => {
                  const customer = home.dashboard?.customer;
                  let name = '';
                  
                  // Try different possible name fields
                  if (customer?.name) name = customer.name;
                  else if (customer?.fullName) name = customer.fullName;
                  else if (customer?.customerName) name = customer.customerName;
                  else if (customer?.firstName && customer?.lastName) {
                    name = `${customer.firstName} ${customer.lastName}`;
                  }
                  else if (customer?.email) name = customer.email.split('@')[0];
                  else name = i18n.t("customer.welcome.customer").charAt(0) || "C";
                  
                  return name.charAt(0).toUpperCase();
                })()}
              </Text>
              {home.notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{home.notificationCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.welcomeText}>{i18n.t("customer.welcome.greeting")}</Text>
            <Text style={styles.customerName}>
              {/* Get customer name from multiple possible fields */}
              {(() => {
                const customer = home.dashboard?.customer;
                
                if (customer?.name) return customer.name;
                if (customer?.fullName) return customer.fullName;
                if (customer?.customerName) return customer.customerName;
                if (customer?.firstName && customer?.lastName) {
                  return `${customer.firstName} ${customer.lastName}`;
                }
                if (customer?.email) return customer.email.split('@')[0];
                
                return i18n.t("customer.welcome.customer");
              })()}
            </Text>
            <Text style={styles.customerEmail}>{home.dashboard.customer?.email || ""}</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Compliance Status Card */}
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="verified" size={20} color="#1f9c8b" />
            <Text style={styles.sectionTitle}>{i18n.t("customer.compliance.title")}</Text>
          </View>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome5 name="shield-alt" size={16} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {home.dashboard.compliance?.status === "compliant" && i18n.t("customer.compliance.status.compliant")}
                {home.dashboard.compliance?.status === "pending" && i18n.t("customer.compliance.status.pending")}
                {home.dashboard.compliance?.status === "non-compliant" && i18n.t("customer.compliance.status.nonCompliant")}
                {!home.dashboard.compliance?.status && i18n.t("customer.compliance.status.pending")}
              </Text>
            </View>
            <View style={styles.statusIndicator}>
              <View 
                style={[
                  styles.statusDot, 
                  { backgroundColor: statusColor }
                ]} 
              />
              <Text style={styles.statusDescription}>
                {home.dashboard.compliance?.status === "compliant" && i18n.t("customer.compliance.description.compliant")}
                {home.dashboard.compliance?.status === "pending" && i18n.t("customer.compliance.description.pending")}
                {home.dashboard.compliance?.status === "non-compliant" && i18n.t("customer.compliance.description.nonCompliant")}
                {!home.dashboard.compliance?.status && i18n.t("customer.compliance.description.pending")}
              </Text>
            </View>
            {home.dashboard.customer?.complianceValidUntil && (
              <Text style={styles.validUntilText}>
                {i18n.t("customer.compliance.validUntil", { 
                  date: formatDate(home.dashboard.customer.complianceValidUntil) 
                })}
              </Text>
            )}

            {/* Last Visit Section */}
            <View style={styles.visitMeta}>
              <View style={styles.visitMetaRow}>
                <MaterialIcons name="history" size={18} color="#1f9c8b" />
                <Text style={styles.visitMetaLabel}>{i18n.t("customer.compliance.lastVisit.label")}</Text>
                <View style={styles.visitMetaValueContainer}>
                  {home.loadingVisits ? (
                    <ActivityIndicator size="small" color="#1f9c8b" />
                  ) : home.lastVisit ? (
                    <Text style={styles.visitDateText}>
                      {home.lastVisit.formattedDate || 
                      (() => {
                        try {
                          const date = home.lastVisit.startTime;
                          if (date) {
                            const d = new Date(date);
                            return d.toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            });
                          }
                        } catch {
                          // ignore
                        }
                        return "—";
                      })()}
                    </Text>
                  ) : (
                    <Text style={styles.noAppointmentText}>{i18n.t("customer.compliance.lastVisit.none")}</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.visitMetaRow}>
                <MaterialIcons name="event" size={18} color="#1f9c8b" />
                <Text style={styles.visitMetaLabel}>{i18n.t("customer.compliance.nextScheduled.label")}</Text>
                <View style={styles.visitMetaValueContainer}>
                  {home.dashboard?.nextAppointment?.date ? (
                    <Text style={styles.visitDateText}>
                      {home.formatDisplayDate(home.dashboard.nextAppointment.date)}
                    </Text>
                  ) : (
                    <Text style={styles.noAppointmentText}>{i18n.t("customer.compliance.nextScheduled.none")}</Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* NOTIFICATIONS SECTION */}
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="notifications" size={20} color="#1f9c8b" />
            <Text style={styles.sectionTitle}>{i18n.t("customer.notifications.title")}</Text>
            {home.notificationCount > 0 && (
              <View style={styles.notificationCountBadge}>
                <Text style={styles.notificationCountText}>
                  {home.notificationCount === 1 
                    ? i18n.t("customer.notifications.newBadge_one", { count: home.notificationCount })
                    : i18n.t("customer.notifications.newBadge_other", { count: home.notificationCount })}
                </Text>
              </View>
            )}
            {home.notifications.length > 0 && (
              <>
                <TouchableOpacity 
                  style={styles.notificationsToggleButton}
                  onPress={home.toggleNotifications}
                >
                  <Text style={styles.notificationsToggleText}>
                    {home.showNotifications ? i18n.t("customer.notifications.hide") : i18n.t("customer.notifications.show")}
                  </Text>
                </TouchableOpacity>
                
                {home.notificationCount > 0 && home.showNotifications && (
                  <TouchableOpacity 
                    style={styles.markAllReadButton}
                    onPress={() => {
                      home.markAllNotificationsAsRead();
                    }}
                  >
                    <Text style={styles.markAllReadText}>{i18n.t("customer.notifications.markAllRead")}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {home.notifications.length === 0 ? (
            <View style={[styles.card, styles.emptyNotificationsCard]}>
              <MaterialIcons name="notifications-off" size={48} color="#ddd" />
              <Text style={styles.emptyNotificationsTitle}>{i18n.t("customer.notifications.empty.title")}</Text>
              <Text style={styles.emptyNotificationsText}>
                {i18n.t("customer.notifications.empty.text")}
              </Text>
            </View>
          ) : home.showNotifications ? (
            <View style={styles.notificationsList}>
              {/* Show either all notifications or just first 3 */}
              {(home.showAllNotifications ? home.notifications : home.notifications.slice(0, 3)).map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.isRead && styles.notificationCardUnread
                  ]}
                  onPress={() => home.handleNotificationTap(notification)}
                >
                  <View style={styles.notificationHeader}>
                    <View style={[
                      styles.notificationIcon,
                      { backgroundColor: home.getNotificationColor(notification) + '20' }
                    ]}>
                      <MaterialIcons 
                        name={home.getNotificationIcon(notification)} 
                        size={20} 
                        color={home.getNotificationColor(notification)} 
                      />
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationDescription} numberOfLines={1}>
                        {notification.description}
                      </Text>
                    </View>
                    {!notification.isRead && (
                      <View style={styles.unreadDot} />
                    )}
                  </View>
                  <View style={styles.notificationFooter}>
                    <Text style={styles.notificationTime}>
                      {home.formatTimeAgo(notification.createdAt)}
                    </Text>
                    <MaterialIcons name="chevron-right" size={20} color="#ccc" />
                  </View>
                </TouchableOpacity>
              ))}
              
              {/* View All / Show Less button */}
              {home.notifications.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllNotificationsButton}
                  onPress={() => {
                    home.setShowAllNotifications(!home.showAllNotifications);
                    // Force a refresh of the displayed notifications
                    if (!home.showAllNotifications) {
                      // Load all notifications when expanding
                      loadNotifications({
                        setNotifications: home.setNotifications,
                        setNotificationCount: home.setNotificationCount,
                        setLastFetchTime: home.setLastFetchTime,
                        readNotificationIds: [] // optional
                      });
                    }
                  }}
                >
                  <Text style={styles.viewAllNotificationsText}>
                    {home.showAllNotifications 
                      ? i18n.t("customer.notifications.showLess")
                      : i18n.t("customer.notifications.viewAll", { count: home.notifications.length })}
                  </Text>
                  <MaterialIcons 
                    name={home.showAllNotifications ? "arrow-upward" : "arrow-forward"} 
                    size={20} 
                    color="#1f9c8b" 
                  />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.notificationsPreviewCard}
              onPress={() => {
                home.setShowNotifications(true);
                // Refresh notifications when opening
                loadNotifications({
                  setNotifications: home.setNotifications,
                  setNotificationCount: home.setNotificationCount,
                  setLastFetchTime: home.setLastFetchTime,
                  readNotificationIds: [] // optional
                });
              }}
            >
              <View style={styles.notificationsPreviewHeader}>
                <View style={[
                  styles.notificationsPreviewIcon,
                  { backgroundColor: home.notificationCount > 0 ? '#FF6B6B' : '#1f9c8b' }
                ]}>
                  <MaterialIcons 
                    name="notifications" 
                    size={24} 
                    color="#fff" 
                  />
                </View>
                <View style={styles.notificationsPreviewContent}>
                  <Text style={styles.notificationsPreviewTitle}>
                    {home.notificationCount > 0 
                      ? i18n.t("customer.notifications.preview.new", { count: home.notificationCount })
                      : i18n.t("customer.notifications.preview.recent")}
                  </Text>
                  <Text style={styles.notificationsPreviewSubtitle}>
                    {i18n.t("customer.notifications.preview.tapToView", { 
                      type: home.notificationCount > 0 ? 'new' : 'recent' 
                    })}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#666" />
              </View>
            </TouchableOpacity>
          )}

          {/* Quick Actions */}
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="dashboard" size={20} color="#1f9c8b" />
            <Text style={styles.sectionTitle}>{i18n.t("customer.quickActions.title")}</Text>
          </View>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={home.onViewVisits}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialIcons name="history" size={24} color="#1f9c8b" />
              </View>
              <Text style={styles.quickActionText}>{i18n.t("customer.quickActions.visitHistory")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={home.toggleAppointments}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialIcons name="event" size={24} color="#1f9c8b" />
              </View>
              <Text style={styles.quickActionText}>{i18n.t("customer.quickActions.appointments")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={home.toggleServiceRequest}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialIcons name="add-circle" size={24} color="#1f9c8b" />
              </View>
              <Text style={styles.quickActionText}>{i18n.t("customer.quickActions.requestService")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={home.toggleContactForm}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialIcons name="support-agent" size={24} color="#1f9c8b" />
              </View>
              <Text style={styles.quickActionText}>{i18n.t("customer.quickActions.contactUs")}</Text>
            </TouchableOpacity>
          </View>

          {/* Upcoming Appointments Section */}
          {home.showAppointments && (
            <View style={styles.expandedSection}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons name="event" size={20} color="#1f9c8b" />
                <Text style={styles.sectionTitle}>{i18n.t("customer.appointments.title")}</Text>
              </View>
              
              {home.appointments.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <MaterialIcons name="event-busy" size={48} color="#ddd" />
                  <Text style={styles.emptyStateTitle}>{i18n.t("customer.appointments.empty.title")}</Text>
                  <Text style={styles.emptyStateText}>
                    {i18n.t("customer.appointments.empty.text")}
                  </Text>
                </View>
              ) : (
                <View style={styles.appointmentsList}>
                  {home.appointments.map((appointment) => (
                    <View key={appointment.id} style={styles.appointmentCard}>
                      <View style={styles.appointmentHeader}>
                        <View style={styles.appointmentTimeContainer}>
                          <MaterialIcons name="access-time" size={16} color="#1f9c8b" />
                          <Text style={styles.appointmentTime}>
                            {formatTime(appointment.time)} • {home.formatDisplayDate(appointment.date)}
                          </Text>
                        </View>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: `${home.getAppointmentStatusColor(appointment.status)}20` }
                        ]}>
                          <Text style={[
                            styles.statusBadgeText,
                            { color: home.getAppointmentStatusColor(appointment.status) }
                          ]}>
                            {home.getAppointmentStatusText(appointment.status)}
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={styles.appointmentService}>
                        {home.getServiceTypeLabel(appointment.serviceType, appointment.specialServiceSubtype, appointment.otherPestName)}
                      </Text>
                      
                      {appointment.technician && (
                        <View style={styles.technicianInfo}>
                          <MaterialIcons name="engineering" size={14} color="#666" />
                          <Text style={styles.technicianText}>
                            {i18n.t("customer.appointments.technician", { name: appointment.technician })}
                          </Text>
                        </View>
                      )}
                      
                      {/* Appointment notes - show the most relevant information */}
                      {(appointment.reschedule_notes || appointment.notes) && (
                        <Text style={styles.appointmentNotes} numberOfLines={2}>
                          {appointment.reschedule_notes 
                            ? (() => {
                                const lastLine = appointment.reschedule_notes.split('\n').pop();
                                // Extract just the message after "Reschedule declined: "
                                if (lastLine.includes('Reschedule declined: ')) {
                                  return lastLine.replace('Reschedule declined: ', '');
                                }
                                return lastLine;
                              })()
                            : appointment.notes}
                        </Text>
                      )}
                      
                      <View style={styles.appointmentActions}>
                        {appointment.status === 'scheduled' && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                                home.setSelectedAppointment(appointment);
                                
                                // Initialize with current appointment date/time or default to tomorrow
                                const appointmentDate = appointment.date ? new Date(appointment.date) : new Date();
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                
                                // Use appointment date or tomorrow as default
                                const defaultDate = appointment.date ? appointmentDate : tomorrow;
                                
                                // Set the states
                              
                                home.setNewAppointmentDate(defaultDate.toISOString().split('T')[0]);
                                
                                const normalizedTime = appointment.time
                                  ? appointment.time.slice(0, 5) // "22:00:00" → "22:00"
                                  : "09:30";

                                home.setNewAppointmentTime(normalizedTime);                             
                                home.setShowRescheduleModal(true);
                            }}
                          >
                            <MaterialIcons name="edit" size={16} color="#1f9c8b" />
                            <Text style={[styles.actionButtonText, { color: "#1f9c8b" }]}>
                              {i18n.t("customer.appointments.requestReschedule")}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Service Request Form */}
          {home.showServiceRequest && (
            <View style={styles.expandedSection}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons name="construction" size={20} color="#1f9c8b" />
                <Text style={styles.sectionTitle}>{i18n.t("customer.serviceRequest.title")}</Text>
              </View>
              
              <View style={[styles.card, styles.serviceRequestCard]}>
                {/* Service Type Selection */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{i18n.t("customer.serviceRequest.form.serviceType")}</Text>
                  <TouchableOpacity
                    style={styles.dropdownSelector}
                    onPress={() => home.setShowServiceDropdown(true)}
                  >
                    <View style={styles.dropdownContent}>
                      <View style={[
                        styles.serviceTypeIcon,
                        { backgroundColor: `${home.selectedService.color}15` }
                      ]}>
                        <MaterialIcons name={home.selectedService.icon} size={20} color={home.selectedService.color} />
                      </View>
                      <View style={styles.dropdownText}>
                        <Text style={styles.dropdownLabel}>{home.selectedService.label}</Text>
                        <Text style={styles.dropdownDescription}>{home.selectedService.description}</Text>
                      </View>
                    </View>
                    <MaterialIcons name="expand-more" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* Special Service Subtype */}
                {home.serviceType === "special" && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>{i18n.t("customer.serviceRequest.form.specificServiceType")}</Text>
                    <TouchableOpacity
                      style={styles.dropdownSelector}
                      onPress={() => home.setShowSpecialSubtypeDropdown(true)}
                    >
                      <View style={styles.dropdownContent}>
                        {home.specialServiceSubtype ? (
                          <>
                            {home.getIconComponent(home.specialServiceSubtype)}
                            <Text style={styles.dropdownLabel}>
                              {home.specialServiceSubtypes.find(s => s.id === home.specialServiceSubtype)?.label}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.dropdownPlaceholder}>{i18n.t("customer.serviceRequest.form.selectService")}</Text>
                        )}
                      </View>
                      <MaterialIcons name="expand-more" size={24} color="#666" />
                    </TouchableOpacity>
                    {/* Other Pest Name Input */}
                    {home.specialServiceSubtype === "other" && (
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>{i18n.t("customer.serviceRequest.specialService.specifyPest")}</Text>
                        <TextInput
                          style={styles.simpleInput}
                          placeholder={i18n.t("customer.serviceRequest.specialService.pestPlaceholder")}
                          placeholderTextColor="#999"
                          value={home.otherPestName}
                          onChangeText={home.setOtherPestName}
                          maxLength={50}
                        />
                      </View>
                    )}
                  </View>
                )}

                {/* Urgency Selection */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{i18n.t("customer.serviceRequest.form.urgency")}</Text>
                  <View style={styles.urgencyGrid}>
                    {home.urgencyOptions.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.urgencyOption,
                          home.urgency === option.id && styles.urgencyOptionSelected,
                          { borderColor: option.color }
                        ]}
                        onPress={() => home.setUrgency(option.id)}
                      >
                        <View style={styles.urgencyContent}>
                          <Feather 
                            name={option.icon} 
                            size={18} 
                            color={home.urgency === option.id ? '#fff' : option.color} 
                          />
                          <Text style={[
                            styles.urgencyLabel,
                            { color: home.urgency === option.id ? '#fff' : option.color }
                          ]}>
                            {option.label}
                          </Text>
                        </View>
                        <Text style={[
                          styles.urgencyDescription,
                          { color: home.urgency === option.id ? 'rgba(255,255,255,0.9)' : '#666' }
                        ]}>
                          {option.description}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Description */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{i18n.t("customer.serviceRequest.form.description")}</Text>
                  <TextInput
                    style={styles.simpleTextArea}
                    placeholder={i18n.t("customer.serviceRequest.form.descriptionPlaceholder")}
                    placeholderTextColor="#999"
                    value={home.description}
                    onChangeText={home.setDescription}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* Preferred Date & Time */}
                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.formLabel}>{i18n.t("customer.serviceRequest.form.preferredDate")}</Text>
                    <TextInput
                      style={styles.simpleInput}
                      placeholder={i18n.t("customer.serviceRequest.form.preferredDatePlaceholder")}
                      placeholderTextColor="#999"
                      value={home.preferredDate}
                      onChangeText={(text) => {
                        // Remove all non-digit characters
                        const digits = text.replace(/\D/g, "");
                        
                        let formatted = digits;
                        
                        // Format as YYYY-MM-DD automatically
                        if (digits.length >= 5) {
                          formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}`;
                        }
                        if (digits.length >= 7) {
                          formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
                        }
                        
                        home.setPreferredDate(formatted);
                      }}
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.formLabel}>{i18n.t("customer.serviceRequest.form.preferredTime")}</Text>
                    <TextInput
                      style={styles.simpleInput}
                      placeholder={i18n.t("customer.serviceRequest.form.preferredTimePlaceholder")}
                      placeholderTextColor="#999"
                      value={home.preferredTime}
                      keyboardType="number-pad"
                      maxLength={5}
                      onChangeText={(text) => {
                        // Remove everything except digits
                        const digits = text.replace(/\D/g, "");

                        let formatted = digits;

                        if (digits.length >= 3) {
                          formatted = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
                        }

                        home.setPreferredTime(formatted);
                      }}
                    />
                  </View>
                </View>

                {/* Optional Image Upload */}
                <View style={{ alignItems: "center", marginTop: 20 }}>
                  <TouchableOpacity
                    style={{ alignItems: "center" }}
                    onPress={home.openserviceRequestImagesChooser}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="add-a-photo" size={30} color="#1f9c8b" />
                    <Text style={{ marginTop: 6, fontSize: 14, fontWeight: "600", color: "#1f9c8b" }}>
                      {home.serviceRequestImages.length > 0
                        ? i18n.t("customer.serviceRequest.form.addMorePhotos")
                        : i18n.t("customer.serviceRequest.form.addPhotos")}
                    </Text>
                  </TouchableOpacity>

                  {home.serviceRequestImages.length > 0 && (
                    <View style={{ marginTop: 15, width: "100%" }}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {home.serviceRequestImages.map((img, index) => (
                          <View
                            key={index}
                            style={{
                              marginRight: 10,
                              position: "relative",
                            }}
                          >
                            <Image
                              source={{ uri: img.uri }}
                              style={{
                                width: 120,
                                height: 120,
                                borderRadius: 10,
                              }}
                              resizeMode="cover"
                            />

                            {/* Remove single image */}
                            <TouchableOpacity
                              style={{
                                position: "absolute",
                                top: -6,
                                right: -6,
                                backgroundColor: "#e74c3c",
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              onPress={() => {
                                const updated = home.serviceRequestImages.filter(
                                  (_, i) => i !== index
                                );
                                home.setServiceRequestImages(updated);
                              }}
                            >
                              <MaterialIcons name="close" size={16} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!home.description.trim() || 
                    (home.serviceType === "special" && !home.specialServiceSubtype)) && 
                    styles.submitButtonDisabled
                  ]}
                  onPress={home.handleServiceRequest}
                  disabled={home.submittingRequest || 
                    !home.description.trim() || 
                    (home.serviceType === "special" && !home.specialServiceSubtype)
                  }
                >
                  {home.submittingRequest ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="send" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>{i18n.t("customer.serviceRequest.form.submit")}</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={styles.formNote}>
                  {i18n.t("customer.serviceRequest.form.note")}
                </Text>
              </View>
            </View>
          )}

          {/* Contact Us Section */}
          {home.showContactForm && (
            <View style={styles.expandedSection}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons name="contact-page" size={20} color="#1f9c8b" />
                <Text style={styles.sectionTitle}>{i18n.t("customer.contact.title")}</Text>
              </View>
              
              <View style={[styles.card, styles.contactCard]}>
                <View style={styles.contactHeader}>
                  <MaterialIcons name="support-agent" size={20} color="#1f9c8b" />
                  <Text style={styles.contactTitle}>{i18n.t("customer.contact.support")}</Text>
                </View>
                
                <Text style={styles.contactSubtitle}>
                  {i18n.t("customer.contact.subtitle")}
                </Text>

                {/* Phone Number Section */}
                <View style={styles.phoneSection}>
                  <View style={styles.phoneHeader}>
                    <MaterialIcons name="phone" size={20} color="#1f9c8b" />
                    <Text style={styles.phoneTitle}>{i18n.t("customer.contact.phone.title")}</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.phoneButton}
                    onPress={home.handleCallPhone}
                  >
                    <MaterialIcons name="call" size={20} color="#fff" />
                    <Text style={styles.phoneNumberText}>{i18n.t("customer.contact.phone.number")}</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.phoneNote}>
                    {i18n.t("customer.contact.phone.note")}
                  </Text>
                </View>

                {/* Email Section */}
                <View style={styles.emailSection}>
                  <View style={styles.emailHeader}>
                    <MaterialIcons name="email" size={20} color="#1f9c8b" />
                    <Text style={styles.emailTitle}>{i18n.t("customer.contact.email.title")}</Text>
                  </View>
                  
                  <Text style={styles.emailRecipient}>
                    {i18n.t("customer.contact.email.recipient", { email: "info@pestify.gr" })}
                  </Text>

                  <TextInput
                    style={styles.simpleInput}
                    placeholder={i18n.t("customer.contact.email.subjectPlaceholder")}
                    placeholderTextColor="#999"
                    value={home.emailSubject}
                    onChangeText={home.setEmailSubject}
                  />

                  <TextInput
                    style={styles.simpleTextArea}
                    placeholder={i18n.t("customer.contact.email.messagePlaceholder")}
                    placeholderTextColor="#999"
                    value={home.emailBody}
                    onChangeText={home.setEmailBody}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (!home.emailSubject.trim() || !home.emailBody.trim()) && styles.sendButtonDisabled
                    ]}
                    onPress={home.handleSendEmail}
                    disabled={home.sendingEmail || !home.emailSubject.trim() || !home.emailBody.trim()}
                  >
                    {home.sendingEmail ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="send" size={18} color="#fff" />
                        <Text style={styles.sendButtonText}>{i18n.t("customer.contact.email.send")}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <Text style={styles.emailNote}>
                    {i18n.t("customer.contact.email.note")}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Account Settings Section */}
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="settings" size={20} color="#1f9c8b" />
            <Text style={styles.sectionTitle}>{i18n.t("customer.account.title")}</Text>
          </View>
          
          {/* Account Settings Button */}
          <TouchableOpacity
            style={styles.accountButton}
            onPress={home.togglePasswordForm}
          >
            <Ionicons name="key" size={20} color="#1f9c8b" />
            <Text style={styles.accountButtonText}>{i18n.t("customer.account.security")}</Text>
            <MaterialIcons 
              name={home.showPasswordForm ? "expand-less" : "expand-more"} 
              size={24} 
              color="#1f9c8b" 
            />
          </TouchableOpacity>

          {/* Change Password Form */}
          {home.showPasswordForm && (
            <View style={[styles.card, styles.passwordCard]}>
              <View style={styles.passwordHeader}>
                <MaterialIcons name="lock" size={20} color="#1f9c8b" />
                <Text style={styles.passwordTitle}>{i18n.t("customer.account.changePassword.title")}</Text>
              </View>
              
              <Text style={styles.passwordSubtitle}>
                {i18n.t("customer.account.changePassword.subtitle")}
              </Text>

              {/* Current Password Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{i18n.t("customer.account.changePassword.currentPassword")}</Text>
                <TextInput
                  style={styles.simpleInput}
                  placeholder={i18n.t("customer.account.changePassword.currentPlaceholder")}
                  placeholderTextColor="#999"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  value={home.currentPassword}
                  onChangeText={(text) => home.setCurrentPassword(text)}
                />
              </View>

              {/* New Password Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{i18n.t("customer.account.changePassword.newPassword")}</Text>
                <TextInput
                  style={styles.simpleInput}
                  placeholder={i18n.t("customer.account.changePassword.newPlaceholder")}
                  placeholderTextColor="#999"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  value={home.newPassword}
                  onChangeText={(text) => home.setNewPassword(text)}
                />
                {home.newPassword.length > 0 && home.newPassword.length < 8 && (
                  <Text style={styles.validationError}>
                    {i18n.t("customer.account.changePassword.validation.minLength")}
                  </Text>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{i18n.t("customer.account.changePassword.confirmPassword")}</Text>
                <TextInput
                  style={[
                    styles.simpleInput,
                    home.confirmPassword && home.newPassword !== home.confirmPassword && styles.inputError
                  ]}
                  placeholder={i18n.t("customer.account.changePassword.confirmPlaceholder")}
                  placeholderTextColor="#999"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  value={home.confirmPassword}
                  onChangeText={(text) => home.setConfirmPassword(text)}
                />
                {home.confirmPassword && home.newPassword !== home.confirmPassword && (
                  <Text style={styles.validationError}>
                    {i18n.t("customer.account.changePassword.validation.mismatch")}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.updateButton,
                  (!home.currentPassword || !home.newPassword || !home.confirmPassword || 
                  home.newPassword.length < 8 || home.newPassword !== home.confirmPassword) && 
                  styles.updateButtonDisabled
                ]}
                onPress={home.handleChangePassword}
                disabled={home.changingPassword || 
                  !home.currentPassword || 
                  !home.newPassword || 
                  !home.confirmPassword ||
                  home.newPassword.length < 8 ||
                  home.newPassword !== home.confirmPassword
                }
              >
                {home.changingPassword ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="update" size={18} color="#fff" />
                    <Text style={styles.updateButtonText}>{i18n.t("customer.account.changePassword.updateButton")}</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <Text style={styles.passwordNote}>
                {i18n.t("customer.account.changePassword.note")}
              </Text>
            </View>
          )}

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={home.onLogout}
          >
            <MaterialIcons name="logout" size={20} color="#fff" />
            <Text style={styles.logoutText}>{i18n.t("customer.logout")}</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {i18n.t("customer.footer.text")}
            </Text>
            <Text style={styles.footerCopyright}>
              {i18n.t("customer.footer.copyright", { year: new Date().getFullYear() })}
            </Text>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* NOTIFICATION DETAILS MODAL */}
      <Modal
        visible={home.showNotificationDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => home.setShowNotificationDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notificationModalCard}>
            {home.selectedNotification && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.notificationModalHeader}>
                    <View style={[
                      styles.notificationModalIcon,
                      { backgroundColor: home.getNotificationColor(home.selectedNotification) + '20' }
                    ]}>
                      <MaterialIcons 
                        name={home.getNotificationIcon(home.selectedNotification)} 
                        size={28} 
                        color={home.getNotificationColor(home.selectedNotification)} 
                      />
                    </View>
                    <View style={styles.notificationModalTitleContainer}>
                      <Text style={styles.notificationModalTitle}>
                        {home.selectedNotification.title}
                      </Text>
                      <Text style={styles.notificationModalTime}>
                        {home.formatTimeAgo(home.selectedNotification.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    onPress={() => home.setShowNotificationDetails(false)}
                    style={styles.modalCloseButton}
                  >
                    <MaterialIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.notificationModalBody}>
                  <Text style={styles.notificationModalDescription}>
                    {home.selectedNotification.description}
                  </Text>
                  
                  {/* Show appointment details if it's an appointment notification */}
                  {home.selectedNotification.appointmentId && (
                    <View style={styles.appointmentDetailsSection}>
                      <Text style={styles.appointmentDetailsTitle}>
                        {i18n.t("customer.modals.notificationDetails.appointmentDetails")}
                      </Text>
                      
                      <View style={styles.detailRow}>
                        <MaterialIcons name="event" size={18} color="#666" />
                        <Text style={styles.detailLabel}>{i18n.t("customer.modals.notificationDetails.date")}</Text>
                        <Text style={styles.detailValue}>
                          {home.formatDisplayDate(home.selectedNotification.appointmentDate)}
                        </Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <MaterialIcons name="access-time" size={18} color="#666" />
                        <Text style={styles.detailLabel}>{i18n.t("customer.modals.notificationDetails.time")}</Text>
                        <Text style={styles.detailValue}>
                          {formatTime(home.selectedNotification.appointmentTime)}
                        </Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <MaterialIcons name="construction" size={18} color="#666" />
                        <Text style={styles.detailLabel}>{i18n.t("customer.modals.notificationDetails.service")}</Text>
                        <Text style={styles.detailValue}>
                          {home.selectedNotification?.serviceType ? 
                            home.getServiceTypeLabel(
                              home.selectedNotification.serviceType,
                              home.selectedNotification.specialServiceSubtype,
                              home.selectedNotification.otherPestName
                            ) : 
                            getServiceFromDescription(home.selectedNotification?.description)
                          }
                        </Text>
                      </View>
                      
                      {home.selectedNotification.technician && (
                        <View style={styles.detailRow}>
                          <MaterialIcons name="engineering" size={18} color="#666" />
                          <Text style={styles.detailLabel}>{i18n.t("customer.modals.notificationDetails.technician")}</Text>
                          <Text style={styles.detailValue}>
                            {home.selectedNotification.technician}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  
                  {/* Action buttons based on notification type */}
                  <View style={styles.notificationActions}>
                    {(home.selectedNotification.type === 'appointment_created' || 
                      home.selectedNotification.type === 'appointment_updated') && (
                      <TouchableOpacity
                        style={styles.notificationActionButton}
                        onPress={async () => {
                          home.setShowNotificationDetails(false);
                          if (home.appointments.length === 0) {
                            await home.loadAppointments();
                          }
                          home.setShowAppointments(true);                   
                        }}
                      >
                        <MaterialIcons name="event" size={20} color="#fff" />
                        <Text style={styles.notificationActionButtonText}>
                          {i18n.t("customer.modals.notificationDetails.viewAppointments")}
                        </Text>
                      </TouchableOpacity>
                    )}
                    
                    {home.selectedNotification.type === 'appointment_completed' && (
                      <TouchableOpacity
                        style={styles.notificationActionButton}
                        onPress={() => {
                          home.setShowNotificationDetails(false);
                          home.onViewVisits();
                        }}
                      >
                        <MaterialIcons name="history" size={20} color="#fff" />
                        <Text style={styles.notificationActionButtonText}>
                          {i18n.t("customer.modals.notificationDetails.viewHistory")}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Service Type Modal */}
      <Modal
        visible={home.showServiceDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => home.setShowServiceDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => home.setShowServiceDropdown(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.t("customer.modals.selectService.title")}</Text>
              <TouchableOpacity 
                onPress={() => home.setShowServiceDropdown(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={home.serviceTypes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    home.serviceType === item.id && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    home.setServiceType(item.id);
                    home.setSpecialServiceSubtype(null);
                    home.setOtherPestName("");
                    home.setShowServiceDropdown(false);
                  }}
                >
                  <View style={[
                    styles.modalItemIcon,
                    { backgroundColor: `${item.color}15` }
                  ]}>
                    <MaterialIcons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={styles.modalItemContent}>
                    <Text style={[
                      styles.modalItemLabel,
                      home.serviceType === item.id && styles.modalItemLabelSelected
                    ]}>
                      {item.label}
                    </Text>
                    <Text style={styles.modalItemDescription}>
                      {item.description}
                    </Text>
                  </View>
                  {home.serviceType === item.id && (
                    <MaterialIcons name="check-circle" size={20} color={item.color} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Special Service Subtype Modal */}
      <Modal
        visible={home.showSpecialSubtypeDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => home.setShowSpecialSubtypeDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => home.setShowSpecialSubtypeDropdown(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.t("customer.modals.selectSpecificService.title")}</Text>
              <TouchableOpacity 
                onPress={() => home.setShowSpecialSubtypeDropdown(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={home.specialServiceSubtypes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    home.specialServiceSubtype === item.id && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    home.setSpecialServiceSubtype(item.id);
                    home.setShowSpecialSubtypeDropdown(false);
                  }}
                >
                  {(() => {
                    // Dynamic icon rendering based on library
                    switch (item.library) {
                      case "FontAwesome5":
                        return <FontAwesome5 name={item.icon} size={20} color="#666" />;
                      case "Feather":
                        return <Feather name={item.icon} size={20} color="#666" />;
                      case "Entypo":
                        return <Entypo name={item.icon} size={20} color="#666" />;
                      case "MaterialCommunityIcons":
                        return <MaterialCommunityIcons name={item.icon} size={20} color="#666" />;
                      case "MaterialIcons":
                        return <MaterialIcons name={item.icon} size={20} color="#666" />;
                      default:
                        return <MaterialIcons name="help-outline" size={20} color="#666" />;
                    }
                  })()}
                  <Text style={[
                    styles.modalItemLabel,
                    home.specialServiceSubtype === item.id && styles.modalItemLabelSelected
                  ]}>
                    {item.label}
                  </Text>
                  {home.specialServiceSubtype === item.id && (
                    <MaterialIcons name="check-circle" size={20} color="#1f9c8b" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        visible={home.showRescheduleModal}
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={() => home.setShowRescheduleModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          <View style={styles.modalOverlay}>
            {/* Backdrop */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => home.setShowRescheduleModal(false)}
            />

            {/* Modal Card */}
            <Pressable style={styles.modalCard} onPress={() => {}}>
              {/* HEADER */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{i18n.t("customer.modals.reschedule.title")}</Text>
                <TouchableOpacity
                  onPress={() => home.setShowRescheduleModal(false)}
                  style={styles.modalCloseButton}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* BODY */}
              <View style={styles.modalBody}>
                {/* New Date */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{i18n.t("customer.modals.reschedule.newDate")}</Text>
                  <TextInput
                    style={styles.simpleInput}
                    placeholder={i18n.t("customer.modals.reschedule.newDatePlaceholder")}
                    placeholderTextColor="#999"
                    value={home.newAppointmentDate}
                    onChangeText={(text) => {
                      // Remove all non-digit characters
                      const digits = text.replace(/\D/g, "");
                      
                      let formatted = digits;
                      
                      // Format as YYYY-MM-DD automatically
                      if (digits.length >= 5) {
                        formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}`;
                      }
                      if (digits.length >= 7) {
                        formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
                      }
                      
                      home.setNewAppointmentDate(formatted);
                    }}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>

                {/* New Time */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{i18n.t("customer.modals.reschedule.newTime")}</Text>
                  <TextInput
                    style={styles.simpleInput}
                    placeholder={i18n.t("customer.modals.reschedule.newTimePlaceholder")}
                    placeholderTextColor="#999"
                    value={home.newAppointmentTime}
                    keyboardType="number-pad"
                    maxLength={5}
                    onChangeText={(text) => {
                      // Remove everything except digits
                      const digits = text.replace(/\D/g, "");

                      let formatted = digits;

                      if (digits.length >= 3) {
                        formatted = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
                      }

                      home.setNewAppointmentTime(formatted);
                    }}
                  />
                </View>

                {/* Submit */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!home.newAppointmentDate || !home.newAppointmentTime) &&
                      styles.submitButtonDisabled
                  ]}
                  onPress={() => home.handleRescheduleAppointment(home.selectedAppointment)}
                  disabled={!home.newAppointmentDate || !home.newAppointmentTime || home.rescheduling}
                >
                  {home.rescheduling ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="send" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>
                        {i18n.t("customer.modals.reschedule.submit")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}