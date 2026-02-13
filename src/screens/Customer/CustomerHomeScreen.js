// CustomerHomeScreen.js - Update the import statement
import React from "react";
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
    if (!description) return 'Service';
    
    const desc = description.toLowerCase();
    if (desc.includes('disinfection')) return 'Disinfection';
    if (desc.includes('insecticide')) return 'Insecticide';
    if (desc.includes('special service')) return 'Special Service';
    if (desc.includes('myocide')) return 'Myocide';
    if (desc.includes('appointment')) {
      // Extract service type from appointment completed notifications
      const match = description.match(/Your (.*?) appointment has been completed/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return 'Service'; // default
  };


  if (home.loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1f9c8b" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
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
          <Text style={styles.title}>Dashboard unavailable</Text>
        </View>
        <View style={styles.content}>
          <TouchableOpacity style={styles.logoutButton} onPress={home.onLogout}>
            <Text style={styles.logoutText}>Logout</Text>
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
      
      // Convert to local date string
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
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
                  else name = "C";
                  
                  return name.charAt(0).toUpperCase();
                })()}
              </Text>
              {home.notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{home.notificationCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
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
                
                return "Customer";
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
            <Text style={styles.sectionTitle}>Compliance Status</Text>
          </View>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome5 name="shield-alt" size={16} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {(home.dashboard.compliance?.status || 'pending').toUpperCase()}
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
                {home.dashboard.compliance?.status === "compliant" && "Your certificate is valid"}
                {home.dashboard.compliance?.status === "pending" && "A renewal is in progress"}
                {home.dashboard.compliance?.status === "non-compliant" && "Your certificate has expired"}
              </Text>
            </View>
            {home.dashboard.customer?.complianceValidUntil && (
  <Text style={styles.validUntilText}>
    Valid until{" "}
    <Text style={styles.validUntilDate}>
      {formatDate(home.dashboard.customer.complianceValidUntil)}
    </Text>
  </Text>
)}

            {/* Last Visit Section */}
            <View style={styles.visitMeta}>
              <View style={styles.visitMetaRow}>
                <MaterialIcons name="history" size={18} color="#1f9c8b" />
                <Text style={styles.visitMetaLabel}>Last Visit:</Text>
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
                    <Text style={styles.noAppointmentText}>No visits yet</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.visitMetaRow}>
                <MaterialIcons name="event" size={18} color="#1f9c8b" />
                <Text style={styles.visitMetaLabel}>Next Scheduled:</Text>
                <View style={styles.visitMetaValueContainer}>
                  {home.dashboard?.nextAppointment?.date ? (
                    <Text style={styles.visitDateText}>
                      {home.formatDisplayDate(home.dashboard.nextAppointment.date)}
                    </Text>
                  ) : (
                    <Text style={styles.noAppointmentText}>Not scheduled</Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* NOTIFICATIONS SECTION */}
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="notifications" size={20} color="#1f9c8b" />
            <Text style={styles.sectionTitle}>Notifications</Text>
            {home.notificationCount > 0 && (
              <View style={styles.notificationCountBadge}>
                <Text style={styles.notificationCountText}>{home.notificationCount} new</Text>
              </View>
            )}
            {home.notifications.length > 0 && (
              <>
                <TouchableOpacity 
                  style={styles.notificationsToggleButton}
                  onPress={home.toggleNotifications}
                >
                  <Text style={styles.notificationsToggleText}>
                    {home.showNotifications ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
                
                {home.notificationCount > 0 && home.showNotifications && (
                  <TouchableOpacity 
                    style={styles.markAllReadButton}
                    onPress={() => {
                      console.log("DEBUG: Mark All button pressed");  // Add this for testing
                      home.markAllNotificationsAsRead();
                    }}
                  >
                    <Text style={styles.markAllReadText}>Mark All Read</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {home.notifications.length === 0 ? (
            <View style={[styles.card, styles.emptyNotificationsCard]}>
              <MaterialIcons name="notifications-off" size={48} color="#ddd" />
              <Text style={styles.emptyNotificationsTitle}>No Notifications</Text>
              <Text style={styles.emptyNotificationsText}>
                You don't have any notifications yet.
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
                    {home.showAllNotifications ? 'Show less' : `View all ${home.notifications.length} notifications`}
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
                    {home.notificationCount > 0 ? `${home.notificationCount} New Notifications` : 'Recent Notifications'}
                  </Text>
                  <Text style={styles.notificationsPreviewSubtitle}>
                    Tap to view {home.notificationCount > 0 ? 'new' : 'recent'} notifications
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#666" />
              </View>
            </TouchableOpacity>
          )}

          {/* Quick Actions */}
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="dashboard" size={20} color="#1f9c8b" />
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={home.onViewVisits}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialIcons name="history" size={24} color="#1f9c8b" />
              </View>
              <Text style={styles.quickActionText}>Visit History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={home.toggleAppointments}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialIcons name="event" size={24} color="#1f9c8b" />
              </View>
              <Text style={styles.quickActionText}>Appointments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={home.toggleServiceRequest}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialIcons name="add-circle" size={24} color="#1f9c8b" />
              </View>
              <Text style={styles.quickActionText}>Request Service</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={home.toggleContactForm}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialIcons name="support-agent" size={24} color="#1f9c8b" />
              </View>
              <Text style={styles.quickActionText}>Contact Us</Text>
            </TouchableOpacity>
          </View>

          {/* Upcoming Appointments Section */}
          {home.showAppointments && (
            <View style={styles.expandedSection}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons name="event" size={20} color="#1f9c8b" />
                <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
              </View>
              
              {home.appointments.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <MaterialIcons name="event-busy" size={48} color="#ddd" />
                  <Text style={styles.emptyStateTitle}>No Upcoming Appointments</Text>
                  <Text style={styles.emptyStateText}>
                    You don't have any scheduled appointments. Request a service to get started.
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
                          <Text style={styles.technicianText}>Technician: {appointment.technician}</Text>
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
                              Request Reschedule
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
                <Text style={styles.sectionTitle}>Request New Service</Text>
              </View>
              
              <View style={[styles.card, styles.serviceRequestCard]}>
                {/* Service Type Selection */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Service Type *</Text>
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
                    <Text style={styles.formLabel}>Specific Service Type *</Text>
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
                          <Text style={styles.dropdownPlaceholder}>Select service type</Text>
                        )}
                      </View>
                      <MaterialIcons name="expand-more" size={24} color="#666" />
                    </TouchableOpacity>
                    {/* Other Pest Name Input */}
                    {home.specialServiceSubtype === "other" && (
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Specify Pest Name *</Text>
                        <TextInput
                          style={styles.simpleInput}
                          placeholder="e.g., Ants, Spiders, Cockroaches, etc."
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
                  <Text style={styles.formLabel}>Urgency</Text>
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
                  <Text style={styles.formLabel}>Problem Description *</Text>
                  <TextInput
                    style={styles.simpleTextArea}
                    placeholder="Please describe the pest problem or service needed..."
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
                    <Text style={styles.formLabel}>Preferred Date (optional)</Text>
                    <TextInput
                      style={styles.simpleInput}
                      placeholder="YYYY-MM-DD"
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
                    <Text style={styles.formLabel}>Preferred Time (optional)</Text>
                    <TextInput
                      style={styles.simpleInput}
                      placeholder="HH:MM"
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
                      <Text style={styles.submitButtonText}>Submit Service Request</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={styles.formNote}>
                  * Required fields. Our team will contact you within 24 hours to confirm details.
                </Text>
              </View>
            </View>
          )}

          {/* Contact Us Section */}
          {home.showContactForm && (
            <View style={styles.expandedSection}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons name="contact-page" size={20} color="#1f9c8b" />
                <Text style={styles.sectionTitle}>Contact Us</Text>
              </View>
              
              <View style={[styles.card, styles.contactCard]}>
                <View style={styles.contactHeader}>
                  <MaterialIcons name="support-agent" size={20} color="#1f9c8b" />
                  <Text style={styles.contactTitle}>Contact Support</Text>
                </View>
                
                <Text style={styles.contactSubtitle}>
                  Need help? Send us an email or give us a call
                </Text>

                {/* Phone Number Section */}
                <View style={styles.phoneSection}>
                  <View style={styles.phoneHeader}>
                    <MaterialIcons name="phone" size={20} color="#1f9c8b" />
                    <Text style={styles.phoneTitle}>Call Us</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.phoneButton}
                    onPress={home.handleCallPhone}
                  >
                    <MaterialIcons name="call" size={20} color="#fff" />
                    <Text style={styles.phoneNumberText}>+30 698 624 4371</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.phoneNote}>
                    Tap to call our support team directly
                  </Text>
                </View>

                {/* Email Section */}
                <View style={styles.emailSection}>
                  <View style={styles.emailHeader}>
                    <MaterialIcons name="email" size={20} color="#1f9c8b" />
                    <Text style={styles.emailTitle}>Send Email</Text>
                  </View>
                  
                  <Text style={styles.emailRecipient}>
                    Email will be sent to: <Text style={styles.emailRecipientBold}>info@pest-free.gr</Text>
                  </Text>

                  <TextInput
                    style={styles.simpleInput}
                    placeholder="Subject"
                    placeholderTextColor="#999"
                    value={home.emailSubject}
                    onChangeText={home.setEmailSubject}
                  />

                  <TextInput
                    style={styles.simpleTextArea}
                    placeholder="Your message"
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
                        <Text style={styles.sendButtonText}>Send Email</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <Text style={styles.emailNote}>
                    • Your default email app will open with pre-filled content
                    {"\n"}• Make sure to review before sending
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Account Settings Section */}
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="settings" size={20} color="#1f9c8b" />
            <Text style={styles.sectionTitle}>Account Settings</Text>
          </View>
          
          {/* Account Settings Button */}
          <TouchableOpacity
            style={styles.accountButton}
            onPress={home.togglePasswordForm}
          >
            <Ionicons name="key" size={20} color="#1f9c8b" />
            <Text style={styles.accountButtonText}>Security Settings</Text>
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
                <Text style={styles.passwordTitle}>Change Password</Text>
              </View>
              
              <Text style={styles.passwordSubtitle}>
                For security reasons, please update your password regularly
              </Text>

              {/* Current Password Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Current Password *</Text>
                <TextInput
                  style={styles.simpleInput}
                  placeholder="Enter your current password"
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
                <Text style={styles.formLabel}>New Password *</Text>
                <TextInput
                  style={styles.simpleInput}
                  placeholder="Enter new password (min. 6 characters)"
                  placeholderTextColor="#999"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  value={home.newPassword}
                  onChangeText={(text) => home.setNewPassword(text)}
                />
                {home.newPassword.length > 0 && home.newPassword.length < 6 && (
                  <Text style={styles.validationError}>
                    Password must be at least 6 characters
                  </Text>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Confirm New Password *</Text>
                <TextInput
                  style={[
                    styles.simpleInput,
                    home.confirmPassword && home.newPassword !== home.confirmPassword && styles.inputError
                  ]}
                  placeholder="Re-enter new password"
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
                    Passwords do not match
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.updateButton,
                  (!home.currentPassword || !home.newPassword || !home.confirmPassword || 
                  home.newPassword.length < 6 || home.newPassword !== home.confirmPassword) && 
                  styles.updateButtonDisabled
                ]}
                onPress={home.handleChangePassword}
                disabled={home.changingPassword || 
                  !home.currentPassword || 
                  !home.newPassword || 
                  !home.confirmPassword ||
                  home.newPassword.length < 6 ||
                  home.newPassword !== home.confirmPassword
                }
              >
                {home.changingPassword ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="update" size={18} color="#fff" />
                    <Text style={styles.updateButtonText}>Update Password</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <Text style={styles.passwordNote}>
                • Password must be at least 6 characters long
                {"\n"}• Use a combination of letters and numbers for better security
              </Text>
            </View>
          )}

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={home.onLogout}
          >
            <MaterialIcons name="logout" size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Pest - Free Customer Portal • v1.0
            </Text>
            <Text style={styles.footerCopyright}>
              © {new Date().getFullYear()} Pest-Free. All rights reserved.
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
                        Appointment Details
                      </Text>
                      
                      <View style={styles.detailRow}>
                        <MaterialIcons name="event" size={18} color="#666" />
                        <Text style={styles.detailLabel}>Date:</Text>
                        <Text style={styles.detailValue}>
                          {home.formatDisplayDate(home.selectedNotification.appointmentDate)}
                        </Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <MaterialIcons name="access-time" size={18} color="#666" />
                        <Text style={styles.detailLabel}>Time:</Text>
                        <Text style={styles.detailValue}>
                          {formatTime(home.selectedNotification.appointmentTime)}
                        </Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <MaterialIcons name="construction" size={18} color="#666" />
                        <Text style={styles.detailLabel}>Service:</Text>
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
                          <Text style={styles.detailLabel}>Technician:</Text>
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
                          View Appointments
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
                          View Visit History
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
              <Text style={styles.modalTitle}>Select Service Type</Text>
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
              <Text style={styles.modalTitle}>Select Specific Service</Text>
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
                <Text style={styles.modalTitle}>Request Appointment Reschedule</Text>
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
                  <Text style={styles.formLabel}>New Preferred Date *</Text>
                  <TextInput
                    style={styles.simpleInput}
                    placeholder="YYYY-MM-DD"
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
                  <Text style={styles.formLabel}>New Preferred Time *</Text>
                  <TextInput
                    style={styles.simpleInput}
                    placeholder="HH:MM"
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
                        Submit Reschedule Request
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