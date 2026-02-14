// TechnicianHomeScreen.js - Professional Styled Version
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import apiService from "../../services/apiService";
import pestfreeLogo from "../../../assets/pestfree_logo.png";
import { useFocusEffect } from '@react-navigation/native';
import { Modal, TextInput } from 'react-native';

LocaleConfig.locales['en'] = {
  monthNames: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  monthNamesShort: [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ],
  dayNames: [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ],
  dayNamesShort: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  today: 'Today'
};
LocaleConfig.defaultLocale = 'en';

export default function TechnicianHomeScreen({
  technician,
  onLogout,
  onSelectCustomer,
  onEditCustomer,
}) {
  const [customers, setCustomers] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [todayAppointments, setTodayAppointments] = useState([]);
  const technicianId = technician?.technicianId || technician?.id;
  const todayStr = new Date().toISOString().split("T")[0];
  const onDayPress = (day) => {
    console.log("📅 Day pressed:", day.dateString); // Should be "2026-01-10"
    setSelectedDate(day.dateString);
  };
  const [loadingAppointmentId, setLoadingAppointmentId] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({
    customerName: '',
    address: '',
    email: '',
    complianceValidUntil: ''
  });
  const [loadingCustomerDetails, setLoadingCustomerDetails] = useState(false);
  const [updatingCustomer, setUpdatingCustomer] = useState(false);

  const formatTime = (timeStr) => {
    if (!timeStr) return "";

    // HH:MM → already correct
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }

    // HH:MM:SS → strip seconds
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr.slice(0, 5);
    }

    // ISO timestamp → extract HH:MM
    try {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return `${d.getHours().toString().padStart(2, "0")}:${d
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;
      }
    } catch {}

    return timeStr;
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    updateMarkedDates();
    updateTodayAppointments();
  }, [appointments, selectedDate]);

  useEffect(() => {
    console.log("🔍 DEBUG - Selected date:", selectedDate);
    console.log("🔍 DEBUG - Appointments:", appointments.map(a => ({
      id: a.id,
      date: a.date,
      time: a.time,
      formattedDate: a.date ? new Date(a.date).toISOString().split('T')[0] : 'no-date'
    })));
    
    updateTodayAppointments();
  }, [appointments, selectedDate]);

  // In TechnicianHomeScreen.js - When appointments are loaded
  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load customers - ADD DEBUGGING
      console.log("🔍 Loading customers...");
      const customersResult = await apiService.getCustomers();
      
      console.log("🔍 Raw customers result:", customersResult);
      console.log("🔍 Is array?", Array.isArray(customersResult));
      console.log("🔍 Type of result:", typeof customersResult);
      
      // Handle different response formats
      let customersArray = [];
      
      if (Array.isArray(customersResult)) {
        customersArray = customersResult;
        console.log("✅ Using direct array");
      } else if (customersResult && Array.isArray(customersResult.data)) {
        customersArray = customersResult.data;
        console.log("✅ Using result.data array");
      } else if (customersResult && customersResult.success && Array.isArray(customersResult.customers)) {
        customersArray = customersResult.customers;
        console.log("✅ Using result.customers array");
      } else {
        console.warn("⚠️ Unexpected customers format, defaulting to empty array");
        customersArray = [];
      }
      
      console.log(`✅ Setting ${customersArray.length} customers`);
      setCustomers(customersArray);

      // 🔴 CHANGE: Load ALL appointments for this technician
      const scheduleResult = await apiService.getAppointments({
        technicianId: technician.id
      });

      // 🔍 DEBUG: Check what fields are in the appointments
      if (scheduleResult && scheduleResult.length > 0) {
        console.log("🔍 Appointment fields from backend:", Object.keys(scheduleResult[0]));
        console.log("🔍 Sample appointment:", {
          id: scheduleResult[0].id,
          status: scheduleResult[0].status,
          visit_id: scheduleResult[0].visit_id,
          allKeys: Object.keys(scheduleResult[0])
        });
      }

      setAppointments(scheduleResult);

    } catch (error) {
      console.error("❌ Failed to load initial data:", error);
      Alert.alert("Error", "Failed to load schedule data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const formatDateForComparison = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    // Convert to YYYY-MM-DD in local timezone
    return date.toISOString().split('T')[0];
  };

  const updateMarkedDates = () => {
    const marks = {};
    const appointmentsByDate = {};

    appointments.forEach((appt) => {
      if (!appt.date) return;

      if (!appointmentsByDate[appt.date]) {
        appointmentsByDate[appt.date] = [];
      }
      appointmentsByDate[appt.date].push(appt);
    });

    Object.keys(appointmentsByDate).forEach((date) => {
      const dayAppointments = appointmentsByDate[date];
      const hasActiveAppointments = dayAppointments.some(
        (appt) => appt.status !== "completed" && appt.status !== "cancelled"
      );

      const allDone = !hasActiveAppointments;

      marks[date] = {
        marked: true,
        dotColor: allDone ? "#1f9c8b" : "#9C6713",
        selected: date === selectedDate,
        selectedColor: "#1f9c8b",
      };
    });

    const today = new Date().toISOString().split("T")[0];
    if (!marks[today]) {
      marks[today] = {
        selected: today === selectedDate,
        selectedColor: "#1f9c8b",
      };
    } else {
      marks[today].selected = today === selectedDate;
      marks[today].selectedColor = "#1f9c8b";
    }

    if (selectedDate && !marks[selectedDate]) {
      marks[selectedDate] = {
        selected: true,
        selectedColor: "#1f9c8b",
      };
    }

    setMarkedDates(marks);
  };

  const updateTodayAppointments = () => {
    console.log("📅 Updating today's appointments:", {
      selectedDate,
      appointmentsCount: appointments.length,
      appointments: appointments.map(a => ({
        id: a.id,
        date: a.date,
        customerId: a.customerId,
        legacyCustomerKey: a.legacyCustomerKey,
        time: a.time
      }))
    });

    const todays = appointments
      .filter((appt) => {
        if (!appt.date) return false;
        
        // Convert appointment date to local date for comparison
        const apptDateObj = new Date(appt.date);
        const apptLocalDate = apptDateObj.toISOString().split('T')[0];
        
        // Compare with selected date (which is already in YYYY-MM-DD format)
        const matches = apptLocalDate === selectedDate;
        
        console.log(`Appointment ${appt.id}:`, {
          apptDate: appt.date,
          apptLocalDate,
          selectedDate,
          matches
        });
        
        return matches;
      })
      .sort((a, b) =>
        formatTime(a.time).localeCompare(formatTime(b.time))
      );

    console.log("✅ Filtered appointments for today:", todays.length);
    console.log("📋 Today's appointments:", todays);
    
    setTodayAppointments(todays);
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDropdown(false);
    onSelectCustomer(customer, null, { mode: "layout-only" });
  };

  const navigateToCustomerLocation = (customer) => {
    if (!customer || !customer.address) {
      Alert.alert("No Location", "This customer doesn't have a location saved.");
      return;
    }

    const location = customer.address.trim();
    
    const isCoordinates = /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(location);
    
    let googleMapsUrl, appleMapsUrl, wazeUrl;
    
    if (isCoordinates) {
      const [lat, lng] = location.split(',').map(coord => coord.trim());
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      appleMapsUrl = `http://maps.apple.com/?ll=${lat},${lng}&dirflg=d`;
      wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    } else {
      const encodedAddress = encodeURIComponent(location);
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
      appleMapsUrl = `http://maps.apple.com/?daddr=${encodedAddress}&dirflg=d`;
      wazeUrl = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
    }

    Alert.alert(
      "Navigate to Customer",
      `Navigate to ${customer.customerName} using:`,
      [
        {
          text: "Google Maps",
          onPress: () => Linking.openURL(googleMapsUrl)
        },
        {
          text: "Waze",
          onPress: () => Linking.openURL(wazeUrl)
        },
        {
          text: "Apple Maps",
          onPress: () => Linking.openURL(appleMapsUrl)
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const handleEditCustomer = async (customer) => {
    try {
      setLoadingCustomerDetails(true);
      setEditingCustomer(customer);
      
      console.log("🔍 Loading customer details for editing:", customer.customerId);
      
      // Fetch full customer details with maps
      const customerDetails = await apiService.getCustomerWithMaps(customer.customerId);
      
      console.log("✅ Customer details loaded:", {
        customerId: customerDetails?.customerId,
        customerName: customerDetails?.customerName,
        mapsCount: customerDetails?.maps?.length || 0
      });
      
      setEditForm({
        customerName: customerDetails.customerName || customer.customerName || '',
        address: customerDetails.address || customer.address || '',
        email: customerDetails.email || customer.email || '',
        complianceValidUntil: customerDetails.complianceValidUntil || ''
      });
      
      setEditModalVisible(true);
      
    } catch (error) {
      console.error("❌ Error loading customer details:", error);
      Alert.alert("Error", "Failed to load customer details. Please try again.");
    } finally {
      setLoadingCustomerDetails(false);
    }
  };

  const handleSaveCustomerEdit = async () => {
    if (!editingCustomer || !editingCustomer.customerId) {
      Alert.alert("Error", "No customer selected for editing.");
      return;
    }
    
    if (!editForm.customerName.trim()) {
      Alert.alert("Validation Error", "Customer name is required.");
      return;
    }
    
    try {
      setUpdatingCustomer(true);
      
      console.log("💾 Saving customer edits:", {
        customerId: editingCustomer.customerId,
        formData: editForm
      });
      
      // Update customer via API
      const result = await apiService.updateCustomer(editingCustomer.customerId, {
        customerName: editForm.customerName.trim(),
        address: editForm.address.trim(),
        email: editForm.email.trim()
      });
      
      if (result?.success) {
        Alert.alert("Success", "Customer updated successfully!");
        
        // Refresh the customers list
        const updatedCustomers = await apiService.getCustomers();
        setCustomers(Array.isArray(updatedCustomers) ? updatedCustomers : []);
        
        // Update the selected customer if it's the one being edited
        if (selectedCustomer && selectedCustomer.customerId === editingCustomer.customerId) {
          const updatedCustomer = updatedCustomers.find(c => c.customerId === editingCustomer.customerId);
          if (updatedCustomer) {
            setSelectedCustomer(updatedCustomer);
          }
        }
        
        // Close modal
        setEditModalVisible(false);
        setEditingCustomer(null);
      } else {
        throw new Error(result?.error || "Update failed");
      }
      
    } catch (error) {
      console.error("❌ Error updating customer:", error);
      Alert.alert("Error", error.message || "Failed to update customer. Please try again.");
    } finally {
      setUpdatingCustomer(false);
    }
  };

  const handleAppointmentSelect = async (appointment) => {
    console.log("📋 Appointment details:", {
      id: appointment.id,
      status: appointment.status,
      visit_id: appointment.visit_id
    });

    if (appointment.status === "cancelled") {
      Alert.alert(
        "Cancelled Appointment",
        "This appointment has been cancelled and cannot be accessed."
      );
      return;
    }

    if (appointment.status === "completed") {
      Alert.alert(
        "Completed Appointment",
        "This appointment is completed. You can view details, but you cannot edit it.",
        [
          {
            text: "View Details",
            onPress: async () => {
              await proceedToAppointment(appointment, { viewOnly: true });
            }
          },
          { text: "Cancel", style: "cancel" }
        ]
      );
      return;
    }

    // scheduled / in_progress
    await proceedToAppointment(appointment, { viewOnly: false });
  };

  const proceedToAppointment = async (appointment, options = {}) => {
  const { viewOnly = false } = options;
    setLoadingAppointmentId(appointment.id);
    try {
      console.log("📋 Processing appointment:", {
        appointmentId: appointment.id,
        customerId: appointment.customerId,
        legacyCustomerKey: appointment.legacyCustomerKey,
        hasCustomerObject: !!appointment.customer,
        visit_id: appointment.visit_id,  // Check this
        visitId: appointment.visitId     // And this
      });

      let customer;
      
      // 1. First try to use the customer from the appointment (if it has maps)
      if (appointment.customer && appointment.customer.maps) {
        console.log("✅ Appointment already has customer with maps");
        customer = appointment.customer;
      }
      // 2. If appointment has customerId, fetch the full customer data with maps
      else if (appointment.customerId) {
        console.log("📥 Fetching customer data with maps for:", appointment.customerId);
        
        // Show loading indicator
        setLoading(true);
        
        try {
          const customerData = await apiService.getCustomerWithMaps(appointment.customerId);
          
          if (customerData && customerData.customerId) {
            console.log("✅ Customer data loaded with maps:", {
              customerId: customerData.customerId,
              customerName: customerData.customerName,
              mapsCount: customerData.maps?.length || 0
            });
            
            customer = {
              customerId: customerData.customerId,
              customerName: customerData.customerName,
              address: customerData.address || "",
              email: customerData.email || "",
              maps: customerData.maps || [] // CRITICAL: Include maps!
            };
          } else {
            throw new Error("Invalid customer data returned");
          }
        } catch (fetchError) {
          console.error("❌ Error fetching customer data:", fetchError);
          // Fallback to basic customer info
          customer = {
            customerId: appointment.customerId,
            customerName: appointment.customerName || `Customer ${appointment.customerId}`,
            address: appointment.customerAddress || "Address not available",
            email: "",
            maps: []
          };
        } finally {
          setLoading(false);
        }
      }
      // 3. If it's a legacy customer (legacyCustomerKey), create minimal customer
      else if (appointment.legacyCustomerKey) {
        console.log("🔄 Creating legacy customer from key:", appointment.legacyCustomerKey);
        customer = {
          customerId: appointment.legacyCustomerKey,
          customerName: appointment.customerName || `Legacy Customer ${appointment.legacyCustomerKey}`,
          address: appointment.customerAddress || "Address not available",
          email: "",
          maps: [] // Legacy customers won't have maps
        };
      }
      // 4. Last resort fallback
      else {
        console.warn("⚠️ No customer reference found in appointment");
        customer = {
          customerId: "unknown",
          customerName: "Unknown Customer",
          address: "Address not available",
          email: "",
          maps: []
        };
      }

      // Generate appointment ID

      const appointmentId = appointment.id || // Use the real UUID if available
                        `${appointment.appointmentDate}_${appointment.appointmentTime}_${customer.customerId}`;

      // In TechnicianHomeScreen.js - proceedToAppointment function

      const session = {
        appointmentId: appointment.id,
        customer: customer,
        appointmentTime: formatTime(
          appointment.appointment_time || appointment.time
        ),
        appointmentDate: appointment.appointment_date || appointment.date,
        startTime: null,
        elapsedTime: 0,
        isActive: false,
        fromAppointment: true,
        serviceType: appointment.service_type || appointment.serviceType || "myocide",
        status: appointment.status || "scheduled",
        visitId: appointment.visit_id || appointment.visitId || null,  
        viewOnly,
        rawAppointment: appointment
      };

      console.log("✅ Passing session with visitId:", {
        appointmentId: appointment.id,
        status: appointment.status,
        visitId: session.visitId,
        hasVisitId: !!session.visitId,
        rawVisitIdFromDB: appointment.visit_id,
        rawVisitIdFromFrontend: appointment.visitId
      });
      
      // Pass customer and session to parent component
      onSelectCustomer(customer, session, { mode: "work" });
      
    } catch (error) {
      console.error("❌ Error in proceedToAppointment:", error);
      Alert.alert("Error", "Failed to load appointment data. Please try again.");
    } finally {
      setLoadingAppointmentId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f9c8b" />
          <Text style={styles.loadingText}>Loading Technician Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={pestfreeLogo} style={styles.logo} resizeMode="contain" />
            <View style={styles.techBadge}>
              <MaterialIcons name="engineering" size={12} color="#fff" />
              <Text style={styles.techBadgeText}>TECH</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={onLogout}
            activeOpacity={0.7}
          >
            <MaterialIcons name="logout" size={18} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {technician.firstName?.charAt(0) || 'T'}
            </Text>
          </View>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.techName}>
              {technician.firstName} {technician.lastName}
            </Text>
            <Text style={styles.techInfo}>
              {technician.username} • {todayAppointments.length} appointments today
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialIcons name="schedule" size={20} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>{todayAppointments.length}</Text>
            <Text style={styles.statLabel}>Today's Visits</Text>
          </View>
          
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialIcons name="people" size={20} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>{customers.length}</Text>
            <Text style={styles.statLabel}>Customers</Text>
          </View>
          
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)'}]}>
              <MaterialIcons name="calendar-today" size={20} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>{appointments.length}</Text>
            <Text style={styles.statLabel}>Total Appointments</Text>
          </View>
        </View>

        {/* Manual Customer Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="person-search" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>Customer Selection</Text>
          </View>
          
          <TouchableOpacity
            style={styles.customerSelector}
            onPress={() => setShowCustomerDropdown(!showCustomerDropdown)}
            activeOpacity={0.7}
          >
            <View style={styles.selectorContent}>
              <MaterialIcons name="person" size={20} color="#666" />
              <Text style={[
                styles.selectorText,
                selectedCustomer && styles.selectorTextSelected
              ]}>
                {selectedCustomer ? selectedCustomer.customerName : "Select a customer"}
              </Text>
            </View>
            <MaterialIcons 
              name={showCustomerDropdown ? "expand-less" : "expand-more"} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {showCustomerDropdown && (
            <View style={styles.customerDropdown}>
              <ScrollView 
                style={styles.dropdownScroll}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled
              >
                {customers.map((customer) => (
                  <TouchableOpacity
                    key={customer.customerId}
                    style={styles.dropdownItem}
                    onPress={() => handleCustomerSelect(customer)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dropdownItemAvatar}>
                      <Text style={styles.dropdownItemAvatarText}>
                        {customer.customerName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.dropdownItemContent}>
                      <Text style={styles.dropdownItemName}>
                        {customer.customerName}
                      </Text>
                      {customer.address && (
                        <Text style={styles.dropdownItemAddress} numberOfLines={1}>
                          {customer.address}
                        </Text>
                      )}
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#666" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {selectedCustomer && (
            <View style={styles.customerActionsContainer}>
              <TouchableOpacity
                style={styles.navigationButton}
                onPress={() => navigateToCustomerLocation(selectedCustomer)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="navigation" size={20} color="#fff" />
                <Text style={styles.navigationButtonText}>
                  Navigate to {selectedCustomer.customerName}
                </Text>
              </TouchableOpacity>
              
              {/* ADD EDIT CUSTOMER BUTTON */}
              <TouchableOpacity
                style={styles.editCustomerButton}
                onPress={() => handleEditCustomer(selectedCustomer)}
                activeOpacity={0.7}
                disabled={loadingCustomerDetails}
              >
                {loadingCustomerDetails ? (
                  <ActivityIndicator size="small" color="#1f9c8b" />
                ) : (
                  <>
                    <MaterialIcons name="edit" size={20} color="#1f9c8b" />
                    <Text style={styles.editCustomerButtonText}>
                      Edit Customer Profile
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Calendar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="calendar-today" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>Schedule Calendar</Text>
          </View>
          
          <View style={styles.calendarContainer}>
            <Calendar
              current={selectedDate}
              markedDates={markedDates}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              hideExtraDays={true}
              firstDay={1}
              enableSwipeMonths={true}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                monthTextColor: '#2c3e50',
                textMonthFontSize: 18,
                textMonthFontWeight: 'bold',
                textDayHeaderFontSize: 14,
                textDayHeaderFontWeight: '600',
                todayTextColor: '#1f9c8b',
                todayBackgroundColor: '#f0f9f8',
                selectedDayBackgroundColor: '#1f9c8b',
                selectedDayTextColor: '#ffffff',
                selectedDayBorderRadius: 20,
                dayTextColor: '#374151',
                textDayFontSize: 16,
                textDayFontWeight: '500',
                dotColor: '#1f9c8b',
                selectedDotColor: '#ffffff',
                arrowColor: '#1f9c8b',
                arrowStyle: {
                  padding: 10,
                  backgroundColor: '#f8fafc',
                  borderRadius: 8,
                },
                textDisabledColor: '#d1d5db',
              }}
              style={styles.calendar}
            />
            
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#1f9c8b' }]} />
                <Text style={styles.legendText}>All completed</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#9C6713' }]} />
                <Text style={styles.legendText}>Pending</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendToday}>
                  <View style={styles.legendTodayInner} />
                </View>
                <Text style={styles.legendText}>Today</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Today's Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="event-available" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>Appointments for {formatDate(selectedDate)}</Text>
          </View>
          
          {todayAppointments.length === 0 ? (
            <View style={styles.emptyAppointments}>
              <View style={styles.emptyIconContainer}>
                <MaterialIcons name="event-busy" size={48} color="#ddd" />
              </View>
              <Text style={styles.emptyTitle}>No Appointments</Text>
              <Text style={styles.emptySubtitle}>
                No appointments scheduled for this date
              </Text>
              <TouchableOpacity 
                style={styles.refreshButtonSmall}
                onPress={loadInitialData}
              >
                <MaterialIcons name="refresh" size={16} color="#1f9c8b" />
                <Text style={styles.refreshButtonSmallText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.appointmentsContainer}>
              {todayAppointments.map((appointment, index) => {
                // Find customer in customers list
                const customer = customers.find(
                  (c) => c.customerId === appointment.customerId
                );

                const isCancelled = appointment.status === "cancelled";
                const isCompleted = appointment.status === "completed" 


                return (
                  <View key={`${appointment.date}_${appointment.time}_${index}`} 
                        style={styles.appointmentCardContainer}>
                    <TouchableOpacity
                      style={[
                        styles.appointmentCard,
                        (isCancelled || isCompleted) && styles.appointmentCardCompleted,
                        loadingAppointmentId === appointment.id && styles.appointmentCardLoading
                      ]}
                      onPress={async () => {
                        if (isCancelled) return; // only cancelled is blocked
                        if (loadingAppointmentId === appointment.id) return;
                        await handleAppointmentSelect(appointment);
                      }}
                      disabled={isCancelled || loadingAppointmentId === appointment.id}
                      activeOpacity={0.7}
                    >
                      <View style={styles.appointmentHeader}>
                        <View style={[
                          styles.timeBadge,
                          (isCancelled || isCompleted) && styles.timeBadgeCompleted,
                          loadingAppointmentId === appointment.id && styles.timeBadgeLoading
                        ]}>
                          {loadingAppointmentId === appointment.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <MaterialIcons name="access-time" size={14} color="#fff" />
                              <Text style={styles.timeText}>
                                {formatTime(appointment.time)}
                              </Text>
                            </>
                          )}
                        </View>
                      
                      {isCancelled && (
                        <View style={[
                          styles.completedBadge,
                          { backgroundColor: 'rgba(244, 67, 54, 0.12)' }
                        ]}>
                          <MaterialIcons name="cancel" size={12} color="#F44336" />
                          <Text style={[styles.completedText, { color: '#F44336' }]}>
                            Cancelled
                          </Text>
                        </View>
                      )}
                        
                      {isCompleted && !isCancelled && loadingAppointmentId !== appointment.id && (
                        <View style={styles.completedBadge}>
                          <MaterialIcons name="check-circle" size={12} color="#1f9c8b" />
                          <Text style={styles.completedText}>
                            {appointment.visit_id ? "Completed" : "Scheduled"}
                          </Text>
                        </View>
                      )}
                      </View>
                      
                      {loadingAppointmentId === appointment.id ? (
                        <View style={styles.loadingContent}>
                          <ActivityIndicator size="small" color="#1f9c8b" />
                          <Text style={styles.loadingText}>Loading customer data...</Text>
                        </View>
                      ) : (
                        <>
                          <Text style={[
                            styles.customerName,
                            isCompleted && styles.customerNameCompleted
                          ]}>
                            {customer?.customerName || 
                            appointment.customer_name || 
                            `Customer ${appointment.legacyCustomerKey || appointment.customerId}`}
                          </Text>
                          
                          {customer?.address && (
                            <View style={styles.addressContainer}>
                              <MaterialIcons name="location-on" size={14} color="#666" />
                              <Text style={styles.addressText} numberOfLines={1}>
                                {customer.address}
                              </Text>
                            </View>
                          )}
                        </>
                      )}
                      
                      <View style={styles.serviceTypeContainer}>
                        {loadingAppointmentId !== appointment.id && (
                          <View style={styles.serviceTypeBadge}>
                            <MaterialIcons 
                              name={appointment.serviceType === 'myocide' ? 'pest-control-rodent' : 
                                    appointment.serviceType === 'disinfection' ? 'clean-hands' :
                                    appointment.serviceType === 'insecticide' ? 'pest-control' :
                                    'star'} 
                              size={12} 
                              color="#666" 
                            />
                            <Text style={styles.serviceTypeText}>
                              {appointment.serviceType || 'Myocide'}
                            </Text>
                          </View>
                        )}
                        
                        <View style={styles.arrowContainer}>
                          <Text style={styles.arrowText}>
                            {loadingAppointmentId === appointment.id ? '⌛' : '→'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    
                    {customer?.address && !isCancelled && loadingAppointmentId !== appointment.id && (
                      <TouchableOpacity
                        style={styles.navButton}
                        onPress={() => navigateToCustomerLocation(customer)}
                      >
                        <MaterialIcons name="directions" size={20} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.refreshButtonLarge}
            onPress={loadInitialData}
            activeOpacity={0.7}
          >
            <MaterialIcons name="refresh" size={20} color="#1f9c8b" />
            <Text style={styles.refreshButtonText}>Refresh Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Pestify Technician Portal</Text>
          <Text style={styles.footerSubtext}>
              Version 1.0 • Last updated: {new Date().toLocaleDateString()}
          </Text>
          <Text style={styles.footerCopyright}>
              © {new Date().getFullYear()} Pest-Free. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
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
  
  // HEADER
  header: {
    backgroundColor: "#1f9c8b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 100,
    height: 40,
  },
  techBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  techBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
    fontFamily: 'System',
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  logoutText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
    fontFamily: 'System',
  },
  
  // WELCOME CARD
  welcomeCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 24,
    flexDirection: "row",
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
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(31, 156, 139, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#1f9c8b",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f9c8b",
    fontFamily: 'System',
  },
  welcomeContent: {
    marginLeft: 16,
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: "#666",
    fontFamily: 'System',
  },
  techName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2c3e50",
    marginTop: 2,
    fontFamily: 'System',
  },
  techInfo: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    fontFamily: 'System',
  },
  
  // STATS
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: "#fff",
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3e50",
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
    fontFamily: 'System',
  },
  
  // SECTIONS
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginLeft: 8,
    fontFamily: 'System',
  },
  
  // CUSTOMER SELECTION
  customerSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  selectorContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectorText: {
    fontSize: 16,
    color: "#999",
    marginLeft: 12,
    fontFamily: 'System',
  },
  selectorTextSelected: {
    color: "#2c3e50",
    fontWeight: "500",
  },
  customerDropdown: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    maxHeight: 200,
    overflow: "hidden",
  },
  dropdownScroll: {
    padding: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  dropdownItemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(31, 156, 139, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownItemAvatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f9c8b",
    fontFamily: 'System',
  },
  dropdownItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  dropdownItemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2c3e50",
    fontFamily: 'System',
  },
  dropdownItemAddress: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
    fontFamily: 'System',
  },
  navigationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f9c8b",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  navigationButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: 'System',
  },
  
  // CALENDAR
  calendarContainer: {
    marginTop: 8,
  },
  calendar: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingBottom: 15,
    overflow: 'hidden',
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendToday: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#1f9c8b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  legendTodayInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1f9c8b",
  },
  legendText: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "500",
    fontFamily: 'System',
  },
  
  // APPOINTMENTS
  emptyAppointments: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    fontFamily: 'System',
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 16,
    fontFamily: 'System',
  },
  refreshButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  refreshButtonSmallText: {
    fontSize: 14,
    color: "#1f9c8b",
    fontWeight: "600",
    marginLeft: 6,
    fontFamily: 'System',
  },
  
  appointmentsContainer: {
    marginTop: 8,
  },
  appointmentCardContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  appointmentCard: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  appointmentCardCompleted: {
    opacity: 0.6,
  },
  appointmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f9c8b",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timeBadgeCompleted: {
    backgroundColor: "#666",
  },
  timeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
    fontFamily: 'System',
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 11,
    color: "#1f9c8b",
    fontWeight: "600",
    marginLeft: 4,
    fontFamily: 'System',
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
    fontFamily: 'System',
  },
  customerNameCompleted: {
    color: "#666",
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  addressText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 6,
    flex: 1,
    fontFamily: 'System',
  },
  serviceTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  serviceTypeText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    fontFamily: 'System',
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  arrowText: {
    fontSize: 16,
    color: "#1f9c8b",
    fontWeight: "bold",
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1f9c8b",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    shadowColor: "#1f9c8b",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // ACTIONS
  actionsContainer: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },
  refreshButtonLarge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  refreshButtonText: {
    color: "#1f9c8b",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: 'System',
  },
  
  // FOOTER
  footer: {
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
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
  appointmentCardLoading: {
    opacity: 0.7,
  },
  timeBadgeLoading: {
    backgroundColor: '#888',
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    fontFamily: 'System',
  },
});