// CustomerRequestScreen.js - UPDATED MODAL STYLING
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Image,
  TextInput
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, FontAwesome5, Feather, Entypo, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiService from "../../services/apiService";
import pestfreeLogo from "../../../assets/pestfree_logo.png";
import { incrementTodayRequests } from './Statistics';

export default function CustomerRequestScreen({ onClose }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentData, setAppointmentData] = useState({
    technicianId: "",
    date: "",
    time: ""
  });
  const [technicians, setTechnicians] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [appointmentTime, setAppointmentTime] = useState(new Date());
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showSpecialSubtypeDropdown, setShowSpecialSubtypeDropdown] = useState(false);
  const [serviceType, setServiceType] = useState(selectedRequest?.service_type || 'myocide');
  const [specialServiceSubtype, setSpecialServiceSubtype] = useState(selectedRequest?.special_service_subtype || null);
  const [insecticideDetails, setInsecticideDetails] = useState('');
  const [disinfectionDetails, setDisinfectionDetails] = useState('');
  const [otherPestName, setOtherPestName] = useState(selectedRequest?.other_pest_name || '');
  
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [appointmentPrice, setAppointmentPrice] = useState("");
  const [appointmentCategory, setAppointmentCategory] = useState("first_time");
  const [complianceValidUntil, setComplianceValidUntil] = useState("");
  const APPOINTMENT_CATEGORIES = [
    { id: "first_time", label: "First-Time Appointment" },
    { id: "follow_up", label: "Follow-Up Visit" },
    { id: "one_time", label: "One-Time Treatment" },
    { id: "installation", label: "Installation Appointment" },
    { id: "inspection", label: "Inspection / Assessment" },
    { id: "emergency", label: "Emergency Call-Out" },
    { id: "contract_service", label: "Contract / Recurring Service" },
  ];

    const formatTime = (timeStr) => {
    if (!timeStr) return "";

    // If it's already in HH:MM format, return as-is
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }

    // If it's in HH:MM:SS format, remove seconds
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr.slice(0, 5); // "HH:MM"
    }

    // ISO timestamp
    try {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return `${d.getHours().toString().padStart(2, "0")}:${d
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;
      }
    } catch {}

    // Any other format, try to parse and format
    try {
      // Try to extract HH:MM from various formats
      const match = timeStr.match(/(\d{1,2})[:.](\d{2})/);
      if (match) {
        const hours = parseInt(match[1]).toString().padStart(2, '0');
        const minutes = match[2];
        return `${hours}:${minutes}`;
      }
    } catch {}

    return timeStr;
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      setServiceType(selectedRequest.service_type || 'myocide');
      setSpecialServiceSubtype(selectedRequest.special_service_subtype || null);
      setOtherPestName(selectedRequest.other_pest_name || '');
    }
  }, [selectedRequest]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log("🔄 Loading customer requests...");
      
      // Load ALL pending requests
      const requestsResult = await apiService.getCustomerRequests("pending");
      
      console.log("📥 FULL API RESPONSE:", JSON.stringify(requestsResult, null, 2));
      
      let formattedRequests = [];
      
      if (requestsResult?.success && Array.isArray(requestsResult.requests)) {
        console.log(`📊 Received ${requestsResult.requests.length} requests from API`);
        
        // Log the first request structure
        if (requestsResult.requests.length > 0) {
          console.log("🔍 First request structure:", JSON.stringify(requestsResult.requests[0], null, 2));
        }
        
        // Try different field names
        formattedRequests = requestsResult.requests.map((request, index) => {
          // Debug each request
          console.log(`📋 Request ${index} fields:`, Object.keys(request));
          
          return {
            id: request.id || request.requestId || `request-${index}`,
            customer_id: request.customerId || request.customer_id || 'unknown',
            customer_name: request.customerName || request.customer_name || 'Unknown Customer',
            customer_email: request.customerEmail || request.customer_email || '',
            service_type: request.serviceType || request.service_type || 'unknown',
            special_service_subtype: request.specialServiceSubtype || request.special_service_subtype || null,
            other_pest_name: request.otherPestName || request.other_pest_name || null,
            urgency: request.urgency || 'normal',
            description: request.description || 'No description',
            preferred_date: request.preferredDate || request.preferred_date || null,
            preferred_time: request.preferredTime || request.preferred_time || null,
            notes: request.notes || '',
            status: request.status || 'pending',
            created_at: request.createdAt || request.created_at || new Date().toISOString(),
            type:
              request.type ||
              request.requestType ||
              request.request_type ||
              (
                (request.serviceType || request.service_type) === "password_recovery"
                  ? "password_recovery"
                  : "service_request"
              ),
            original_appointment_id: request.originalAppointmentId || request.original_appointment_id || null,
            original_date: extractOriginalDate(request.description || ''),
            original_time: extractOriginalTime(request.description || '')
          };
        });
        
        console.log(`✅ Formatted ${formattedRequests.length} requests`);
      } else {
        console.warn("⚠️ No valid requests array found in response");
      }
      
      console.log(`✅ Total requests to display: ${formattedRequests.length}`);
      
      // Force a state update
      setRequests(prev => {
        console.log("🔄 Setting requests state. Old:", prev.length, "New:", formattedRequests.length);
        return formattedRequests;
      });
      
      // Load technicians
      console.log("🔄 Loading technicians...");
      const techsResult = await apiService.getTechnicians();
      
      if (Array.isArray(techsResult)) {
        console.log(`✅ Loaded ${techsResult.length} technicians`);
        setTechnicians(techsResult);
      } else if (techsResult?.technicians) {
        console.log(`✅ Loaded ${techsResult.technicians.length} technicians`);
        setTechnicians(techsResult.technicians);
      } else {
        console.warn("⚠️ Unexpected technicians response format:", techsResult);
        setTechnicians([]);
      }
      
    } catch (error) {
      console.error("❌ Failed to load data:", error);
      Alert.alert("Error", "Failed to load customer requests. Please try again.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const extractOriginalDate = (description) => {
    if (!description) return null;
    const match = description.match(/Original appointment: (\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  };

  const extractOriginalTime = (description) => {
    if (!description) return null;
    const match = description.match(/at (\d{2}:\d{2})/);
    return match ? match[1] : null;
  };

  const extractAppointmentId = (notes) => {
    if (!notes) return null;
    const match = notes.match(/appointment_id:(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  const submitPasswordReset = async () => {
    if (newPassword !== verifyPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    const res = await apiService.resetCustomerPassword(
      selectedRequest.id,
      newPassword
    );

    if (res.success) {
      Alert.alert("Success", "Password updated");
      setShowPasswordResetModal(false);
      loadData();
    } else {
      Alert.alert("Error", res.error || "Failed to update password");
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleAccept = (request) => {
    setSelectedRequest(request);

    if (request.type === "password_recovery") {
      setShowPasswordResetModal(true);
      return;
    }

    // ✅ SAME FLOW FOR SERVICE + RESCHEDULE
    setAppointmentData({
      technicianId: request.technician_id || "", // Pre-fill technician if available
      date: request.preferred_date || "",
      time: request.preferred_time || ""
    });

    // Also initialize serviceType based on the request
    setServiceType(request.service_type || 'myocide');
    setSpecialServiceSubtype(request.special_service_subtype || null);
    setOtherPestName(request.other_pest_name || '');
    
    // 🚨 CRITICAL: Pre-fill treatment details with customer's description
    // This gives admin a starting point but allows them to modify it
    setInsecticideDetails(request.description || '');
    setDisinfectionDetails(request.description || '');

    setShowAppointmentModal(true);
  };

  const handleDecline = async (request) => {
    Alert.alert(
      "Decline Request",
      `Decline request from ${request.customer_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessing(true);

              if (request.type === 'password_recovery') {
                await processPasswordRecoveryRequest(request);
              } else if (request.type === 'reschedule_request') {
                // Try BOTH methods to see which one works
                if (request.original_appointment_id) {
                  console.log("🔍 Testing API methods...");
                  
                  // Method 1: Try the full name
                  if (apiService.updateAppointmentRescheduleStatus) {
                    console.log("✅ Method 1 available");
                    const result = await apiService.updateAppointmentRescheduleStatus(
                      request.original_appointment_id,
                      {
                        action: "decline",
                        adminNotes: "Reschedule request declined"
                      }
                    );
                    
                    if (result?.success) {
                      console.log("✅ Method 1 succeeded");
                    }
                  } 
                  // Method 2: Try the short name
                  else if (apiService.updateRescheduleStatus) {
                    console.log("✅ Method 2 available");
                    const result = await apiService.updateRescheduleStatus(
                      request.original_appointment_id,
                      {
                        action: "decline",
                        adminNotes: "Reschedule request declined"
                      }
                    );
                    
                    if (result?.success) {
                      console.log("✅ Method 2 succeeded");
                    }
                  }
                  // Method 3: Fallback
                  else {
                    console.log("⚠️ No reschedule method found, using updateAppointment");
                    await apiService.updateAppointment({
                      id: request.original_appointment_id,
                      status: 'scheduled'
                    });
                  }
                }
              } else {
                await apiService.updateCustomerRequestStatus(
                  request.id,
                  "declined",
                  null,
                  "Service request declined"
                );
              }

              loadData();
            } catch (err) {
              console.error("❌ Decline failed:", err);
              Alert.alert("Error", err.message);
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
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

  // Helper function to get icon component
  const getIconComponent = (subtype) => {
    switch (subtype.library) {
      case "Feather":
        return <Feather name={subtype.icon} size={20} color="#666" />;
      case "FontAwesome5":
        return <FontAwesome5 name={subtype.icon} size={20} color="#666" />;
      case "MaterialIcons":
        return <MaterialIcons name={subtype.icon} size={20} color="#666" />;
      case "MaterialCommunityIcons":
        return <MaterialCommunityIcons name={subtype.icon} size={20} color="#666" />;
      case "Entypo":
        return <Entypo name={subtype.icon} size={20} color="#666" />;
      default:
        return <Feather name="help-circle" size={20} color="#666" />;
    }
  };

  const processServiceRequest = async (request, action) => {
    setProcessing(true);

    try {
      const status = action === 'approve' ? 'accepted' : 'declined';

      const result = await apiService.updateCustomerRequestStatus(
        request.id,
        status,
        null,
        status === 'accepted'
          ? 'Service request accepted'
          : 'Service request declined'
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update request');
      }

      setRequests(prev => prev.filter(r => r.id !== request.id));
      loadData();

      Alert.alert(
        'Success',
        status === 'accepted'
          ? 'Service request accepted'
          : 'Service request declined'
      );

    } catch (err) {
      console.error("❌ Service request error:", err);
      Alert.alert("Error", err.message);
    } finally {
      setProcessing(false);
    }
  };

  const processPasswordRecoveryRequest = async (request) => {
    setProcessing(true);

    try {
      const result = await apiService.updateCustomerRequestStatus(
        request.id,
        'declined',
        null,
        'Password recovery request declined'
      );

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to decline password request');
      }

      setRequests(prev => prev.filter(r => r.id !== request.id));
      loadData();
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setProcessing(false);
    }
  };

  const createAppointmentFromRequest = async () => {
    // Validation checks
    if (!appointmentData.technicianId || !appointmentData.date || !appointmentData.time) {
      Alert.alert("Error", "Please fill all appointment fields");
      return;
    }

    if (!appointmentPrice || appointmentPrice === "") {
      Alert.alert("Error", "Service price is required");
      return;
    }

    if (!appointmentCategory) {
      Alert.alert("Error", "Appointment category is required");
      return;
    }

    // For reschedule requests, use the original service type from the request
    const finalServiceType = selectedRequest.type === 'reschedule_request' 
      ? selectedRequest.service_type 
      : serviceType;

    // Validate compliance for Myocide
    if (finalServiceType === 'myocide' && !complianceValidUntil) {
      Alert.alert("Error", "Compliance Valid Until is required for Myocide services");
      return;
    }

    // For NEW service requests with special type, still validate
    if (selectedRequest.type !== 'reschedule_request' && finalServiceType === 'special' && !specialServiceSubtype) {
      Alert.alert("Error", "Please select a specific service type for Special Service");
      return;
    }

    if (selectedRequest.type !== 'reschedule_request' && finalServiceType === 'special' && specialServiceSubtype === 'other' && !otherPestName.trim()) {
      Alert.alert("Error", "Please type the name of the pest for 'Other' service");
      return;
    }

    try {
      setProcessing(true);

      const payload = {
        technicianId: appointmentData.technicianId,
        customerId: selectedRequest.customer_id,
        appointmentDate: appointmentData.date,
        appointmentTime: appointmentData.time,
        serviceType: finalServiceType,
        status: "scheduled",
        servicePrice: Number(appointmentPrice),
        compliance_valid_until: complianceValidUntil || null,
        appointmentCategory,
      };

      // For reschedule requests, use the original service details
      if (selectedRequest.type === 'reschedule_request') {
        payload.specialServiceSubtype = selectedRequest.special_service_subtype || null;
        payload.otherPestName = selectedRequest.other_pest_name || null;
      } else {
        // For new service requests, add service-specific details
        if (finalServiceType === 'special') {
          payload.specialServiceSubtype = specialServiceSubtype;
          
          if (specialServiceSubtype === 'other') {
            payload.otherPestName = otherPestName.trim();
          } else {
            const subtypeLabel = getSpecialServiceLabel(specialServiceSubtype) || specialServiceSubtype;
            payload.otherPestName = subtypeLabel;
          }
          console.log("🟢 Added special service details to payload:", {
            specialServiceSubtype: payload.specialServiceSubtype,
            otherPestName: payload.otherPestName
          });
        } else if (finalServiceType === 'myocide') {
          payload.otherPestName = 'Myocide Service';
          console.log("🟢 Added myocide service to payload");
        }
        // 🚨 CRITICAL FIX: For insecticide and disinfection, use admin's typed details
        else if (finalServiceType === 'insecticide') {
          // Use the admin's typed insecticideDetails instead of customer's description
          payload.otherPestName = insecticideDetails.trim() || selectedRequest.description || 'Insecticide Treatment';
          payload.insecticideDetails = insecticideDetails.trim() || selectedRequest.description || 'Insecticide Treatment';
          console.log("🟢 Added insecticide details from ADMIN:", insecticideDetails.trim());
        } else if (finalServiceType === 'disinfection') {
          // Use the admin's typed disinfectionDetails instead of customer's description
          payload.otherPestName = disinfectionDetails.trim() || selectedRequest.description || 'Disinfection Service';
          payload.disinfection_details = disinfectionDetails.trim() || selectedRequest.description || 'Disinfection Service';
          console.log("🟢 Added disinfection details from ADMIN:", disinfectionDetails.trim());
        }
      }

      console.log("📤 Creating appointment with payload:", payload);

      const appointmentResult = await apiService.createAppointment(payload);

      if (appointmentResult.success) {
        const appointmentId = appointmentResult.data?.id || appointmentResult.id;
        
        // Update the customer request status
        await apiService.updateCustomerRequestStatus(
          selectedRequest.id,
          'accepted',
          appointmentId,
          selectedRequest.type === 'reschedule_request'
            ? 'Reschedule request approved'
            : 'Request accepted and appointment scheduled'
        );
        
        // Remove from list
        setRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
        
        Alert.alert("Success", 
          selectedRequest.type === 'reschedule_request'
            ? "Reschedule approved successfully!"
            : "Appointment created successfully!",
          [
            { text: "OK", onPress: () => {
              setShowAppointmentModal(false);
              loadData(); // Refresh the list
            }}
          ]
        );
      } else {
        throw new Error(appointmentResult.error || "Failed to create appointment");
      }
    } catch (error) {
      console.error("❌ Error creating appointment:", error);
      Alert.alert("Error", error.message || "Failed to create appointment");
    } finally {
      setProcessing(false);
    }
  };

  const getSpecialServiceLabel = (subtype) => {
    const subtypeLabels = {
      'grass_cutworm': 'Grass Cutworm',
      'fumigation': 'Fumigation',
      'termites': 'Termites',
      'exclusion': 'Exclusion Service',
      'snake_repulsion': 'Snake Repulsion',
      'bird_control': 'Bird Control',
      'bed_bugs': 'Bed Bugs',
      'fleas': 'Fleas',
      'plant_protection': 'Plant Protection',
      'palm_weevil': 'Palm Weevil',
      'other': 'Other'
    };
    
    return subtypeLabels[subtype] || subtype;
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setAppointmentDate(selectedDate);
      // Store ONLY the date portion (YYYY-MM-DD)
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setAppointmentData(prev => ({ ...prev, date: formattedDate }));
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setAppointmentTime(selectedTime);
      
      // FORCE format to HH:MM without seconds
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const formattedTime = `${hours}:${minutes}`;
      
      console.log("🕒 Formatted time:", formattedTime, "from:", selectedTime);
      
      setAppointmentData(prev => ({ 
        ...prev, 
        time: formattedTime 
      }));
    }
  };

  const approveReschedule = async () => {
    if (!appointmentData.date || !appointmentData.time) {
      Alert.alert("Error", "Please select date and time");
      return;
    }

    if (!appointmentData.technicianId) {
      Alert.alert("Error", "Please select a technician");
      return;
    }

    if (!appointmentPrice || appointmentPrice === "") {
      Alert.alert("Error", "Service price is required");
      return;
    }

    if (!appointmentCategory) {
      Alert.alert("Error", "Appointment category is required");
      return;
    }

    // Only validate compliance for Myocide services
    if (selectedRequest?.service_type === 'myocide' && !complianceValidUntil) {
      Alert.alert("Error", "Compliance Valid Until is required for Myocide services");
      return;
    }

    try {
      setProcessing(true);

      // ✅ Create the payload with ALL fields including technicianId
      const payload = {
        action: "approve",
        requestedDate: appointmentData.date,
        requestedTime: appointmentData.time,
        servicePrice: Number(appointmentPrice),
        complianceValidUntil: complianceValidUntil || null,
        technicianId: appointmentData.technicianId, // Include technicianId
        appointmentCategory: appointmentCategory,
        adminNotes: "Reschedule approved"
      };

      console.log("📤 Sending reschedule approval payload:", payload);

      const rescheduleResult = await apiService.updateRescheduleStatus(
        selectedRequest.original_appointment_id,
        payload
      );

      console.log("📥 Reschedule approval response:", rescheduleResult);

      if (rescheduleResult.success) {
        // Update the customer request status
        await apiService.updateCustomerRequestStatus(
          selectedRequest.id,
          "accepted",
          rescheduleResult.appointment?.id || null,
          "Reschedule approved - old appointment deleted"
        );

        Alert.alert("Success", "Reschedule approved. Old appointment deleted, new appointment created.", [
          {
            text: "OK",
            onPress: () => {
              setShowAppointmentModal(false);
              loadData(); // Refresh the list
            }
          }
        ]);
      } else {
        throw new Error(rescheduleResult.error || "Failed to approve reschedule");
      }

    } catch (err) {
      console.error("❌ Reschedule approval failed:", err);
      Alert.alert("Error", err.message || "Failed to approve reschedule");
    } finally {
      setProcessing(false);
    }
  };

  const getServiceTypeLabel = (serviceType, subtype, otherPest = null) => {
    if (!serviceType) return 'Unknown Service';
    
    const labels = {
      'myocide': 'Myocide',
      'disinfection': 'Disinfection',
      'insecticide': 'Insecticide',
      'special': 'Special Service'
    };
    
    let label = labels[serviceType] || serviceType;
    
    if (serviceType === 'special' && subtype) {
      const subtypeLabels = {
        'grass_cutworm': 'Grass Cutworm',
        'fumigation': 'Fumigation',
        'termites': 'Termites',
        'exclusion': 'Exclusion Service',
        'snake_repulsion': 'Snake Repulsion',
        'bird_control': 'Bird Control',
        'bed_bugs': 'Bed Bugs',
        'fleas': 'Fleas',
        'plant_protection': 'Plant Protection',
        'palm_weevil': 'Palm Weevil',
        'other': 'Other'
      };
      
      const subtypeLabel = subtypeLabels[subtype] || subtype;
      
      if (subtype === 'other' && otherPest) {
        label = `Special Service - Other (${otherPest})`;
      } else if (subtype !== 'other') {
        label = `Special Service - ${subtypeLabel}`;
      } else {
        label = `Special Service - ${subtypeLabel}`;
      }
    }
    
    return label;
  };

  const getUrgencyColor = (urgency) => {
    switch(urgency) {
      case 'emergency': return '#1f9c8b';
      case 'high': return '#1f9c8b';
      case 'normal': return '#1f9c8b';
      case 'low': return '#1f9c8b';
      default: return '#666';
    }
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return '';
    
    // If it's already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // If it's a full ISO string, extract date part
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    
    // Try to parse as date
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Error formatting date:', error);
    }
    
    return dateString;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    
    try {
      // Handle different date formats
      let date;
      if (dateString.includes('T')) {
        // ISO string
        date = new Date(dateString);
      } else {
        // YYYY-MM-DD format
        date = new Date(dateString + 'T00:00:00');
      }
      
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString, timeString) => {
    const hasDate = !!dateString;
    const hasTime = !!timeString;

    if (!hasDate && !hasTime) return "Not specified";

    const datePart = hasDate ? formatDate(dateString) : "Date not specified";
    const timePart = hasTime ? formatTime(timeString) : null;

    return timePart ? `${datePart} at ${timePart}` : datePart;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f9c8b" />
        <Text style={styles.loadingText}>Loading Customer Requests...</Text>
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
                <MaterialIcons name="request-page" size={14} color="#fff" />
                <Text style={styles.adminBadgeText}>REQUESTS</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Service & Reschedule Requests</Text>
            <Text style={styles.title}>Request Management</Text>
            <Text style={styles.subtitle}>
              Review and manage customer service requests and reschedule requests
            </Text>
          </View>
        </View>

        {/* MAIN CONTENT */}
        <View style={styles.contentContainer}>
          {/* QUICK STATS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="dashboard" size={20} color="#2c3e50" />
              <Text style={styles.sectionTitle}>Request Overview</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <MaterialIcons name="pending-actions" size={20} color="#1f9c8b" />
                </View>
                <Text style={styles.statNumber}>{requests.length}</Text>
                <Text style={styles.statLabel}>Pending Requests</Text>
                <Text style={[styles.statTrend, requests.length > 0 && { color: '#1f9c8b' }]}>
                  {requests.length > 0 ? 'Action Required' : 'All Clear'}
                </Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <MaterialIcons name="today" size={20} color="#1f9c8b" />
                </View>
                <Text style={styles.statNumber}>
                  {requests.filter(r => {
                    if (!r.created_at) return false;
                    const today = new Date().toISOString().split('T')[0];
                    const requestDate = new Date(r.created_at).toISOString().split('T')[0];
                    return requestDate === today;
                  }).length}
                </Text>
                <Text style={styles.statLabel}>Today's Requests</Text>
                <Text style={styles.statTrend}>New</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <MaterialIcons name="edit-calendar" size={20} color="#1f9c8b" />
                </View>
                <Text style={styles.statNumber}>
                  {requests.filter(r => r.type === 'reschedule_request').length}
                </Text>
                <Text style={styles.statLabel}>Reschedule Requests</Text>
                <Text style={styles.statTrend}>Priority</Text>
              </View>
            </View>
          </View>

          {/* REQUESTS LIST */}
          <View style={styles.section}>
            {requests.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="check-circle" size={64} color="#1f9c8b" />
                <Text style={styles.emptyTitle}>No Pending Requests</Text>
                <Text style={styles.emptyText}>
                  All customer requests have been processed
                </Text>
                <TouchableOpacity onPress={loadData} style={styles.primaryButton}>
                  <MaterialIcons name="refresh" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="list-alt" size={20} color="#2c3e50" />
                  <Text style={styles.sectionTitle}>Pending Requests ({requests.length})</Text>
                </View>

                <View style={styles.requestsList}>
                  {requests.map((request) => (
                    
                    <View key={request.id} style={styles.requestCard}>
                      <View style={styles.cardHeader}>
                        <View style={styles.customerInfo}>
                          <View style={styles.customerIcon}>
                            <MaterialIcons name="person" size={18} color="#1f9c8b" />
                          </View>
                          <View style={styles.customerDetails}>
                            <Text style={styles.customerName}>{request.customer_name}</Text>
                            <Text style={styles.requestDate}>
                              {request.created_at ? new Date(request.created_at).toLocaleDateString() : 'Unknown date'}
                            </Text>
                          </View>
                        </View>
                        
                        <View
                          style={[
                            styles.statusBadge,
                            request.type === 'password_recovery'
                              ? styles.passwordBadge
                              : request.type === 'reschedule_request'
                                ? styles.rescheduleBadge
                                : styles.serviceBadge
                          ]}
                        >
                          <MaterialIcons
                            name={
                              request.type === 'password_recovery'
                                ? 'lock'
                                : request.type === 'reschedule_request'
                                  ? 'edit-calendar'
                                  : 'construction'
                            }
                            size={12}
                            color="#fff"
                          />
                          <Text style={styles.statusBadgeText}>
                            {request.type === 'password_recovery'
                              ? 'PASSWORD'
                              : request.type === 'reschedule_request'
                                ? 'RESCHEDULE'
                                : 'SERVICE'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardContent}>
                        <View style={styles.serviceRow}>
                          <MaterialIcons name="construction" size={16} color="#666" />
                          <Text style={styles.serviceType}>
                            {getServiceTypeLabel(request.service_type, request.special_service_subtype)}
                          </Text>
                          {request.other_pest_name && (
                            <Text style={styles.pestName}>
                              • {request.other_pest_name}
                            </Text>
                          )}
                        </View>

                        <View style={styles.urgencyRow}>
                          <MaterialIcons name="priority-high" size={14} color={getUrgencyColor(request.urgency)} />
                          <Text style={[styles.urgencyText, { color: getUrgencyColor(request.urgency) }]}>
                            {request.urgency?.toUpperCase() || 'NORMAL'} PRIORITY
                          </Text>
                        </View>

                        <Text style={styles.description} numberOfLines={2}>
                          {request.description || 'No description provided'}
                        </Text>

                        {(request.preferred_date || request.preferred_time) && (
                          <View style={styles.preferredTime}>
                            <MaterialIcons name="schedule" size={14} color="#666" />
                            <Text style={styles.preferredTimeText}>
                              Preferred: {formatDateTime(request.preferred_date, request.preferred_time)}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.detailsButton}
                          onPress={() => handleViewDetails(request)}
                        >
                          <MaterialIcons name="visibility" size={16} color="#1f9c8b" />
                          <Text style={styles.detailsButtonText}>View Details</Text>
                        </TouchableOpacity>
                        
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={styles.declineButton}
                            onPress={() => handleDecline(request)}
                            disabled={processing}
                          >
                            <MaterialIcons name="close" size={16} color="#fff" />
                            <Text style={styles.declineButtonText}>Decline</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => handleAccept(request)}
                            disabled={processing}
                          >
                            <MaterialIcons name="check" size={16} color="#fff" />
                            <Text style={styles.primaryButtonText}>Accept</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Customer Request Management System</Text>
            <Text style={styles.footerSubtext}>
              Version 1.0 • Last updated: {new Date().toLocaleDateString()}
            </Text>
            <Text style={styles.footerCopyright}>
              © {new Date().getFullYear()} Pest-Free. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Request Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedRequest ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Request Details</Text>
                  <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                    <MaterialIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalContent}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Customer</Text>
                    <Text style={styles.detailValue}>{selectedRequest.customer_name}</Text>
                    {selectedRequest.customer_email && (
                      <Text style={styles.detailSubValue}>{selectedRequest.customer_email}</Text>
                    )}
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Service Type</Text>
                    <Text style={styles.detailValue}>
                      {getServiceTypeLabel(selectedRequest.service_type, selectedRequest.special_service_subtype)}
                    </Text>
                    {selectedRequest.other_pest_name && (
                      <Text style={styles.detailSubValue}>
                        Pest: {selectedRequest.other_pest_name}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Urgency</Text>
                    <View style={[styles.urgencyDisplay, { backgroundColor: getUrgencyColor(selectedRequest.urgency) + '20' }]}>
                      <Text style={[styles.urgencyDisplayText, { color: getUrgencyColor(selectedRequest.urgency) }]}>
                        {selectedRequest.urgency?.toUpperCase() || 'NORMAL'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.detailValue}>{selectedRequest.description}</Text>
                  </View>
                  
                  {selectedRequest.type === 'reschedule_request' && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Reschedule Details</Text>
                      <Text style={styles.detailValue}>
                        Original: {formatDateTime(selectedRequest.original_date, selectedRequest.original_time)}
                      </Text>
                      <Text style={styles.detailValue}>
                        Requested: {formatDateTime(selectedRequest.preferred_date, selectedRequest.preferred_time)}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Preferred Date & Time</Text>
                    <Text style={styles.detailValue}>
                      {selectedRequest.preferred_date 
                        ? formatDateTime(selectedRequest.preferred_date, selectedRequest.preferred_time)
                        : 'Not specified'}
                    </Text>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Submitted</Text>
                    <Text style={styles.detailValue}>
                      {selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleString() : 'Unknown'}
                    </Text>
                  </View>
                  
                  {selectedRequest.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Additional Notes</Text>
                      <Text style={styles.detailValue}>{selectedRequest.notes}</Text>
                    </View>
                  )}
                </ScrollView>
                
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.declineButton]}
                    onPress={() => {
                      setShowDetailsModal(false);
                      handleDecline(selectedRequest);
                    }}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="close" size={18} color="#fff" />
                        <Text style={styles.modalButtonText}>Decline Request</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.primaryButton]}
                    onPress={() => {
                      setShowDetailsModal(false);
                      handleAccept(selectedRequest);
                    }}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="check" size={18} color="#fff" />
                        <Text style={styles.modalButtonText}>
                          {selectedRequest.type === 'password_recovery'
                            ? 'Reset Password'
                            : selectedRequest.type === 'reschedule_request'
                              ? 'Accept Reschedule'
                              : 'Accept & Schedule'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.loadingModalContent}>
                <ActivityIndicator size="large" color="#1f9c8b" />
                <Text style={styles.loadingText}>Loading request details...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Appointment Creation Modal - COMPLETE VERSION */}
      <Modal
        visible={showAppointmentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAppointmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.appointmentModalContainer}>
            <View style={styles.appointmentModalHeader}>
              <View style={styles.appointmentModalTitleContainer}>
                <MaterialIcons 
                  name="schedule" 
                  size={24} 
                  color="#1f9c8b" 
                  style={styles.appointmentModalIcon}
                />
                <Text style={styles.appointmentModalTitle}>
                  {selectedRequest?.type === 'reschedule_request' 
                    ? 'Approve Reschedule Request' 
                    : 'Schedule Appointment'}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowAppointmentModal(false)}
                style={styles.appointmentCloseButton}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {selectedRequest ? (
              <ScrollView 
                style={styles.appointmentModalContent} 
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.appointmentModalScrollContent}
              >
                {/* Customer Info */}
                <View style={styles.customerInfoHeader}>
                  <View style={styles.customerAvatar}>
                    <Text style={styles.customerAvatarText}>
                      {selectedRequest?.customer_name?.charAt(0).toUpperCase() || 'C'}
                    </Text>
                  </View>
                  <View style={styles.customerInfoText}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {selectedRequest?.customer_name}
                    </Text>
                    <Text style={styles.customerRequestType}>
                      {selectedRequest?.type === 'reschedule_request' 
                        ? 'Reschedule Request' 
                        : 'New Service Request'}
                    </Text>
                  </View>
                </View>

                {/* SERVICE PRICE */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Service Price (€) <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={styles.inputWithIcon}>
                    <MaterialIcons name="euro" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.formInput}
                      keyboardType="number-pad"
                      placeholder="e.g. 80"
                      value={appointmentPrice}
                      onChangeText={setAppointmentPrice}
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                {/* APPOINTMENT CATEGORY */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Appointment Category <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.formDropdown}
                    onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dropdownContent}>
                      <MaterialIcons name="category" size={20} color="#666" />
                      <Text style={styles.dropdownText}>
                        {APPOINTMENT_CATEGORIES.find(c => c.id === appointmentCategory)?.label || 'Select Category'}
                      </Text>
                    </View>
                    <MaterialIcons 
                      name={showCategoryDropdown ? "expand-less" : "expand-more"} 
                      size={24} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                  
                  {showCategoryDropdown && (
                    <View style={styles.dropdownOptionsContainer}>
                      <ScrollView 
                        style={styles.dropdownScrollView}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {APPOINTMENT_CATEGORIES.map(cat => (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.dropdownOption,
                              appointmentCategory === cat.id && styles.dropdownOptionSelected
                            ]}
                            onPress={() => {
                              setAppointmentCategory(cat.id);
                              setShowCategoryDropdown(false);
                            }}
                          >
                            <Text style={[
                              styles.dropdownOptionText,
                              appointmentCategory === cat.id && styles.dropdownOptionTextSelected
                            ]} numberOfLines={1}>
                              {cat.label}
                            </Text>
                            {appointmentCategory === cat.id && (
                              <MaterialIcons name="check" size={18} color="#1f9c8b" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* COMPLIANCE - Required for Myocide, Optional for others */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Compliance Valid Until {selectedRequest?.service_type === 'myocide' && <Text style={styles.requiredStar}>*</Text>}
                  </Text>
                  <View style={styles.inputWithIcon}>
                    <MaterialIcons name="verified" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.formInput}
                      placeholder={selectedRequest?.service_type === 'myocide' ? "YYYY-MM-DD (Required)" : "YYYY-MM-DD (Optional)"}
                      value={complianceValidUntil}
                      onChangeText={setComplianceValidUntil}
                      placeholderTextColor="#999"
                    />
                  </View>
                  <Text style={styles.helpText}>
                    {selectedRequest?.service_type === 'myocide' 
                      ? 'Required for Myocide service compliance certificate' 
                      : 'Optional: Only needed if this service affects compliance'}
                  </Text>
                </View>

                {/* SERVICE TYPE DISPLAY - For reschedule requests */}
                {selectedRequest.type === 'reschedule_request' ? (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Service Type</Text>
                    <View style={styles.currentServiceDisplay}>
                      <MaterialIcons name="star" size={18} color="#1f9c8b" />
                      <Text style={styles.currentServiceText}>
                        {getServiceTypeLabel(
                          selectedRequest?.service_type,
                          selectedRequest?.special_service_subtype,
                          selectedRequest?.other_pest_name
                        )}
                      </Text>
                    </View>
                  </View>
                ) : (
                  /* SERVICE TYPE SELECTION - Only for NEW service requests */
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Service Type</Text>
                    
                    {/* Display current service type */}
                    <View style={styles.currentServiceDisplay}>
                      <MaterialIcons name="star" size={18} color="#1f9c8b" />
                      <Text style={styles.currentServiceText}>
                        Current: {getServiceTypeLabel(
                          selectedRequest?.service_type,
                          selectedRequest?.special_service_subtype,
                          selectedRequest?.other_pest_name
                        )}
                      </Text>
                    </View>
                    
                    {/* Allow changing service type if needed */}
                    <TouchableOpacity
                      style={styles.formDropdown}
                      onPress={() => setShowServiceDropdown(!showServiceDropdown)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dropdownContent}>
                        <MaterialIcons name="build" size={20} color="#666" />
                        <Text style={styles.dropdownText}>
                          {serviceTypes.find(s => s.id === serviceType)?.label || 'Change Service Type'}
                        </Text>
                      </View>
                      <MaterialIcons 
                        name={showServiceDropdown ? "expand-less" : "expand-more"} 
                        size={24} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                    
                    {showServiceDropdown && (
                      <View style={styles.dropdownOptionsContainer}>
                        <ScrollView 
                          style={styles.dropdownScrollView}
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                        >
                          {serviceTypes.map(service => (
                            <TouchableOpacity
                              key={service.id}
                              style={[
                                styles.dropdownOption,
                                serviceType === service.id && styles.dropdownOptionSelected
                              ]}
                              onPress={() => {
                                setServiceType(service.id);
                                setShowServiceDropdown(false);
                                
                                // Reset special service subtype when changing service type
                                if (service.id !== 'special') {
                                  setSpecialServiceSubtype(null);
                                  setOtherPestName('');
                                }
                              }}
                            >
                              <View style={styles.serviceOptionContent}>
                                <MaterialIcons 
                                  name={service.icon} 
                                  size={20} 
                                  color={service.color} 
                                  style={styles.serviceOptionIcon}
                                />
                                <Text style={[
                                  styles.dropdownOptionText,
                                  serviceType === service.id && styles.dropdownOptionTextSelected
                                ]}>
                                  {service.label}
                                </Text>
                              </View>
                              {serviceType === service.id && (
                                <MaterialIcons name="check" size={18} color="#1f9c8b" />
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}

                {/* SPECIAL SERVICE SUBTYPE - Only for NEW service requests with special type */}
                {selectedRequest.type !== 'reschedule_request' && serviceType === 'special' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Specific Service Type <Text style={styles.requiredStar}>*</Text></Text>
                    <TouchableOpacity
                      style={styles.formDropdown}
                      onPress={() => setShowSpecialSubtypeDropdown(!showSpecialSubtypeDropdown)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dropdownContent}>
                        <MaterialIcons name="category" size={20} color="#666" />
                        <Text style={styles.dropdownText}>
                          {specialServiceSubtype 
                            ? specialServiceSubtypes.find(s => s.id === specialServiceSubtype)?.label
                            : 'Select specific service type'}
                        </Text>
                      </View>
                      <MaterialIcons 
                        name={showSpecialSubtypeDropdown ? "expand-less" : "expand-more"} 
                        size={24} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                    
                    {showSpecialSubtypeDropdown && (
                      <View style={styles.dropdownOptionsContainer}>
                        <ScrollView 
                          style={styles.dropdownScrollView}
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                        >
                          {specialServiceSubtypes.map(subtype => (
                            <TouchableOpacity
                              key={subtype.id}
                              style={[
                                styles.dropdownOption,
                                specialServiceSubtype === subtype.id && styles.dropdownOptionSelected
                              ]}
                              onPress={() => {
                                setSpecialServiceSubtype(subtype.id);
                                setShowSpecialSubtypeDropdown(false);
                                
                                // Reset other pest name if not "other"
                                if (subtype.id !== 'other') {
                                  setOtherPestName('');
                                }
                              }}
                            >
                              <View style={styles.serviceOptionContent}>
                                {getIconComponent(subtype)}
                                <Text style={[
                                  styles.dropdownOptionText,
                                  specialServiceSubtype === subtype.id && styles.dropdownOptionTextSelected
                                ]}>
                                  {subtype.label}
                                </Text>
                              </View>
                              {specialServiceSubtype === subtype.id && (
                                <MaterialIcons name="check" size={18} color="#1f9c8b" />
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Other Pest Name Input */}
                    {specialServiceSubtype === "other" && (
                      <View style={[styles.formGroup, { marginTop: 12 }]}>
                        <Text style={styles.formLabel}>Specify Pest Name <Text style={styles.requiredStar}>*</Text></Text>
                        <View style={styles.borderedInputContainer}>
                          <TextInput
                            style={styles.formInput}
                            placeholder="e.g., Ants, Spiders, Cockroaches, etc."
                            placeholderTextColor="#999"
                            value={otherPestName}
                            onChangeText={setOtherPestName}
                            maxLength={50}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* TREATMENT DETAILS SECTIONS - REMOVED for reschedule requests */}
                {selectedRequest.type !== 'reschedule_request' && serviceType === 'insecticide' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Treatment Details <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                      style={styles.formTextArea}
                      placeholder="Describe the insecticide requirements..."
                      placeholderTextColor="#999"
                      value={insecticideDetails}
                      onChangeText={setInsecticideDetails}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                )}

                {selectedRequest.type !== 'reschedule_request' && serviceType === 'disinfection' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Treatment Details <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                      style={styles.formTextArea}
                      placeholder="Describe the disinfection requirements..."
                      placeholderTextColor="#999"
                      value={disinfectionDetails}
                      onChangeText={setDisinfectionDetails}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                )}

                {/* TECHNICIAN SELECTION */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Technician <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  {technicians.length === 0 ? (
                    <View style={styles.noTechniciansContainer}>
                      <MaterialIcons name="warning" size={20} color="#F44336" />
                      <Text style={styles.noTechniciansText}>
                        No technicians available. Please add technicians first.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView 
                      horizontal 
                      style={styles.techniciansList} 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.techniciansListContent}
                    >
                      {technicians.map((tech, index) => {
                        const techId = tech.id || tech.technicianId;
                        const techName = `${tech.firstName || tech.first_name || ''} ${tech.lastName || tech.last_name || ''}`.trim();
                        
                        return (
                          <TouchableOpacity
                            key={techId || tech.username || `tech-${index}`}
                            style={[
                              styles.technicianOption,
                              appointmentData.technicianId === techId && 
                              styles.technicianOptionSelected
                            ]}
                            onPress={() => {
                              setAppointmentData(prev => ({
                                ...prev,
                                technicianId: techId
                              }));
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.technicianOptionContent}>
                              <View style={[
                                styles.technicianAvatar,
                                appointmentData.technicianId === techId && 
                                styles.technicianAvatarSelected
                              ]}>
                                <FontAwesome5 
                                  name="user-cog" 
                                  size={14} 
                                  color={appointmentData.technicianId === techId ? "#fff" : "#1f9c8b"} 
                                />
                              </View>
                              <Text style={[
                                styles.technicianName,
                                appointmentData.technicianId === techId && 
                                styles.technicianNameSelected
                              ]} numberOfLines={1}>
                                {techName || tech.username || 'Unknown'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
                
                {/* DATE SELECTION */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Date <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dateTimeButtonContent}>
                      <View style={[styles.dateTimeIcon, { backgroundColor: 'rgba(31, 156, 139, 0.1)' }]}>
                        <MaterialIcons name="event" size={20} color="#1f9c8b" />
                      </View>
                      <View style={styles.dateTimeTextContainer}>
                        <Text style={styles.dateTimeLabel}>Appointment Date</Text>
                        <Text style={styles.dateTimeValue}>
                          {/* Format the date to show only YYYY-MM-DD */}
                          {formatDateOnly(appointmentData.date) || 'Select date'}
                        </Text>
                      </View>
                      <MaterialIcons name="calendar-today" size={20} color="#666" />
                    </View>
                  </TouchableOpacity>
                  
                  {showDatePicker && (
                    <DateTimePicker
                      value={appointmentDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={new Date()}
                      onChange={handleDateChange}
                      style={styles.datePicker}
                    />
                  )}
                </View>

                {/* TIME SELECTION */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Time <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dateTimeButtonContent}>
                      <View style={[styles.dateTimeIcon, { backgroundColor: 'rgba(31, 156, 139, 0.1)' }]}>
                        <MaterialIcons name="access-time" size={20} color="#1f9c8b" />
                      </View>
                      <View style={styles.dateTimeTextContainer}>
                        <Text style={styles.dateTimeLabel}>Appointment Time</Text>
                        <Text style={styles.dateTimeValue}>
                          {appointmentData.time ? formatTime(appointmentData.time) : 'Select time'}
                        </Text>
                      </View>
                      <MaterialIcons name="schedule" size={20} color="#666" />
                    </View>
                  </TouchableOpacity>
                  
                  {showTimePicker && (
                    <DateTimePicker
                      value={appointmentTime}
                      mode="time"
                      display="spinner"
                      is24Hour={true}
                      minuteInterval={5}
                      onChange={handleTimeChange}
                      style={styles.datePicker}
                    />
                  )}
                </View>

                {/* Show customer's preferred time if available */}
                {(selectedRequest?.preferred_date || selectedRequest?.preferred_time) && (
                  <View style={styles.preferencesCard}>
                    <View style={styles.preferencesHeader}>
                      <MaterialIcons name="thumb-up" size={18} color="#1f9c8b" />
                      <Text style={styles.preferencesTitle}>Customer Preferences</Text>
                    </View>
                    <View style={styles.preferencesContent}>
                      {selectedRequest?.preferred_date && (
                        <View style={styles.preferenceItem}>
                          <MaterialIcons name="calendar-today" size={16} color="#666" />
                          <Text style={styles.preferenceText}>
                            Preferred date: {formatDate(selectedRequest.preferred_date)}
                          </Text>
                        </View>
                      )}
                      {selectedRequest?.preferred_time && (
                        <View style={styles.preferenceItem}>
                          <MaterialIcons name="schedule" size={16} color="#666" />
                          <Text style={styles.preferenceText}>
                            Preferred time: {formatTime(selectedRequest.preferred_time)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
                
                {selectedRequest?.notes && (
                  <View style={styles.notesCard}>
                    <View style={styles.notesHeader}>
                      <MaterialIcons name="notes" size={18} color="#666" />
                      <Text style={styles.notesTitle}>Customer Notes</Text>
                    </View>
                    <Text style={styles.notesText}>
                      {selectedRequest.notes}
                    </Text>
                  </View>
                )}
              </ScrollView>
            ) : (
              <View style={styles.loadingModalContent}>
                <ActivityIndicator size="large" color="#1f9c8b" />
                <Text style={styles.loadingText}>Loading request details...</Text>
              </View>
            )}
            
            <View style={styles.appointmentModalFooter}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.cancelActionButton]}
                onPress={() => setShowAppointmentModal(false)}
                disabled={processing}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelActionButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalActionButton, 
                  styles.primaryActionButton,
                  (!selectedRequest || !appointmentData.technicianId || !appointmentData.date || !appointmentData.time || !appointmentPrice || processing) && 
                  styles.disabledActionButton
                ]}
                onPress={() => {
                  if (!selectedRequest) return;
                  
                  // ✅ FIXED VALIDATION: Different rules for reschedule vs new requests
                  if (selectedRequest.type === 'reschedule_request') {
                    // For reschedule requests, use the simpler validation
                    if (selectedRequest.service_type === 'myocide' && !complianceValidUntil) {
                      Alert.alert("Error", "Compliance Valid Until is required for Myocide services");
                      return;
                    }
                    approveReschedule();
                  } else {
                    // For new service requests, validate all fields
                    if (serviceType === 'myocide' && !complianceValidUntil) {
                      Alert.alert("Error", "Compliance Valid Until is required for Myocide services");
                      return;
                    }
                    
                    if (serviceType === 'special' && !specialServiceSubtype) {
                      Alert.alert("Error", "Please select a specific service type for Special Service");
                      return;
                    }
                    
                    if (serviceType === 'special' && specialServiceSubtype === 'other' && !otherPestName.trim()) {
                      Alert.alert("Error", "Please type the name of the pest for 'Other' service");
                      return;
                    }
                    
                    createAppointmentFromRequest();
                  }
                }}
                disabled={processing || !selectedRequest || !appointmentData.technicianId || !appointmentData.date || !appointmentData.time || !appointmentPrice}
                activeOpacity={0.7}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="schedule" size={18} color="#fff" />
                    <Text style={styles.primaryActionButtonText}>
                      {selectedRequest?.type === "reschedule_request" 
                        ? 'Approve Reschedule' 
                        : 'Create Appointment'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Password Reset Modal */}            
      <Modal visible={showPasswordResetModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.passwordModalContainer}>

            {/* Header */}
            <View style={styles.passwordHeader}>
              <MaterialIcons name="lock-reset" size={28} color="#1f9c8b" />
              <Text style={styles.passwordTitle}>Reset Customer Password</Text>
              <Text style={styles.passwordSubtitle}>
                Set a new password for this customer account
              </Text>
            </View>

            {/* Form */}
            <View style={styles.passwordForm}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                placeholder="Enter new password"
                secureTextEntry
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                placeholder="Re-enter new password"
                secureTextEntry
                style={styles.passwordInput}
                value={verifyPassword}
                onChangeText={setVerifyPassword}
              />
            </View>

            {/* Actions */}
            <View style={styles.passwordActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowPasswordResetModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.primaryButton, 
                  (!newPassword || !verifyPassword) && styles.disabledButton
                ]}
                onPress={submitPasswordReset}
                disabled={!newPassword || !verifyPassword}
              >
                <Text style={styles.modalButtonText}>Update Password</Text> 
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  
  // HEADER - Now part of scrollable content
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    fontFamily: 'System',
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
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  headerContent: {
    marginTop: 10,
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
  logo: {
    width: 120,
    height: 50,
    marginRight: 10, 
  },
  contentContainer: {
    flex: 1,
  },
  
  // SECTIONS
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
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
  
  // EMPTY STATE
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2c3e50",
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'System',
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
    fontFamily: 'System',
  },
  
  // REQUESTS LIST
  requestsList: {
    marginBottom: 8,
  },
  
  // REQUEST CARD
  requestCard: {
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
  
  // CARD HEADER
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  customerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(31, 156, 139, 0.1)',
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    fontFamily: 'System',
  },
  requestDate: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
    fontFamily: 'System',
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rescheduleBadge: {
    backgroundColor: "#1f9c8b",
  },
  serviceBadge: {
    backgroundColor: "#1f9c8b",
  },
  passwordBadge: {
    backgroundColor: "#1f9c8b",
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
    fontFamily: 'System',
  },
  
  // CARD CONTENT
  cardContent: {
    marginBottom: 16,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  serviceType: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
    fontFamily: 'System',
  },
  pestName: {
    fontSize: 13,
    color: "#999",
    marginLeft: 4,
    fontFamily: 'System',
  },
  urgencyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
    fontFamily: 'System',
  },
  description: {
    fontSize: 13,
    color: "#888",
    lineHeight: 18,
    marginBottom: 12,
    fontFamily: 'System',
  },
  preferredTime: {
    flexDirection: "row",
    alignItems: "center",
  },
  preferredTimeText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 4,
    fontFamily: 'System',
  },
  
  // CARD ACTIONS
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f8f9fa",
    paddingTop: 16,
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailsButtonText: {
    fontSize: 14,
    color: "#1f9c8b",
    fontWeight: "500",
    marginLeft: 4,
    fontFamily: 'System',
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  
  // BUTTONS
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f9c8b",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: 'System',
  },
  declineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F44336",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  declineButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: 'System',
  },
  
  // FOOTER
  footer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    marginTop: 24,
    marginBottom: 20,
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
  
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "90%",
    maxHeight: "85%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3e50",
    fontFamily: 'System',
  },
  modalContent: {
    padding: 24,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
    fontFamily: 'System',
  },
  detailValue: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
    fontFamily: 'System',
  },
  detailSubValue: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
    fontFamily: 'System',
  },
  urgencyDisplay: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  urgencyDisplayText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: 'System',
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 12,
  },
  modalButton: {
    flex: 1, 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'System',
  },
  disabledButton: {
    backgroundColor: "#cccccc",
    opacity: 0.7,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'System',
    textAlign: "center",
  },
  loadingModalContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  
  // APPOINTMENT MODAL STYLES - UPDATED
  appointmentModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "95%", // Increased from 90%
    maxHeight: "90%", // Increased from 85%
    minHeight: 500, // Increased minimum height
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  appointmentModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  appointmentModalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  appointmentModalIcon: {
    marginRight: 12,
  },
  appointmentModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3e50",
    fontFamily: 'System',
    flex: 1,
  },
  appointmentCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  appointmentModalContent: {
    flex: 1,
    maxHeight: 700, // Limit height to ensure it's scrollable
  },
   appointmentModalScrollContent: {
    padding: 24, // Increased padding
    paddingBottom: 60, // More padding for scrolling
  },
  
  // Customer Info Header
  customerInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20, // Increased padding
    borderRadius: 16, // Increased border radius
    marginBottom: 24, // Increased margin
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  customerAvatar: {
    width: 60, // Increased size
    height: 60, // Increased size
    borderRadius: 30, // Match new size
    backgroundColor: "#1f9c8b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20, // Increased margin
  },
  customerAvatarText: {
    color: "#fff",
    fontSize: 24, // Increased font size
    fontWeight: "700",
    fontFamily: 'System',
  },
  customerInfoText: {
    flex: 1,
  },
  customerName: {
    fontSize: 20, // Increased font size
    fontWeight: "600",
    color: "#2c3e50",
    fontFamily: 'System',
    marginBottom: 6, // Increased margin
  },
  customerRequestType: {
    fontSize: 14, // Increased font size
    color: "#666",
    fontFamily: 'System',
  },
  // Form Section
  formGroup: {
    marginBottom: 24, // Increased margin
  },
  formLabel: {
    fontSize: 16, // Increased font size
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 10, // Increased margin
    fontFamily: 'System',
  },
   formTextArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    fontFamily: 'System',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  requiredStar: {
    color: "#F44336",
    fontSize: 18,
  },
  
  // Input Styles
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    paddingHorizontal: 18, // Increased padding
  },
  inputIcon: {
    marginRight: 12,
  },
  formInput: {
    flex: 1,
    paddingVertical: 16, // Increased padding
    fontSize: 18, // Increased font size
    color: "#333",
    fontFamily: 'System',
  },
  
  // Dropdown Styles
  formDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    paddingHorizontal: 18, // Increased padding
    paddingVertical: 16, // Increased padding
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dropdownText: {
    fontSize: 16, // Increased font size
    color: "#333",
    marginLeft: 12,
    fontFamily: 'System',
  },
  dropdownOptionsContainer: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 250, // Fixed height for dropdown
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownScrollView: {
    maxHeight: 250, 
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f9fa",
  },
  dropdownOptionSelected: {
    backgroundColor: "#f0f9f8",
  },
  dropdownOptionText: {
    fontSize: 16, // Increased font size
    color: "#333",
    fontFamily: 'System',
    flex: 1,
  },
  dropdownOptionTextSelected: {
    color: "#1f9c8b",
    fontWeight: "600",
  },
  
  // Current Service Display
  currentServiceDisplay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  currentServiceText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
    fontWeight: "500",
    fontFamily: 'System',
  },
  
  // Help Text
  helpText: {
    fontSize: 13,
    color: "#666",
    marginTop: 6,
    fontFamily: 'System',
    fontStyle: "italic",
  },
  
  // Technician Selection
  noTechniciansContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff8f8",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffcdd2",
  },
  noTechniciansText: {
    fontSize: 14,
    color: "#F44336",
    marginLeft: 12,
    fontFamily: 'System',
  },
  techniciansList: {
    flexDirection: "row",
  },
  techniciansListContent: {
    paddingVertical: 4,
  },
  technicianOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#f8f9fa",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e9ecef",
    minWidth: 120,
  },
  technicianOptionSelected: {
    backgroundColor: "#1f9c8b",
    borderColor: "#1f9c8b",
  },
  technicianOptionContent: {
    alignItems: "center",
  },
  technicianAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#1f9c8b",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  technicianAvatarSelected: {
    backgroundColor: "#1f9c8b",
    borderColor: "#fff",
  },
  technicianName: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    fontFamily: 'System',
    textAlign: "center",
  },
  technicianNameSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  
  // Date Time Selection
  dateTimeButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    overflow: "hidden",
  },
  dateTimeButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  dateTimeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dateTimeTextContainer: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    fontFamily: 'System',
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    fontFamily: 'System',
  },
  datePicker: {
    backgroundColor: "#fff",
    marginTop: 10,
  },
  
  // Preferences Card
  preferencesCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  preferencesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  preferencesTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2c3e50",
    marginLeft: 8,
    fontFamily: 'System',
  },
  preferencesContent: {
    paddingLeft: 4,
  },
  preferenceItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  preferenceText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    fontFamily: 'System',
  },
  
  // Notes Card
  notesCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  notesTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
    marginLeft: 8,
    fontFamily: 'System',
  },
  notesText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    fontFamily: 'System',
  },
  
  // Appointment Modal Footer
  appointmentModalFooter: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 12,
    backgroundColor: "#fff",
  },
  modalActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelActionButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  cancelActionButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'System',
  },
  primaryActionButton: {
    backgroundColor: "#1f9c8b",
  },
  primaryActionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'System',
  },
  disabledActionButton: {
    backgroundColor: "#cccccc",
    opacity: 0.7,
  },
  
  // Password Reset Modal
  passwordModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    width: "90%",
    maxWidth: 400,
  },
  passwordHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  passwordTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
    color: "#2c3e50",
    fontFamily: 'System',
  },
  passwordSubtitle: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 6,
    textAlign: "center",
    fontFamily: 'System',
  },
  passwordForm: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#34495e",
    marginBottom: 6,
    marginTop: 12,
    fontFamily: 'System',
  },
  passwordInput: {
    backgroundColor: "#f4f6f8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    fontFamily: 'System',
  },
  passwordActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  serviceOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceOptionIcon: {
    marginRight: 12,
  },

  specialServiceNoteText: {
    fontSize: 12,
    color: '#1f9c8b',
    marginLeft: 6,
    fontStyle: 'italic',
  },

  currentServiceDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 8,
  },

  specialServiceDetails: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },

  specialServiceDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  specialServiceDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginLeft: 8,
    marginRight: 4,
    width: 120, 
  },

  specialServiceDetailValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
    flex: 1,
  },

  specialServiceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  borderedInputContainer: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 0, // Let the input handle its own padding
    overflow: "hidden",
  },
});