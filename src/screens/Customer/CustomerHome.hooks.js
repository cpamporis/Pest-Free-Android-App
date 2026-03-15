//CustomerHome.hooks.js
import { useState, useEffect } from "react";
import { Alert, Platform, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiService from "../../services/apiService";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import {
  loadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  formatTimeAgo,
  NOTIFICATIONS_READ_STORAGE_KEY,
} from "./CustomerHome.notifications";
import { MaterialIcons, FontAwesome5, Ionicons, Feather, Entypo, MaterialCommunityIcons } from '@expo/vector-icons';
import i18n from "../../services/i18n";

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
  const [serviceRequestImages, setServiceRequestImages] = useState([]);
  
  
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

        try {
          const result = await apiService.getCustomerDashboard();
          
          if (result?.success) {
                  // Convert nextAppointment date to local date string
                  if (result.nextAppointment && result.nextAppointment.date) {
                    const dateStr = result.nextAppointment.date;
                    const dateObj = new Date(dateStr);
                    
                    // Create a local date string (YYYY-MM-DD) for consistent display
                    const localDateStr = dateObj.toLocaleDateString('en-CA'); // YYYY-MM-DD format
                    
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
                  
                  // If dashboard has nextAppointment, trust it
                  if (result.nextAppointment && result.nextAppointment.date) {

                    // No need to load appointments separately if dashboard already has it
                    // But still load appointments for the list view
                    setTimeout(() => {
                      loadAppointments();
                    }, 500);
                  } else {
                    // Load appointments to see if we can find one
                    setTimeout(() => {
                      loadAppointments();
                    }, 500);
                  }
                  
                } else {
                  setDashboard({
                    success: false,
                    customer: { name: i18n.t("customer.welcome.customer"), email: "" },
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
                  customer: { name: i18n.t("customer.welcome.customer"), email: "" },
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

  const getNotificationContent = (notification) => {
    const type = notification.type;
    const t = i18n.t;
    
    // Handle different notification types with proper translations
    switch (type) {
      case 'appointment_created':
        return {
          title: t('customer.notificationTypes.appointment_created.title'),
          description: notification.appointmentDate && notification.appointmentTime 
            ? `${t('customer.notificationTypes.appointment_created.description')} ${notification.appointmentDate} ${t('customer.common.at')} ${notification.appointmentTime}`
            : t('customer.notificationTypes.appointment_created.description')
        };
        
      case 'appointment_updated':
        return {
          title: t('customer.notificationTypes.appointment_updated.title'),
          description: notification.appointmentDate && notification.appointmentTime
            ? `${t('customer.notificationTypes.appointment_updated.description')} ${notification.appointmentDate} ${t('customer.common.at')} ${notification.appointmentTime}`
            : t('customer.notificationTypes.appointment_updated.description')
        };
        
      case 'appointment_deleted':
        return {
          title: t('customer.notificationTypes.appointment_deleted.title'),
          description: t('customer.notificationTypes.appointment_deleted.description')
        };
        
      case 'appointment_completed':
      case 'visit_completed':
        return {
          title: t('customer.notificationTypes.appointment_completed.title'),
          description: notification.description || t('customer.notificationTypes.appointment_completed.description')
        };
        
      case 'service_request_accepted':
        return {
          title: t('customer.notificationTypes.service_request_accepted.title'),
          description: t('customer.notificationTypes.service_request_accepted.description')
        };
        
      case 'service_request_declined':
        return {
          title: t('customer.notificationTypes.service_request_declined.title'),
          description: t('customer.notificationTypes.service_request_declined.description')
        };
        
      case 'reschedule_declined':
        return {
          title: t('customer.notificationTypes.reschedule_declined.title'),
          description: notification.description || t('customer.notificationTypes.reschedule_declined.description')
        };
        
      default:
        return {
          title: notification.title || t('customer.notifications.title'),
          description: notification.description || notification.message || ''
        };
    }
  };

  

  const loadAppointments = async () => {
      try {
        
        // Don't clear appointments immediately - keep existing ones
        const appointmentsResult = await apiService.getCustomerAppointments();

        if (appointmentsResult?.success && Array.isArray(appointmentsResult.appointments)) {
          // Filter to only show future appointments (today or later)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const futureAppointments = appointmentsResult.appointments.filter(apt => {
            if (!apt.date) return false;
            
            try {
              const appointmentDate = new Date(apt.date);
              appointmentDate.setHours(0, 0, 0, 0);
              
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
        Alert.alert(i18n.t("common.error"), i18n.t("customer.serviceRequest.error.noServiceType"));
        return;
      }
  
      if (serviceType === "special" && !specialServiceSubtype) {
        Alert.alert(i18n.t("common.error"), i18n.t("customer.serviceRequest.error.noSpecialSubtype"));
        return;
      }
  
      if (serviceType === "special" && specialServiceSubtype === "other" && !otherPestName.trim()) {
        Alert.alert(i18n.t("common.error"), i18n.t("customer.serviceRequest.error.noOtherPest"));
        return;
      }
  
      if (!description.trim()) {
        Alert.alert(i18n.t("common.error"), i18n.t("customer.serviceRequest.error.noDescription"));
        return;
      }
  
      try {
        setSubmittingRequest(true);
        
        if (!dashboard || !dashboard.customer || !dashboard.customer.customerId) {
          Alert.alert(i18n.t("common.error"), i18n.t("customer.serviceRequest.error.noCustomerInfo"));
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
        let result;

        if (serviceRequestImages.length > 0) {
          const formData = new FormData();

          // Append normal fields
          Object.keys(requestData).forEach((key) => {
            if (requestData[key] !== null && requestData[key] !== undefined) {
              formData.append(key, requestData[key]);
            }
          });

          // Append ALL images
          serviceRequestImages.forEach((img, index) => {
            formData.append("images", {
              uri: img.uri,
              type: img.type || "image/jpeg",
              name:
                img.fileName ||
                `service_request_${index}_${Date.now()}.jpg`,
            });
          });
          result = await apiService.submitCustomerRequest(formData, true);
        } else {
          result = await apiService.submitCustomerRequest(requestData);
        }
        
        if (result?.success) {
          Alert.alert(
            i18n.t("customer.serviceRequest.success.title"),
            i18n.t("customer.serviceRequest.success.message"),
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
                  setServiceRequestImages([]);
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
          throw new Error(result?.error || i18n.t("customer.serviceRequest.error.submitFailed"));
        }
  
      } catch (err) {
        console.error("Service request error:", err);
        Alert.alert(i18n.t("common.error"), err.message || i18n.t("customer.serviceRequest.error.submitFailed"));
      } finally {
        setSubmittingRequest(false);
      }
  };

  const loadVisitHistory = async () => {
    try {
      setLoadingVisits(true);
      
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
      Alert.alert(i18n.t("common.error"), i18n.t("customer.modals.reschedule.error.selectBoth"));
      return;
    }

    try {
      setRescheduling(true);
      
      // Validate date
      const newDateObj = new Date(newAppointmentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (newDateObj < today) {
        Alert.alert(i18n.t("common.error"), i18n.t("customer.modals.reschedule.error.futureDate"));
        setRescheduling(false);
        return;
      }

      // CRITICAL: Call requestReschedule on the EXISTING appointment
      const result = await apiService.requestReschedule(appointment.id, {
        date: newAppointmentDate,
        time: newAppointmentTime,
        notes: `Requested reschedule to ${newAppointmentDate} at ${newAppointmentTime}`
      });

      if (result?.success) {
        Alert.alert(
          i18n.t("customer.modals.reschedule.success.title"),
          i18n.t("customer.modals.reschedule.success.message"),
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
        throw new Error(result?.error || i18n.t("customer.modals.reschedule.error.submitFailed") || "Failed to submit reschedule request");
      }
      
    } catch (err) {
      console.error("❌ Reschedule request error:", err);
      Alert.alert(i18n.t("common.error"), err.message || i18n.t("customer.modals.reschedule.error.submitFailed") || "Failed to submit reschedule request");
    } finally {
      setRescheduling(false);
    }
  };

  const handleChangePassword = async () => {
    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(i18n.t("common.error"), i18n.t("customer.account.changePassword.error.allFields"));
      return;
    }

    // Check if new password meets minimum requirements
    if (newPassword.length < 8) {
      Alert.alert(i18n.t("common.error"), i18n.t("customer.account.changePassword.error.minLength"));
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      Alert.alert(i18n.t("common.error"), i18n.t("customer.account.changePassword.error.mismatch"));
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
          i18n.t("common.success"), 
          i18n.t("customer.account.changePassword.success"),
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
        const errorMessage = result?.error || i18n.t("customer.account.changePassword.error.updateFailed");
        
        // ✅ FIX: Don't log this specific error to the customer's console
        // Only show the appropriate alert
        if (errorMessage.includes("Invalid current password")) {
          Alert.alert(i18n.t("common.error"), i18n.t("customer.account.changePassword.error.wrongCurrent"));
          // Clear current password field
          setCurrentPassword("");
        } else {
          Alert.alert(i18n.t("common.error"), errorMessage);
        }
      }

    } catch (err) {
      console.error("Password change error:", err);
      
      // Handle fetch/network errors
      let errorMessage = i18n.t("customer.account.changePassword.error.updateFailed");
      
      // Check if it's an invalid current password error
      if (
        err?.error?.includes("Invalid current password") ||
        err?.message?.includes("Invalid current password") ||
        err?.response?.data?.error?.includes("Invalid current password")
      ) {
        errorMessage = i18n.t("customer.account.changePassword.error.wrongCurrent");
        setCurrentPassword("");
      }
      
      Alert.alert(i18n.t("common.error"), errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  const pickserviceRequestImagesFromGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "photo",
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
        selectionLimit: 0,
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        Alert.alert(i18n.t("common.error"), result.errorMessage || i18n.t("customer.serviceRequest.error.imagePicker") || "Failed to pick image");
        return;
      }

      if (result.assets?.length > 0) {
        setServiceRequestImages(prev => {
          const newImages = result.assets.filter(
            newImg => !prev.some(oldImg => oldImg.uri === newImg.uri)
          );
          return [...prev, ...newImages];
        });
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert(i18n.t("common.error"), i18n.t("customer.serviceRequest.error.imagePicker") || "Failed to access image library");
    }
  };

  const captureserviceRequestImages = async () => {
    try {
      const result = await launchCamera({
        mediaType: "photo",
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
        cameraType: "back",
        saveToPhotos: true,
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        Alert.alert(i18n.t("common.error"), result.errorMessage || i18n.t("customer.serviceRequest.error.camera") || "Failed to capture image");
        return;
      }

      if (!result.canceled && result.assets?.length > 0) {
        setServiceRequestImages(prev => [...prev, ...result.assets]);
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert(i18n.t("common.error"), i18n.t("customer.serviceRequest.error.camera") || "Failed to open camera");
    }
  };

  const openserviceRequestImagesChooser = () => {
    Alert.alert(
      i18n.t("customer.serviceRequest.form.addPhotos") || "Add Photo", 
      i18n.t("customer.serviceRequest.form.chooseOption") || "Choose an option",
      [
        { text: i18n.t("customer.serviceRequest.form.camera") || "Camera", onPress: captureserviceRequestImages },
        { text: i18n.t("customer.serviceRequest.form.gallery") || "Gallery", onPress: pickserviceRequestImagesFromGallery },
        { text: i18n.t("common.cancel"), style: "cancel" },
      ]
    );
  };

  const normalizeNotificationType = (notification) => {
    // First, handle backend visit completion
    if (notification.type === 'visit_completed') {
      return 'appointment_completed';
    }

    // Handle reschedule declined
    if (
      notification.type === 'appointment_updated' &&
      (notification.title?.includes('Declined') || notification.title?.includes('Απορρίφθηκε'))
    ) {
      return 'reschedule_declined';
    }

    // For all other types, return as-is but ensure it matches our notificationTypes
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
    let label = service ? service.label : typeId || i18n.t("customer.serviceTypes.myocide");
    
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
        return i18n.t("customer.common.today");
      } else if (isTomorrow) {
        return i18n.t("customer.common.tomorrow");
      } else {
        // Get weekday and month from translations
        const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        
        const weekdayIndex = appointmentDate.getDay(); // 0 = Sunday
        const monthIndex = appointmentDate.getMonth();
        const day = appointmentDate.getDate();
        const year = appointmentDate.getFullYear();
        
        const weekday = i18n.t(`weekdays.short.${weekdays[weekdayIndex]}`);
        const month = i18n.t(`months.${months[monthIndex]}`);
        
        return `${weekday}, ${day} ${month} ${year}`;
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
          Alert.alert(i18n.t("common.error"), i18n.t("customer.contact.error.noPhone") || "Phone calls are not supported on this device");
        } else {
          return Linking.openURL(url);
        }
      })
      .catch(err => {
        console.error("Error opening phone app:", err);
        Alert.alert(i18n.t("common.error"), i18n.t("customer.contact.error.cantOpenPhone") || "Could not open phone app");
      });
  };
  const handleSendEmail = () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      Alert.alert(i18n.t("common.error"), i18n.t("customer.contact.error.fillBoth"));
      return;
    }

    const email = "info@pestify.gr";
    const subject = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(emailBody + "\n\n---\n" + i18n.t("customer.contact.email.footer") || "Sent from Pestify Customer Portal");
    const url = `mailto:${email}?subject=${subject}&body=${body}`;

    setSendingEmail(true);
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (!supported) {
          Alert.alert(i18n.t("common.error"), i18n.t("customer.contact.error.noEmailClient"));
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
        Alert.alert(i18n.t("common.error"), i18n.t("customer.contact.error.cantOpen"));
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
        return i18n.t("customer.appointments.status.pendingReschedule");

      case 'rescheduled':
        return i18n.t("customer.appointments.status.rescheduled");

      case 'scheduled':
        return i18n.t("customer.appointments.status.scheduled");

      case 'completed':
        return i18n.t("customer.appointments.status.completed");

      case 'cancelled':
        return i18n.t("customer.appointments.status.cancelled");

      default:
        return status?.toUpperCase?.() || i18n.t("customer.common.unknown");
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
    
    const { showWeekday = true, showYear = true } = options;
    
    const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    const weekdayIndex = date.getDay();
    const monthIndex = date.getMonth();
    const day = date.getDate();
    const year = date.getFullYear();
    
    let formattedDate = '';
    
    if (showWeekday) {
      formattedDate += i18n.t(`weekdays.short.${weekdays[weekdayIndex]}`) + ', ';
    }
    
    formattedDate += `${day} ${i18n.t(`months.${months[monthIndex]}`)}`;
    
    if (showYear) {
      formattedDate += ` ${year}`;
    }
    
    return formattedDate;
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
        return i18n.t("customer.common.today");
      }
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (appointmentDate.getTime() === tomorrow.getTime()) {
        return i18n.t("customer.common.tomorrow");
      }
      
      // If within 7 days, show weekday
      const diffDays = Math.floor((appointmentDate - today) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const weekdayIndex = appointmentDate.getDay();
        return i18n.t(`weekdays.short.${weekdays[weekdayIndex]}`);
      }
      
      // Otherwise show date with translated month
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIndex = appointmentDate.getMonth();
      const day = appointmentDate.getDate();
      const month = i18n.t(`months.${months[monthIndex]}`);
      
      return `${day} ${month}`;
    } catch (error) {
      console.error("Short date formatting error:", error);
      return dateStr;
    }
  };

  
  const serviceTypes = [
    { id: "myocide", label: i18n.t("customer.serviceTypes.myocide"), description: i18n.t("admin.schedule.serviceType.myocide.description") || "Standard bait station service", icon: "pest-control-rodent", color: "#1f9c8b" },
    { id: "disinfection", label: i18n.t("customer.serviceTypes.disinfection"), description: i18n.t("admin.schedule.serviceType.disinfection.description") || "Disinfection service", icon: "clean-hands", color: "#1f9c8b" },
    { id: "insecticide", label: i18n.t("customer.serviceTypes.insecticide"), description: i18n.t("admin.schedule.serviceType.insecticide.description") || "Insecticide treatment", icon: "pest-control", color: "#1f9c8b" },
    { id: "special", label: i18n.t("customer.serviceTypes.special"), description: i18n.t("admin.schedule.serviceType.special.description") || "Custom pest control services", icon: "star", color: "#1f9c8b" },
  ];

  const specialServiceSubtypes = [
    { id: "grass_cutworm", label: i18n.t("customer.specialSubtypes.grass_cutworm"), icon: "seedling", library: "FontAwesome5" },
    { id: "fumigation", label: i18n.t("customer.specialSubtypes.fumigation"), icon: "cloud", library: "Feather" },
    { id: "termites", label: i18n.t("customer.specialSubtypes.termites"), icon: "bug", library: "FontAwesome5" },
    { id: "exclusion", label: i18n.t("customer.specialSubtypes.exclusion"), icon: "block", library: "Entypo" }, 
    { id: "snake_repulsion", label: i18n.t("customer.specialSubtypes.snake_repulsion"), icon: "snake", library: "MaterialCommunityIcons" }, 
    { id: "bird_control", label: i18n.t("customer.specialSubtypes.bird_control"), icon: "feather", library: "Feather" },
    { id: "bed_bugs", label: i18n.t("customer.specialSubtypes.bed_bugs"), icon: "bug-report", library: "MaterialIcons" },
    { id: "fleas", label: i18n.t("customer.specialSubtypes.fleas"), icon: "paw", library: "FontAwesome5" }, 
    { id: "plant_protection", label: i18n.t("customer.specialSubtypes.plant_protection"), icon: "grass", library: "MaterialIcons" }, 
    { id: "palm_weevil", label: i18n.t("customer.specialSubtypes.palm_weevil"), icon: "tree", library: "FontAwesome5" },
    { id: "other", label: i18n.t("customer.specialSubtypes.other"), icon: "more-horizontal", library: "Feather" },
  ];

  const urgencyOptions = [
    {
        id: "low",
        label: i18n.t("customer.serviceRequest.urgency.low.label"),
        description: i18n.t("customer.serviceRequest.urgency.low.description"),
        icon: "calendar",
        color: "#1f9c8b",
    },
    {
        id: "normal",
        label: i18n.t("customer.serviceRequest.urgency.normal.label"),
        description: i18n.t("customer.serviceRequest.urgency.normal.description"),
        icon: "clock",
        color: "#1f9c8b",
    },
    {
        id: "high",
        label: i18n.t("customer.serviceRequest.urgency.high.label"),
        description: i18n.t("customer.serviceRequest.urgency.high.description"),
        icon: "alert-circle",
        color: "#1f9c8b",
    },
    {
        id: "emergency",
        label: i18n.t("customer.serviceRequest.urgency.emergency.label"),
        description: i18n.t("customer.serviceRequest.urgency.emergency.description"),
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
      Alert.alert(i18n.t("common.error"), i18n.t("customer.notifications.markAllReadError") || "Failed to mark all notifications as read");
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
    serviceRequestImages,

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
    setServiceRequestImages,

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
    openserviceRequestImagesChooser,
    pickserviceRequestImagesFromGallery,
    captureserviceRequestImages,

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