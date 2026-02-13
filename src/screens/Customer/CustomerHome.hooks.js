//CustomerHome.hooks.js
import { useState, useEffect } from "react";
import { Alert, Platform, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiService from "../../services/apiService";
import {
  loadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  formatTimeAgo,
  NOTIFICATIONS_READ_STORAGE_KEY,
} from "./CustomerHome.notifications";
import { MaterialIcons, FontAwesome5, Ionicons, Feather, Entypo, MaterialCommunityIcons } from '@expo/vector-icons';;

export default function useCustomerHome({ customer, onLogout, onViewVisits }) {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [lastVisit, setLastVisit] = useState(null);
  const [loadingVisits, setLoadingVisits] = useState(false);
  
  
  // Service Request Form states
  const [showServiceRequest, setShowServiceRequest] = useState(false);
  const [serviceType, setServiceType] = useState("myocide");
  const [specialServiceSubtype, setSpecialServiceSubtype] = useState(null);
  const [otherPestName, setOtherPestName] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [description, setDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showSpecialSubtypeDropdown, setShowSpecialSubtypeDropdown] = useState(false);

  // Upcoming Appointments states
  const [showAppointments, setShowAppointments] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newAppointmentDate, setNewAppointmentDate] = useState("");
  const [newAppointmentTime, setNewAppointmentTime] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  // NOTIFICATIONS SYSTEM STATES
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationDetails, setShowNotificationDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(null);

    useEffect(() => {
        setPreferredTime("09:30");
    }, []);
  
    useEffect(() => {
      const loadDashboard = async () => {
        console.log("🔑 Loading dashboard, token should be set");
          

        try {
          const result = await apiService.getCustomerDashboard();
          console.log("📊 Dashboard result RAW:", JSON.stringify(result, null, 2));
          
          // ADD THESE DEBUG LOGS:
          console.log("🔍 DEBUG Dashboard Structure Analysis:", {
            hasCustomer: !!result?.customer,
            customerName: result?.customer?.name,
            customerObjectKeys: result?.customer ? Object.keys(result.customer) : [],
            hasLastVisit: !!result?.lastVisit,
            lastVisitType: typeof result?.lastVisit,
            lastVisitKeys: result?.lastVisit ? Object.keys(result.lastVisit) : [],
            lastVisitValue: result?.lastVisit,
            hasVisits: Array.isArray(result?.visits),
            visitsCount: result?.visits?.length || 0,
            hasAppointments: Array.isArray(result?.appointments),
            appointmentsCount: result?.appointments?.length || 0,
            hasUpcomingAppointments: Array.isArray(result?.upcomingAppointments),
            upcomingAppointmentsCount: result?.upcomingAppointments?.length || 0,
            hasNextAppointment: !!result?.nextAppointment,
            nextAppointmentKeys: result?.nextAppointment ? Object.keys(result.nextAppointment) : [],
            allDashboardKeys: Object.keys(result || {})
          });
          console.log("🔍 COMPLIANCE DEBUG from dashboard:", {
          complianceValidUntil: result?.customer?.complianceValidUntil,
          status: result?.compliance?.status,
          rawCompliance: result?.compliance,
          customerData: result?.customer
        });
          
          if (result?.success) {
                  console.log("🔍 Customer data search:", {
                    name: result.customer?.name,
                    fullName: result.customer?.fullName,
                    customerName: result.customer?.customerName,
                    firstName: result.customer?.firstName,
                    lastName: result.customer?.lastName,
                    username: result.customer?.username,
                    email: result.customer?.email
                  });
                  // Convert nextAppointment date to local date string
                  if (result.nextAppointment && result.nextAppointment.date) {
                    const dateStr = result.nextAppointment.date;
                    const dateObj = new Date(dateStr);
                    
                    // Create a local date string (YYYY-MM-DD) for consistent display
                    const localDateStr = dateObj.toLocaleDateString('en-CA'); // YYYY-MM-DD format
                    
                    console.log("📅 Converting next appointment date:", {
                      original: dateStr,
                      local: localDateStr,
                      isToday: dateObj.toDateString() === new Date().toDateString()
                    });
                    
                    // Update the nextAppointment with formatted date
                    result.nextAppointment.date = localDateStr;
                  }
                  
                  // Also convert upcoming appointments dates
                  if (result.upcomingAppointments && Array.isArray(result.upcomingAppointments)) {
                    result.upcomingAppointments = result.upcomingAppointments.map(apt => ({
                      ...apt,
                      date: apt.date ? new Date(apt.date).toLocaleDateString('en-CA') : apt.date
                    }));
                  }
                  
                  setDashboard(result);
                  
                  // DEBUG: Check what's in the dashboard result
                  console.log("📅 Dashboard debug:", {
                    hasNextAppointment: !!result.nextAppointment,
                    nextAppointment: result.nextAppointment,
                    nextAppointmentDate: result.nextAppointment?.date,
                    nextAppointmentTime: result.nextAppointment?.time,
                    upcomingAppointmentsCount: result.upcomingAppointments?.length || 0,
                    rawNextAppointment: result.nextAppointment
                  });
                  
                  // If dashboard has nextAppointment, trust it
                  if (result.nextAppointment && result.nextAppointment.date) {
                    console.log("✅ Using nextAppointment from dashboard:", {
                      date: result.nextAppointment.date,
                      time: result.nextAppointment.time,
                      serviceType: result.nextAppointment.serviceType
                    });
                    
                    // No need to load appointments separately if dashboard already has it
                    // But still load appointments for the list view
                    setTimeout(() => {
                      loadAppointments();
                    }, 500);
                  } else {
                    console.log("⚠️ No nextAppointment in dashboard, loading appointments separately");
                    // Load appointments to see if we can find one
                    setTimeout(() => {
                      loadAppointments();
                    }, 500);
                  }
                  
                } else {
                  console.log("❌ Dashboard failed:", result?.error);
                  setDashboard({
                    success: false,
                    customer: { name: "Customer", email: "" },
                    nextAppointment: null,
                    upcomingAppointments: [],
                    compliance: { status: "pending" }
                  });
                }
                
                // Load notifications
                await loadNotifications({
                  setNotifications,
                  setNotificationCount,
                  setLastFetchTime
                });
                loadVisitHistory()
                
              } catch (error) {
                console.error("❌ Dashboard loading error:", error);
                setDashboard({
                  success: false,
                  customer: { name: "Customer", email: "" },
                  nextAppointment: null,
                  upcomingAppointments: [],
                  compliance: { status: "pending" }
                });
              } finally {
                setLoading(false);
              }
            };
            
      loadDashboard();
    }, []);
  
     // Load notifications from storage on component mount
    useEffect(() => {
      const loadStoredNotifications = async () => {
        try {
          // Load read notification IDs from storage
          const readNotificationsJson = await AsyncStorage.getItem(NOTIFICATIONS_READ_STORAGE_KEY);
          const readNotifications = readNotificationsJson ? JSON.parse(readNotificationsJson) : [];
          
          // Load notifications from API or mock data
          await loadNotifications({
            setNotifications,
            setNotificationCount,
            setLastFetchTime,
            readNotificationIds: [] // optional
          });
        } catch (error) {
          console.error("Failed to load stored notifications:", error);
          await loadNotifications({
            setNotifications,
            setNotificationCount,
            setLastFetchTime,
            readNotificationIds: [] // optional
          });
        }
      };
      
      loadStoredNotifications();
    }, []);
  
    // Save read notifications to storage whenever they change
    useEffect(() => {
      const saveReadNotifications = async () => {
        try {
          const readNotificationIds = notifications
            .filter(n => n.isRead)
            .map(n => n.id);
          
          await AsyncStorage.setItem(
            NOTIFICATIONS_READ_STORAGE_KEY, 
            JSON.stringify(readNotificationIds)
          );
        } catch (error) {
          console.error("Failed to save read notifications:", error);
        }
      };
      
      if (notifications.length > 0) {
        saveReadNotifications();
      }
    }, [notifications]);
  
    // Add this useEffect for polling notifications
    useEffect(() => {
      let intervalId;
      
      const startPolling = () => {
        intervalId = setInterval(() => {
          loadNotifications({
            setNotifications,
            setNotificationCount,
            setLastFetchTime
          });
        }, 30000);
      };
      
      startPolling();
      
      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }, []);
  
    // Also refresh notifications when component comes into focus
    useEffect(() => {
      const refreshOnFocus = async () => {
        const readNotificationsJson = await AsyncStorage.getItem(NOTIFICATIONS_READ_STORAGE_KEY);
        const readNotifications = readNotificationsJson ? JSON.parse(readNotificationsJson) : [];
        loadNotifications({
          setNotifications,
          setNotificationCount,
          setLastFetchTime,
          readNotificationIds: [] // optional
        });
      };
      refreshOnFocus();
    }, []);    

  

  /* =========================
     HANDLERS / HELPERS
  ========================== */

  const loadAppointments = async () => {
      try {
        console.log("📅 Loading appointments for customer...");
        
        // Don't clear appointments immediately - keep existing ones
        const appointmentsResult = await apiService.getCustomerAppointments();
        
        console.log("📅 Appointments API response:", {
          success: appointmentsResult?.success,
          count: appointmentsResult?.appointments?.length,
          appointments: appointmentsResult?.appointments
        });
        
        if (appointmentsResult?.success && Array.isArray(appointmentsResult.appointments)) {
          // Filter to only show future appointments (today or later)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const futureAppointments = appointmentsResult.appointments.filter(apt => {
            if (!apt.date) return false;
            
            try {
              const appointmentDate = new Date(apt.date);
              appointmentDate.setHours(0, 0, 0, 0);
              
              console.log(`📅 Checking appointment date:`, {
                id: apt.id,
                date: apt.date,
                parsedDate: appointmentDate.toISOString(),
                today: today.toISOString(),
                isFuture: appointmentDate >= today
              });
              
              // Include appointments from today onwards
              return appointmentDate >= today;
            } catch (error) {
              console.error(`❌ Error parsing date for appointment ${apt.id}:`, error);
              return false;
            }
          });
          
          // Sort by date (soonest first)
          futureAppointments.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA - dateB;
          });
          
          console.log(`✅ Loaded ${futureAppointments.length} future appointments`);
          setAppointments(futureAppointments);
          
          // Update dashboard with the next appointment
          if (futureAppointments.length > 0) {
            const nextAppt = futureAppointments[0];
            
            // Update dashboard state with the next appointment
            setDashboard(prev => ({
              ...prev,
              nextAppointment: {
                id: nextAppt.id,
                date: nextAppt.date,
                time: nextAppt.time,
                serviceType: nextAppt.serviceType,
                specialServiceSubtype: nextAppt.specialServiceSubtype,
                otherPestName: nextAppt.otherPestName,
                status: nextAppt.status,
                technician: nextAppt.technician
              },
              upcomingAppointments: futureAppointments
            }));
            
            console.log("✅ Updated dashboard with next appointment:", {
              id: nextAppt.id,
              date: nextAppt.date,
              time: nextAppt.time,
              serviceType: nextAppt.serviceType
            });
          } else {
            console.log("📅 No future appointments found");
            // Keep the dashboard as is if no appointments
          }
        } else {
          console.warn("⚠️ No appointments found or API call failed");
        }
        
      } catch (error) {
        console.error("❌ Failed to load appointments:", error);
      }
  };

  const getIconComponent = (subtype) => {
    const subtypeObj = specialServiceSubtypes.find(s => s.id === subtype);
    if (!subtypeObj) return <MaterialIcons name="help-outline" size={20} color="#666" />;
    
    switch (subtypeObj.library) {
      case "FontAwesome5":
        return <FontAwesome5 name={subtypeObj.icon} size={20} color="#666" />;
      case "Feather":
        return <Feather name={subtypeObj.icon} size={20} color="#666" />;
      case "Entypo":
        return <Entypo name={subtypeObj.icon} size={20} color="#666" />;
      case "MaterialCommunityIcons":
        return <MaterialCommunityIcons name={subtypeObj.icon} size={20} color="#666" />;
      case "MaterialIcons":
        return <MaterialIcons name={subtypeObj.icon} size={20} color="#666" />;
      default:
        return <MaterialIcons name="help-outline" size={20} color="#666" />;
    }
  };

  const handleServiceRequest = async () => {
      if (!serviceType) {
        Alert.alert("Error", "Please select a service type");
        return;
      }
  
      if (serviceType === "special" && !specialServiceSubtype) {
        Alert.alert("Error", "Please select a specific service type for Special Service");
        return;
      }
  
      if (serviceType === "special" && specialServiceSubtype === "other" && !otherPestName.trim()) {
        Alert.alert("Error", "Please specify the pest name for 'Other' service");
        return;
      }
  
      if (!description.trim()) {
        Alert.alert("Error", "Please provide a description of the problem");
        return;
      }
  
      try {
        setSubmittingRequest(true);
        
        if (!dashboard || !dashboard.customer || !dashboard.customer.customerId) {
          Alert.alert("Error", "Customer information not available. Please try again.");
          setSubmittingRequest(false);
          return;
        }
        
        const requestData = {
          customerId: dashboard.customer.customerId,
          customerName: dashboard.customer.name,
          customerEmail: dashboard.customer.email,
          serviceType,
          specialServiceSubtype: serviceType === "special" ? specialServiceSubtype : null,
          otherPestName: serviceType === "special" && specialServiceSubtype === "other" ? otherPestName.trim() : null,
          urgency,
          description: description.trim(),
          preferredDate: preferredDate || null,
          preferredTime: preferredTime || null,
          notes: "" // Empty notes since we removed the details fields
        };
  
        console.log("📤 Submitting service request to backend:", requestData);
  
        const result = await apiService.submitCustomerRequest(requestData);
        
        if (result?.success) {
          Alert.alert(
            "Request Submitted Successfully",
            "Your service request has been received. Our team will review it and contact you within 24 hours.",
            [
              {
                text: "OK",
                onPress: () => {
                  // Reset form
                  setServiceType("myocide");
                  setSpecialServiceSubtype(null);
                  setOtherPestName("");
                  setUrgency("normal");
                  setDescription("");
                  setPreferredDate("");
                  const now = new Date();
                  const hour = now.getHours().toString().padStart(2, '0');
                  const minute = (Math.floor(now.getMinutes() / 30) * 30).toString().padStart(2, '0');
                  setPreferredTime(`${hour}:${minute}`);
                  setShowServiceRequest(false);
                }
              }
            ]
          );
        } else {
          throw new Error(result?.error || "Failed to submit request");
        }
  
      } catch (err) {
        console.error("Service request error:", err);
        Alert.alert("Error", err.message || "Failed to submit service request. Please try again.");
      } finally {
        setSubmittingRequest(false);
      }
  };

  const loadVisitHistory = async () => {
    try {
      setLoadingVisits(true);
      console.log("📋 Loading customer visit history...");
      
      // CHANGE THIS LINE:
      const result = await apiService.getCustomerVisitHistory(); // NOT getCustomerVisits()
      
      if (result?.success && Array.isArray(result.visits)) {
        // Find the most recent completed visit
        // Since visits might include both myocide and service logs,
        // we need to handle both status checks
        const completedVisits = result.visits.filter(visit => {
          // For myocide visits (from visits table)
          if (visit.status && visit.status.toLowerCase() === 'completed') {
            return true;
          }
          // For service logs (they don't have status field, but if they exist, they're completed)
          if (visit.source === 'service_log') {
            return true;
          }
          return false;
        });
        
        if (completedVisits.length > 0) {
          // Sort by date (newest first) to be sure
          const sortedVisits = completedVisits.sort((a, b) => {
            const dateA = new Date(a.startTime || a.service_start_time || a.start_time || 0);
            const dateB = new Date(b.startTime || b.service_start_time || b.start_time || 0);
            return dateB - dateA; // newest first
          });
          
          const lastVisit = sortedVisits[0];
          setLastVisit(lastVisit);
          
          console.log("✅ Last visit loaded:", {
            date: lastVisit.formattedDate || lastVisit.startTime || lastVisit.service_start_time,
            technician: lastVisit.technicianName || lastVisit.technician_name,
            serviceType: lastVisit.serviceType || lastVisit.service_type
          });
        } else {
          setLastVisit(null);
        }
      } else {
        setLastVisit(null);
      }
    } catch (error) {
      console.error("❌ Failed to load visit history:", error);
      setLastVisit(null);
    } finally {
      setLoadingVisits(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Reload dashboard first
      const result = await apiService.getCustomerDashboard();
      if (result?.success) {
        setDashboard(result);
        
        // Then reload appointments
        await loadAppointments();
      }
      
      // Then reload visit history
      await loadVisitHistory();
      
      // Then reload notifications
      await loadNotifications({
        setNotifications,
        setNotificationCount,
        setLastFetchTime
      });
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNotificationTap = async (notification) => {
    // Mark as read immediately
    console.log("🔍 Notification tapped:", {
      id: notification.id,
      type: notification.type,
      title: notification.title
    });

    markNotificationAsRead({
      notificationId: notification.id,
      notifications,
      setNotifications,
      setNotificationCount
    });

    
    // Set selected notification and show details
    setSelectedNotification(notification);
    setShowNotificationDetails(true);
    
    // If it's an appointment notification, you could auto-navigate to appointments
    if (notification.appointmentId && !showAppointments) {
      setShowAppointments(true);
    }
  };

  const handleRescheduleAppointment = async (appointment) => {
    if (!newAppointmentDate || !newAppointmentTime) {
      Alert.alert("Error", "Please select both date and time");
      return;
    }

    try {
      setRescheduling(true);
      
      // Validate date
      const newDateObj = new Date(newAppointmentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (newDateObj < today) {
        Alert.alert("Invalid Date", "Please select a future date");
        setRescheduling(false);
        return;
      }
      
      console.log("📝 Requesting reschedule for EXISTING appointment:", appointment.id);
      
      // CRITICAL: Call requestReschedule on the EXISTING appointment
      const result = await apiService.requestReschedule(appointment.id, {
        date: newAppointmentDate,
        time: newAppointmentTime,
        notes: `Requested reschedule to ${newAppointmentDate} at ${newAppointmentTime}`
      });
      
      console.log("📥 Reschedule request result:", result);
      
      if (result?.success) {
        Alert.alert(
          "Request Submitted",
          "Your reschedule request has been submitted. The admin will review it shortly.",
          [
            {
              text: "OK",
              onPress: () => {
                setShowRescheduleModal(false);
                setNewAppointmentDate("");
                setNewAppointmentTime("");
                setSelectedAppointment(null);
                setAppointments([]);
                loadAppointments();
              }
              
            }
          ]
        );
      } else {
        throw new Error(result?.error || "Failed to submit reschedule request");
      }
      
    } catch (err) {
      console.error("❌ Reschedule request error:", err);
      Alert.alert("Error", err.message || "Failed to submit reschedule request");
    } finally {
      setRescheduling(false);
    }
  };

  const handleChangePassword = async () => {
    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    // Check if new password meets minimum requirements
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      setChangingPassword(true);

      // Call the API to change password
      const result = await apiService.changeCustomerPassword(
        currentPassword,
        newPassword
      );

      if (result?.success) {
        Alert.alert(
          "Success", 
          "Password updated successfully",
          [
            {
              text: "OK",
              onPress: () => {
                // Clear fields and close form on success
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setShowPasswordForm(false);
              }
            }
          ]
        );
      } else {
        // Handle API error response
        const errorMessage = result?.error || "Failed to update password";
        
        // ✅ FIX: Don't log this specific error to the customer's console
        // Only show the appropriate alert
        if (errorMessage.includes("Invalid current password")) {
          Alert.alert("Error", "Your current password is wrong");
          // Clear current password field
          setCurrentPassword("");
        } else {
          Alert.alert("Error", errorMessage);
        }
      }

    } catch (err) {
      console.error("Password change error:", err);
      
      // Handle fetch/network errors
      let errorMessage = "Failed to update password. Please try again.";
      
      // Check if it's an invalid current password error
      if (
        err?.error?.includes("Invalid current password") ||
        err?.message?.includes("Invalid current password") ||
        err?.response?.data?.error?.includes("Invalid current password")
      ) {
        errorMessage = "Your current password is wrong";
        setCurrentPassword("");
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  const normalizeNotificationType = (notification) => {
  // ✅ FIX: normalize backend visit completion
    if (notification.type === 'visit_completed') {
      return 'appointment_completed';
    }

    if (
      notification.type === 'appointment_updated' &&
      notification.title === 'Reschedule Declined'
    ) {
      return 'reschedule_declined';
    }

    return notification.type;
  };


  const toggleNotifications = async () => {
    if (!showNotifications) {
      await loadNotifications({
        setNotifications,
        setNotificationCount,
        setLastFetchTime
      });

      setShowNotifications(true);
    } else {
      setShowNotifications(false);
      setShowAllNotifications(false);
    }
  };
  const toggleAppointments = async () => {
    setShowAppointments(prev => {
        if (!prev) {
        loadAppointments();
        }
        return !prev;
    });
  };
  const getServiceTypeLabel = (typeId, subtypeId = null, otherPest = null) => {
    const service = serviceTypes.find(s => s.id === typeId);
    let label = service ? service.label : typeId || "Myocide";
    
    if (typeId === "special" && subtypeId) {
      const subtype = specialServiceSubtypes.find(s => s.id === subtypeId);
      if (subtype) {
        if (subtypeId === "other" && otherPest) {
          label += ` (${subtype.label} - ${otherPest})`;
        } else {
          label += ` (${subtype.label})`;
        }
      }
    }
    
    return label;
  };
  const getNotificationColor = (notification) => {
    const normalizedType = normalizeNotificationType(notification);

    const nt = Object.values(notificationTypes)
      .find(n => n.type === normalizedType);

    return nt ? nt.color : '#666';
  };

  const getNotificationIcon = (notification) => {
    const normalizedType = normalizeNotificationType(notification);

    const nt = Object.values(notificationTypes)
      .find(n => n.type === normalizedType);

    return nt ? nt.icon : 'notifications';
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    
    try {
      let date;
      
      // Handle different date formats
      if (dateStr instanceof Date) {
        date = dateStr;
      } else if (typeof dateStr === 'string') {
        // Try parsing ISO string or local date string
        date = new Date(dateStr);
      } else {
        console.warn(`Unknown date format: ${typeof dateStr}`, dateStr);
        return String(dateStr);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${dateStr}`);
        return String(dateStr);
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const appointmentDate = new Date(date);
      appointmentDate.setHours(0, 0, 0, 0);
      
      // Check if it's today or tomorrow
      const isToday = appointmentDate.getTime() === today.getTime();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = appointmentDate.getTime() === tomorrow.getTime();
      
      if (isToday) {
        return "Today";
      } else if (isTomorrow) {
        return "Tomorrow";
      } else {
        // Return formatted date
        return appointmentDate.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch (err) {
      console.error("Error formatting date:", err, dateStr);
      return String(dateStr || "");
    }
  };
  const handleCallPhone = () => {
    const phoneNumber = "+306986244371";
    const url = Platform.select({
      ios: `telprompt:${phoneNumber}`,
      android: `tel:${phoneNumber}`
    });
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (!supported) {
          Alert.alert("Error", "Phone calls are not supported on this device");
        } else {
          return Linking.openURL(url);
        }
      })
      .catch(err => {
        console.error("Error opening phone app:", err);
        Alert.alert("Error", "Could not open phone app");
      });
  };
  const handleSendEmail = () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      Alert.alert("Error", "Please fill in both subject and message");
      return;
    }

    const email = "info@pest-free.gr";
    const subject = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(emailBody + "\n\n---\nSent from Pest - Free Customer Portal");
    const url = `mailto:${email}?subject=${subject}&body=${body}`;

    setSendingEmail(true);
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (!supported) {
          Alert.alert("Error", "No email client is installed");
          setSendingEmail(false);
        } else {
          return Linking.openURL(url);
        }
      })
      .then(() => {
        setEmailSubject("");
        setEmailBody("");
        setSendingEmail(false);
        setShowContactForm(false);
      })
      .catch(err => {
        console.error("Error opening email client:", err);
        Alert.alert("Error", "Could not open email client");
        setSendingEmail(false);
      });
  };
  const togglePasswordForm = () => setShowPasswordForm(!showPasswordForm);
  const toggleContactForm = () => setShowContactForm(!showContactForm);
  const toggleServiceRequest = () => setShowServiceRequest(!showServiceRequest);
  const handleViewAllNotifications = async () => {
    setShowAllNotifications(true);
    // Refresh notifications when viewing all
    await loadNotifications({
      setNotifications,
      setNotificationCount,
      setLastFetchTime
    });

  };
   const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
      case 'compliant': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'non-compliant': return '#F44336';
      default: return '#757575';
    }
  };
  const getAppointmentStatusColor = (status) => {
    switch (status) {
      case 'pending_reschedule':
        return '#FF9800'; // yellow

      case 'rescheduled':
      case 'scheduled':
        return '#4CAF50'; // green

      case 'completed':
        return '#2196F3';

      case 'cancelled':
        return '#F44336';

      default:
        return '#9E9E9E';
    }
  };

  const getAppointmentStatusText = (status) => {
    switch (status) {
      case 'pending_reschedule':
        return 'Pending Request';

      case 'rescheduled':
        return 'Rescheduled';

      case 'scheduled':
        return 'Scheduled';

      case 'completed':
        return 'Completed';

      case 'cancelled':
        return 'Cancelled';

      default:
        return status?.toUpperCase?.() || 'UNKNOWN';
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setPreferredDate(date.toISOString().split("T")[0]);
    setShowDatePickerModal(false);
  };
  const formatDateForDisplay = (dateStr, options = {}) => {
  if (!dateStr) return "";
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const defaultOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  } catch (error) {
    console.error("Date formatting error:", error);
    return dateStr;
  }
  };
  const formatDateShort = (dateStr) => {
    if (!dateStr) return "";
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const appointmentDate = new Date(date);
      appointmentDate.setHours(0, 0, 0, 0);
      
      if (appointmentDate.getTime() === today.getTime()) {
        return "Today";
      }
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (appointmentDate.getTime() === tomorrow.getTime()) {
        return "Tomorrow";
      }
      
      // If within 7 days, show weekday
      const diffDays = Math.floor((appointmentDate - today) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        return appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });
      }
      
      // Otherwise show date
      return appointmentDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error("Short date formatting error:", error);
      return dateStr;
    }
  };
  const serviceTypes = [
    { id: "myocide", label: "Myocide", description: "Standard bait station service", icon: "pest-control-rodent", color: "#1f9c8b" },
    { id: "disinfection", label: "Disinfection", description: "Disinfection service", icon: "clean-hands", color: "#1f9c8b" },
    { id: "insecticide", label: "Insecticide", description: "Insecticide treatment", icon: "pest-control", color: "#1f9c8b" },
    { id: "special", label: "Special Service", description: "Custom pest control services", icon: "star", color: "#1f9c8b" },
  ];

  const specialServiceSubtypes = [
    { id: "grass_cutworm", label: "Grass Cutworm", icon: "seedling", library: "FontAwesome5" },
    { id: "fumigation", label: "Fumigation", icon: "cloud", library: "Feather" },
    { id: "termites", label: "Termites", icon: "bug", library: "FontAwesome5" },
    { id: "exclusion", label: "Exclusion Service", icon: "block", library: "Entypo" }, 
    { id: "snake_repulsion", label: "Snake Repulsion", icon: "snake", library: "MaterialCommunityIcons" }, 
    { id: "bird_control", label: "Bird Control", icon: "feather", library: "Feather" },
    { id: "bed_bugs", label: "Bed Bugs", icon: "bug-report", library: "MaterialIcons" },
    { id: "fleas", label: "Fleas", icon: "paw", library: "FontAwesome5" }, 
    { id: "plant_protection", label: "Plant Protection", icon: "grass", library: "MaterialIcons" }, 
    { id: "palm_weevil", label: "Palm Weevil", icon: "tree", library: "FontAwesome5" },
    { id: "other", label: "Other", icon: "more-horizontal", library: "Feather" },
  ];

  const urgencyOptions = [
    {
        id: "low",
        label: "Low Priority",
        description: "Schedule when convenient",
        icon: "calendar",
        color: "#1f9c8b",
    },
    {
        id: "normal",
        label: "Normal",
        description: "Within 1–2 weeks",
        icon: "clock",
        color: "#1f9c8b",
    },
    {
        id: "high",
        label: "Urgent",
        description: "As soon as possible",
        icon: "alert-circle",
        color: "#1f9c8b",
    },
    {
        id: "emergency",
        label: "Emergency",
        description: "Need immediate help",
        icon: "alert-triangle",
        color: "#1f9c8b",
    },
  ];
  const notificationTypes = {
    APPOINTMENT_CREATED: {
      type: 'appointment_created',
      icon: 'event-available',
      color: '#1f9c8b',
    },
    APPOINTMENT_UPDATED: {
      type: 'appointment_updated',
      icon: 'edit-calendar',
      color: '#1f9c8b',
    },
    APPOINTMENT_DELETED: {
      type: 'appointment_deleted',
      icon: 'event-busy',
      color: '#F44336',
    },
    APPOINTMENT_COMPLETED: {
      type: 'appointment_completed',
      icon: 'check-circle',
      color: '#1f9c8b',
    },
    SERVICE_REQUEST_ACCEPTED: {
      type: 'service_request_accepted',
      icon: 'check',
      color: '#1f9c8b',
    },
    SERVICE_REQUEST_DECLINED: {
      type: 'service_request_declined',
      icon: 'close',
      color: '#F44336',
    },
    RESCHEDULE_DECLINED: {
      type: 'reschedule_declined',
      icon: 'event-busy',
      color: '#F44336',
    },
  };
  const selectedService = serviceTypes.find(s => s.id === serviceType) || serviceTypes[0];
  // In CustomerHome.hooks.js, update the handleMarkAllAsRead function:
  const handleMarkAllAsRead = async () => {
    console.log("🔔 handleMarkAllAsRead called");
    
    try {
      // Call the actual markAllNotificationsAsRead function
      await markAllNotificationsAsRead({
        notifications,
        setNotifications,
        setNotificationCount
      });
      
      // Optional: Refresh notifications after marking all as read
      await loadNotifications({
        setNotifications,
        setNotificationCount,
        setLastFetchTime
      });
      
    } catch (error) {
      console.error("❌ Error in handleMarkAllAsRead:", error);
      Alert.alert("Error", "Failed to mark all notifications as read");
    }
  };

  /* =========================
     RETURN API
  ========================== */

    return {
    /* state */
    loading,
    dashboard,
    notifications,
    notificationCount,
    showNotifications,
    showAllNotifications,
    appointments,
    refreshing,
    setNotifications,
    setNotificationCount,
    setLastFetchTime,
    selectedService,

    /* setters */
    setShowNotifications,
    showAppointments,
    setShowAllNotifications,
    setShowServiceRequest,
    setShowAppointments,
    setShowPasswordForm,
    setShowContactForm,
    setShowNotificationDetails,
    setSelectedNotification,
    setShowRescheduleModal,
    setSelectedAppointment,
    setNewAppointmentDate,
    setNewAppointmentTime,
    setServiceType,
    setSpecialServiceSubtype,
    setOtherPestName,
    setUrgency,
    setDescription,
    setPreferredDate,
    setPreferredTime,
    setEmailSubject,
    setEmailBody,
    rescheduling,

    /* handlers */
    onLogout,
    onViewVisits,
    onRefresh,
    toggleNotifications,
    toggleAppointments,
    toggleServiceRequest,
    toggleContactForm,
    togglePasswordForm,
    handleNotificationTap,
    handleServiceRequest,
    handleRescheduleAppointment,
    handleChangePassword,
    handleSendEmail,
    handleCallPhone,

    /* helpers */
    formatTimeAgo,
    getServiceTypeLabel,
    getNotificationIcon,
    getNotificationColor,
    formatDisplayDate,
    getStatusColor,
    getAppointmentStatusColor,
    getAppointmentStatusText,

    /* ✅ REQUIRED UI DATA */
    serviceTypes,
    specialServiceSubtypes,
    urgencyOptions,
    showServiceDropdown,
    setShowServiceDropdown,
    showSpecialSubtypeDropdown,
    setShowSpecialSubtypeDropdown,

    setCurrentPassword,  
    setNewPassword,     
    setConfirmPassword,  
    setPreferredTime,   
    setPreferredDate,   
    setEmailSubject,    
    setEmailBody,        
    setDescription,

    /* form state needed by UI */
    serviceType,
    specialServiceSubtype,
    otherPestName,
    urgency,
    description,
    preferredDate,
    preferredTime,
    submittingRequest,
    emailSubject,
    emailBody,
    sendingEmail,
    changingPassword,
    currentPassword,
    newPassword,
    confirmPassword,
    showServiceDropdown,
    showSpecialSubtypeDropdown,
    showServiceRequest,
    showContactForm,
    showPasswordForm,
    showNotificationDetails,
    selectedNotification,
    showRescheduleModal,
    selectedAppointment,
    newAppointmentDate,
    newAppointmentTime,
    lastVisit,
    loadingVisits,
    getIconComponent,
    markAllNotificationsAsRead: handleMarkAllAsRead,
    };
}