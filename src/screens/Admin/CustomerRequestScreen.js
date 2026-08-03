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
import ImageViewing from "react-native-image-viewing";
import i18n from "../../services/i18n";

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
  const [appointmentVatPercent, setAppointmentVatPercent] =
  useState("24");
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
  const IMAGE_BASE =
  "https://field-inspections-backend-production.up.railway.app/uploads/";
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [appointmentPrice, setAppointmentPrice] = useState("");
  const [appointmentCategory, setAppointmentCategory] = useState("first_time");
  const [complianceValidUntil, setComplianceValidUntil] = useState("");
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const APPOINTMENT_CATEGORIES = [
    { id: "first_time", label: i18n.t("admin.schedule.appointmentCategory.first_time") },
    { id: "follow_up", label: i18n.t("admin.schedule.appointmentCategory.follow_up") },
    { id: "one_time", label: i18n.t("admin.schedule.appointmentCategory.one_time") },
    { id: "installation", label: i18n.t("admin.schedule.appointmentCategory.installation") },
    { id: "inspection", label: i18n.t("admin.schedule.appointmentCategory.inspection") },
    { id: "emergency", label: i18n.t("admin.schedule.appointmentCategory.emergency") },
    { id: "contract_service", label: i18n.t("admin.schedule.appointmentCategory.contract_service") },
  ];
  const WEEKDAY_KEYS = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat"
];

const MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec"
];

  function parseDecimalInput(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const normalized = String(value).replace(",", ".");
  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

function roundMoney(value) {
  return Math.round(
    (Number(value) + Number.EPSILON) * 100
  ) / 100;
}

function buildVatPricePayload(netValue, vatValue) {
  const netPrice = roundMoney(
    parseDecimalInput(netValue) || 0
  );

  const vatPercent = roundMoney(
    parseDecimalInput(vatValue) || 0
  );

  const vatAmount = roundMoney(
    netPrice * (vatPercent / 100)
  );

  const grossPrice = roundMoney(netPrice + vatAmount);

  return {
    serviceNetPrice: netPrice,
    serviceVatPercent: vatPercent,
    serviceVatAmount: vatAmount,
    servicePrice: grossPrice,
  };
}

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
      // Load ALL pending requests
      const requestsResult = await apiService.getCustomerRequests("pending");
      
      let formattedRequests = [];
      
      if (requestsResult?.success && Array.isArray(requestsResult.requests)) {
        // Try different field names
        formattedRequests = requestsResult.requests.map((request, index) => {
          
          return {
            id: request.id || request.requestId || `request-${index}`,
            customer_id: request.customerId || request.customer_id || 'unknown',
            customer_name: request.customerName || request.customer_name || i18n.t("admin.customerRequests.requestList.unknownCustomer") || 'Unknown Customer',
            customer_email: request.customerEmail || request.customer_email || '',
            service_type: request.serviceType || request.service_type || 'unknown',
            special_service_subtype: request.specialServiceSubtype || request.special_service_subtype || null,
            other_pest_name: request.otherPestName || request.other_pest_name || null,
            urgency: request.urgency || 'normal',
            description: request.description || i18n.t("admin.customerRequests.requestList.noDescription") || 'No description',
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
            original_time: extractOriginalTime(request.description || ''),
            images: request.images || [],
          };
        });
        
      } else {
        console.warn("⚠️ No valid requests array found in response");
      }
      
      // Force a state update
      setRequests(prev => {
        return formattedRequests;
      });
      
      // Load technicians
      const techsResult = await apiService.getTechnicians();
      
      if (Array.isArray(techsResult)) {
        setTechnicians(techsResult);
      } else if (techsResult?.technicians) {
        setTechnicians(techsResult.technicians);
      } else {
        console.warn("⚠️ Unexpected technicians response format:", techsResult);
        setTechnicians([]);
      }
      
    } catch (error) {
      console.error("❌ Failed to load data:", error);
      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.loading") + " " + i18n.t("common.retry") || "Failed to load customer requests. Please try again.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const openImageViewer = (images, index) => {
    if (!images || !Array.isArray(images) || images.length === 0) return;

    const formatted = images.map(img => ({
      uri: IMAGE_BASE + img
    }));

    setViewerImages(formatted);
    setViewerIndex(index);
    setIsImageViewerVisible(true);
  };

  const extractOriginalDate = (description) => {
    if (!description) return null;

    const match = description.match(/Original appointment: (.+?) at/);
    if (!match) return null;

    try {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    } catch {}

    return null;
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
      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.passwordModal.passwordMismatch") || "Passwords do not match");
      return;
    }

    const res = await apiService.resetCustomerPassword(
      selectedRequest.id,
      newPassword
    );

    if (res.success) {
      Alert.alert(i18n.t("common.success"), i18n.t("admin.customerRequests.passwordModal.updateSuccess") || "Password updated");
      setShowPasswordResetModal(false);
      loadData();
    } else {
      Alert.alert(i18n.t("common.error"), res.error || i18n.t("admin.customerRequests.passwordModal.updateFailed") || "Failed to update password");
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
    setAppointmentPrice("");
    setAppointmentVatPercent("24");
    setShowAppointmentModal(true);
  };

  const handleDecline = async (request) => {
    Alert.alert(
      i18n.t("admin.customerRequests.declineRequest") || "Decline Request",
      i18n.t("admin.customerRequests.declineConfirm", { name: request.customer_name }) || `Decline request from ${request.customer_name}?`,
      [
        { text: i18n.t("common.cancel"), style: "cancel" },
        {
          text: i18n.t("admin.customerRequests.declineButton") || "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessing(true);

              if (request.type === 'password_recovery') {
                await processPasswordRecoveryRequest(request);
              } else if (request.type === 'reschedule_request') {
                // Try BOTH methods to see which one works
                if (request.original_appointment_id) {
                  
                  // Method 1: Try the full name
                  if (apiService.updateAppointmentRescheduleStatus) {
                    const result = await apiService.updateAppointmentRescheduleStatus(
                      request.original_appointment_id,
                      {
                        action: "decline",
                        adminNotes: i18n.t("admin.customerRequests.declineNotes") || "Reschedule request declined"
                      }
                    );
                  } 
                  // Method 2: Try the short name
                  else if (apiService.updateRescheduleStatus) {
                    const result = await apiService.updateRescheduleStatus(
                      request.original_appointment_id,
                      {
                        action: "decline",
                        adminNotes: i18n.t("admin.customerRequests.declineNotes") || "Reschedule request declined"
                      }
                    );             
                  }
                  // Method 3: Fallback
                  else {
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
                  i18n.t("admin.customerRequests.declineNotes") || "Service request declined"
                );
              }

              loadData();
            } catch (err) {
              console.error("❌ Decline failed:", err);
              Alert.alert(i18n.t("common.error"), err.message);
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const serviceTypes = [
    { id: "myocide", label: i18n.t("admin.schedule.serviceType.myocide.label"), description: i18n.t("admin.schedule.serviceType.myocide.description"), icon: "pest-control-rodent", color: "#1f9c8b" },
    { id: "disinfection", label: i18n.t("admin.schedule.serviceType.disinfection.label"), description: i18n.t("admin.schedule.serviceType.disinfection.description"), icon: "clean-hands", color: "#1f9c8b" },
    { id: "insecticide", label: i18n.t("admin.schedule.serviceType.insecticide.label"), description: i18n.t("admin.schedule.serviceType.insecticide.description"), icon: "pest-control", color: "#1f9c8b" },
    { id: "special", label: i18n.t("admin.schedule.serviceType.special.label"), description: i18n.t("admin.schedule.serviceType.special.description"), icon: "star", color: "#1f9c8b" },
  ];

  const specialServiceSubtypes = [
    { id: "grass_cutworm", label: i18n.t("admin.schedule.specialSubtypes.grass_cutworm"), icon: "seedling", library: "FontAwesome5" },
    { id: "fumigation", label: i18n.t("admin.schedule.specialSubtypes.fumigation"), icon: "cloud", library: "Feather" },
    { id: "termites", label: i18n.t("admin.schedule.specialSubtypes.termites"), icon: "bug", library: "FontAwesome5" },
    { id: "exclusion", label: i18n.t("admin.schedule.specialSubtypes.exclusion"), icon: "block", library: "Entypo" },
    { id: "snake_repulsion", label: i18n.t("admin.schedule.specialSubtypes.snake_repulsion"), icon: "snake", library: "MaterialCommunityIcons" },
    { id: "bird_control", label: i18n.t("admin.schedule.specialSubtypes.bird_control"), icon: "feather", library: "Feather" },
    { id: "bed_bugs", label: i18n.t("admin.schedule.specialSubtypes.bed_bugs"), icon: "bug-report", library: "MaterialIcons" },
    { id: "fleas", label: i18n.t("admin.schedule.specialSubtypes.fleas"), icon: "paw", library: "FontAwesome5" },
    { id: "plant_protection", label: i18n.t("admin.schedule.specialSubtypes.plant_protection"), icon: "grass", library: "MaterialIcons" },
    { id: "palm_weevil", label: i18n.t("admin.schedule.specialSubtypes.palm_weevil"), icon: "tree", library: "FontAwesome5" },
    { id: "other", label: i18n.t("admin.schedule.specialSubtypes.other"), icon: "more-horizontal", library: "Feather" },
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
          ? i18n.t("admin.customerRequests.acceptNotes") || 'Service request accepted'
          : i18n.t("admin.customerRequests.declineNotes") || 'Service request declined'
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update request');
      }

      setRequests(prev => prev.filter(r => r.id !== request.id));
      loadData();

      Alert.alert(
        i18n.t("common.success"),
        status === 'accepted'
          ? i18n.t("admin.customerRequests.acceptSuccess") || 'Service request accepted'
          : i18n.t("admin.customerRequests.declineSuccess") || 'Service request declined'
      );

    } catch (err) {
      console.error("❌ Service request error:", err);
      Alert.alert(i18n.t("common.error"), err.message);
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
        i18n.t("admin.customerRequests.passwordModal.declineNotes") || 'Password recovery request declined'
      );

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to decline password request');
      }

      setRequests(prev => prev.filter(r => r.id !== request.id));
      loadData();
    } catch (err) {
      Alert.alert(i18n.t("common.error"), err.message);
    } finally {
      setProcessing(false);
    }
  };

  const createAppointmentFromRequest = async () => {
    // Validation checks
    if (!appointmentData.technicianId || !appointmentData.date || !appointmentData.time) {
      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.appointmentModal.fillAllFields") || "Please fill all appointment fields");
      return;
    }

    if (!appointmentPrice || appointmentPrice === "") {
      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.appointmentModal.priceRequired") || "Service price is required");
      return;
    }

    const normalizedPrice = appointmentPrice
  .replace(",", ".")
  .trim();

if (
  !normalizedPrice ||
  normalizedPrice === "." ||
  normalizedPrice.endsWith(".")
) {
  Alert.alert(
    i18n.t("admin.schedule.servicePrice.title") ||
      "Invalid Price",
    i18n.t("admin.schedule.servicePrice.invalidFormat") ||
      "Enter a valid price (e.g. 40,05)"
  );
  return;
}

const parsedPrice = parseFloat(normalizedPrice);

if (isNaN(parsedPrice) || parsedPrice <= 0) {
  Alert.alert(
    i18n.t("admin.schedule.servicePrice.title") ||
      "Invalid Price",
    i18n.t("admin.schedule.servicePrice.invalid") ||
      "Price must be greater than 0"
  );
  return;
}

const normalizedVatPercent = appointmentVatPercent
  .replace(",", ".")
  .trim();

if (
  !normalizedVatPercent ||
  normalizedVatPercent === "." ||
  normalizedVatPercent.endsWith(".")
) {
  Alert.alert(
    i18n.t("admin.schedule.serviceVat.title") ||
      "Invalid VAT",
    i18n.t("admin.schedule.serviceVat.invalidFormat") ||
      "Enter a valid VAT percentage (e.g. 24 or 13,5)"
  );
  return;
}

const parsedVatPercent = parseFloat(normalizedVatPercent);

if (isNaN(parsedVatPercent) || parsedVatPercent < 0) {
  Alert.alert(
    i18n.t("admin.schedule.serviceVat.title") ||
      "Invalid VAT",
    i18n.t("admin.schedule.serviceVat.invalid") ||
      "VAT must be 0 or greater"
  );
  return;
}

const appointmentPricePayload = buildVatPricePayload(
  normalizedPrice,
  normalizedVatPercent
);

    if (!appointmentCategory) {
      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.appointmentModal.categoryRequired") || "Appointment category is required");
      return;
    }

    // For reschedule requests, use the original service type from the request
    const finalServiceType = selectedRequest.type === 'reschedule_request' 
      ? selectedRequest.service_type 
      : serviceType;

    // Validate compliance for Myocide
    if (finalServiceType === 'myocide' && !complianceValidUntil) {
      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.appointmentModal.complianceRequired") || "Compliance Valid Until is required for Myocide services");
      return;
    }

    // For NEW service requests with special type, still validate
    if (selectedRequest.type !== 'reschedule_request' && finalServiceType === 'special' && !specialServiceSubtype) {
      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.appointmentModal.specialRequired") || "Please select a specific service type for Special Service");
      return;
    }

    if (selectedRequest.type !== 'reschedule_request' && finalServiceType === 'special' && specialServiceSubtype === 'other' && !otherPestName.trim()) {
      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.appointmentModal.otherPestRequired") || "Please type the name of the pest for 'Other' service");
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
        ...appointmentPricePayload,
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
        } else if (finalServiceType === 'myocide') {
          payload.otherPestName = i18n.t("admin.schedule.serviceType.myocide.label") || 'Myocide Service';
        }
        // 🚨 CRITICAL FIX: For insecticide and disinfection, use admin's typed details
        else if (finalServiceType === 'insecticide') {
          // Use the admin's typed insecticideDetails instead of customer's description
          payload.otherPestName = insecticideDetails.trim() || selectedRequest.description || i18n.t("admin.schedule.treatmentDetails.insecticideDefault") || 'Insecticide Treatment';
          payload.insecticideDetails = insecticideDetails.trim() || selectedRequest.description || i18n.t("admin.schedule.treatmentDetails.insecticideDefault") || 'Insecticide Treatment';
        } else if (finalServiceType === 'disinfection') {
          // Use the admin's typed disinfectionDetails instead of customer's description
          payload.otherPestName = disinfectionDetails.trim() || selectedRequest.description || i18n.t("admin.schedule.treatmentDetails.disinfectionDefault") || 'Disinfection Service';
          payload.disinfection_details = disinfectionDetails.trim() || selectedRequest.description || i18n.t("admin.schedule.treatmentDetails.disinfectionDefault") || 'Disinfection Service';
        }
      }

      const appointmentResult = await apiService.createAppointment(payload);

      if (appointmentResult.success) {
        const appointmentId = appointmentResult.data?.id || appointmentResult.id;
        
        // Update the customer request status
        await apiService.updateCustomerRequestStatus(
          selectedRequest.id,
          'accepted',
          appointmentId,
          selectedRequest.type === 'reschedule_request'
            ? i18n.t("admin.customerRequests.appointmentModal.rescheduleApproved") || 'Reschedule request approved'
            : i18n.t("admin.customerRequests.appointmentModal.requestAccepted") || 'Request accepted and appointment scheduled'
        );
        
        // Remove from list
        setRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
        
        Alert.alert(i18n.t("common.success"), 
          selectedRequest.type === 'reschedule_request'
            ? i18n.t("admin.customerRequests.appointmentModal.rescheduleSuccess") || "Reschedule approved successfully!"
            : i18n.t("admin.customerRequests.appointmentModal.createSuccess") || "Appointment created successfully!",
          [
            { text: "OK", onPress: () => {
              setShowAppointmentModal(false);
              setAppointmentPrice("");
              setAppointmentVatPercent("24");
              loadData(); // Refresh the list
            }}
          ]
        );
      } else {
        throw new Error(appointmentResult.error || i18n.t("admin.customerRequests.appointmentModal.createFailed") || "Failed to create appointment");
      }
    } catch (error) {
      console.error("❌ Error creating appointment:", error);
      Alert.alert(i18n.t("common.error"), error.message || i18n.t("admin.customerRequests.appointmentModal.createFailed") || "Failed to create appointment");
    } finally {
      setProcessing(false);
    }
  };

  const getSpecialServiceLabel = (subtype) => {
    const subtypeLabels = {
      'grass_cutworm': i18n.t("admin.schedule.specialSubtypes.grass_cutworm"),
      'fumigation': i18n.t("admin.schedule.specialSubtypes.fumigation"),
      'termites': i18n.t("admin.schedule.specialSubtypes.termites"),
      'exclusion': i18n.t("admin.schedule.specialSubtypes.exclusion"),
      'snake_repulsion': i18n.t("admin.schedule.specialSubtypes.snake_repulsion"),
      'bird_control': i18n.t("admin.schedule.specialSubtypes.bird_control"),
      'bed_bugs': i18n.t("admin.schedule.specialSubtypes.bed_bugs"),
      'fleas': i18n.t("admin.schedule.specialSubtypes.fleas"),
      'plant_protection': i18n.t("admin.schedule.specialSubtypes.plant_protection"),
      'palm_weevil': i18n.t("admin.schedule.specialSubtypes.palm_weevil"),
      'other': i18n.t("admin.schedule.specialSubtypes.other")
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
      
      setAppointmentData(prev => ({ 
        ...prev, 
        time: formattedTime 
      }));
    }
  };

  const approveReschedule = async () => {
    if (!appointmentData.date || !appointmentData.time) {
      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.appointmentModal.selectDateTime") || "Please select date and time");
      return;
    }

    if (!appointmentData.technicianId) {
      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.appointmentModal.selectTechnician") || "Please select a technician");
      return;
    }

    if (!appointmentPrice || appointmentPrice === "") {
      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.appointmentModal.priceRequired") || "Service price is required");
      return;
    }

    const normalizedPrice = appointmentPrice
  .replace(",", ".")
  .trim();

if (
  !normalizedPrice ||
  normalizedPrice === "." ||
  normalizedPrice.endsWith(".")
) {
  Alert.alert(
    i18n.t("admin.schedule.servicePrice.title") ||
      "Invalid Price",
    i18n.t("admin.schedule.servicePrice.invalidFormat") ||
      "Enter a valid price (e.g. 40,05)"
  );
  return;
}

const parsedPrice = parseFloat(normalizedPrice);

if (isNaN(parsedPrice) || parsedPrice <= 0) {
  Alert.alert(
    i18n.t("admin.schedule.servicePrice.title") ||
      "Invalid Price",
    i18n.t("admin.schedule.servicePrice.invalid") ||
      "Price must be greater than 0"
  );
  return;
}

const normalizedVatPercent = appointmentVatPercent
  .replace(",", ".")
  .trim();

if (
  !normalizedVatPercent ||
  normalizedVatPercent === "." ||
  normalizedVatPercent.endsWith(".")
) {
  Alert.alert(
    i18n.t("admin.schedule.serviceVat.title") ||
      "Invalid VAT",
    i18n.t("admin.schedule.serviceVat.invalidFormat") ||
      "Enter a valid VAT percentage (e.g. 24 or 13,5)"
  );
  return;
}

const parsedVatPercent = parseFloat(normalizedVatPercent);

if (isNaN(parsedVatPercent) || parsedVatPercent < 0) {
  Alert.alert(
    i18n.t("admin.schedule.serviceVat.title") ||
      "Invalid VAT",
    i18n.t("admin.schedule.serviceVat.invalid") ||
      "VAT must be 0 or greater"
  );
  return;
}

const appointmentPricePayload = buildVatPricePayload(
  normalizedPrice,
  normalizedVatPercent
);

    if (!appointmentCategory) {
      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.appointmentModal.categoryRequired") || "Appointment category is required");
      return;
    }

    // Only validate compliance for Myocide services
    if (selectedRequest?.service_type === 'myocide' && !complianceValidUntil) {
      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.appointmentModal.complianceRequired") || "Compliance Valid Until is required for Myocide services");
      return;
    }

    try {
      setProcessing(true);

      // ✅ Create the payload with ALL fields including technicianId
      const payload = {
        action: "approve",
        requestedDate: appointmentData.date,
        requestedTime: appointmentData.time,
        ...appointmentPricePayload,
        complianceValidUntil: complianceValidUntil || null,
        technicianId: appointmentData.technicianId, // Include technicianId
        appointmentCategory: appointmentCategory,
        adminNotes: i18n.t("admin.customerRequests.appointmentModal.rescheduleApproved") || "Reschedule approved"
      };

      const rescheduleResult = await apiService.updateRescheduleStatus(
        selectedRequest.original_appointment_id,
        payload
      );

      if (rescheduleResult.success) {
        // Update the customer request status
        await apiService.updateCustomerRequestStatus(
          selectedRequest.id,
          "accepted",
          rescheduleResult.appointment?.id || null,
          i18n.t("admin.customerRequests.appointmentModal.rescheduleApprovedNotes") || "Reschedule approved - old appointment deleted"
        );

        Alert.alert(i18n.t("common.success"), i18n.t("admin.customerRequests.appointmentModal.rescheduleSuccessDetailed") || "Reschedule approved. Old appointment deleted, new appointment created.", [
          {
            text: "OK",
            onPress: () => {
              setShowAppointmentModal(false);
              setAppointmentPrice("");
              setAppointmentVatPercent("24");
              loadData(); // Refresh the list
            }
          }
        ]);
      } else {
        throw new Error(rescheduleResult.error || i18n.t("admin.customerRequests.appointmentModal.rescheduleFailed") || "Failed to approve reschedule");
      }

    } catch (err) {
      console.error("❌ Reschedule approval failed:", err);
      Alert.alert(i18n.t("common.error"), err.message || i18n.t("admin.customerRequests.appointmentModal.rescheduleFailed") || "Failed to approve reschedule");
    } finally {
      setProcessing(false);
    }
  };

  const getServiceTypeLabel = (serviceType, subtype, otherPest = null) => {
    if (!serviceType) return i18n.t("serviceTypes.unknown") || 'Unknown Service';
    
    const labels = {
  'myocide': i18n.t("serviceTypes.myocide"),
  'disinfection': i18n.t("serviceTypes.disinfection"),
  'insecticide': i18n.t("serviceTypes.insecticide"),
  'special': i18n.t("serviceTypes.special"),
  'certificate': i18n.t("serviceTypes.certificate"),
};
    
    let label = labels[serviceType] || serviceType;
    
    if (serviceType === 'special' && subtype) {
      const subtypeLabels = {
        'grass_cutworm': i18n.t("admin.schedule.specialSubtypes.grass_cutworm"),
        'fumigation': i18n.t("admin.schedule.specialSubtypes.fumigation"),
        'termites': i18n.t("admin.schedule.specialSubtypes.termites"),
        'exclusion': i18n.t("admin.schedule.specialSubtypes.exclusion"),
        'snake_repulsion': i18n.t("admin.schedule.specialSubtypes.snake_repulsion"),
        'bird_control': i18n.t("admin.schedule.specialSubtypes.bird_control"),
        'bed_bugs': i18n.t("admin.schedule.specialSubtypes.bed_bugs"),
        'fleas': i18n.t("admin.schedule.specialSubtypes.fleas"),
        'plant_protection': i18n.t("admin.schedule.specialSubtypes.plant_protection"),
        'palm_weevil': i18n.t("admin.schedule.specialSubtypes.palm_weevil"),
        'other': i18n.t("admin.schedule.specialSubtypes.other")
      };
      
      const subtypeLabel = subtypeLabels[subtype] || subtype;
      
      if (subtype === 'other' && otherPest) {
        label = `${i18n.t("serviceTypes.special")} - ${i18n.t("admin.schedule.specialSubtypes.other")} (${otherPest})`;
      } else if (subtype !== 'other') {
        label = `${i18n.t("serviceTypes.special")} - ${subtypeLabel}`;
      } else {
        label = `${i18n.t("serviceTypes.special")} - ${subtypeLabel}`;
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

  const getUrgencyLabel = (urgency) => {
    switch(urgency) {
      case 'emergency': return i18n.t("urgency.emergency");
      case 'high': return i18n.t("urgency.high");
      case 'normal': return i18n.t("urgency.normal");
      case 'low': return i18n.t("urgency.low");
      default: return i18n.t("urgency.normal");
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

  const formatDate = (dateValue, includeWeekday = true) => {
  if (!dateValue) {
    return i18n.t(
      "admin.customerRequests.detailsModal.notSpecified"
    );
  }

  try {
    let date;

    if (dateValue instanceof Date) {
      date = new Date(dateValue);
    } else {
      const dateString = String(dateValue);

      // Prevent timezone shifting for YYYY-MM-DD values
      date = /^\d{4}-\d{2}-\d{2}$/.test(dateString)
        ? new Date(`${dateString}T00:00:00`)
        : new Date(dateString);
    }

    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    const weekday = i18n.t(
      `weekdays.short.${WEEKDAY_KEYS[date.getDay()]}`
    );

    const month = i18n.t(
      `months.${MONTH_KEYS[date.getMonth()]}`
    );

    const formattedDate =
      `${date.getDate()} ${month} ${date.getFullYear()}`;

    return includeWeekday
      ? `${weekday}, ${formattedDate}`
      : formattedDate;
  } catch {
    return String(dateValue);
  }
};

  const formatDateTime = (dateString, timeString) => {
    const hasDate = !!dateString;
    const hasTime = !!timeString;

    if (!hasDate && !hasTime) return i18n.t("admin.customerRequests.detailsModal.notSpecified") || "Not specified";

    const datePart = hasDate ? formatDate(dateString) : i18n.t("admin.customerRequests.dateNotSpecified") || "Date not specified";
    const timePart = hasTime ? formatTime(timeString) : null;

    return timePart ? `${datePart} ${i18n.t("admin.customerRequests.at") || "at"} ${timePart}` : datePart;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f9c8b" />
        <Text style={styles.loadingText}>{i18n.t("admin.customerRequests.loading")}</Text>
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
                <Text style={styles.adminBadgeText}>{i18n.t("admin.customerRequests.header.badge")}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>{i18n.t("admin.customerRequests.header.welcome")}</Text>
            <Text style={styles.title}>{i18n.t("admin.customerRequests.header.title")}</Text>
            <Text style={styles.subtitle}>
              {i18n.t("admin.customerRequests.header.subtitle")}
            </Text>
          </View>
        </View>

        {/* MAIN CONTENT */}
        <View style={styles.contentContainer}>
          {/* QUICK STATS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="dashboard" size={20} color="#2c3e50" />
              <Text style={styles.sectionTitle}>{i18n.t("admin.customerRequests.overview.title")}</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <MaterialIcons name="pending-actions" size={20} color="#1f9c8b" />
                </View>
                <Text style={styles.statNumber}>{requests.length}</Text>
                <Text style={styles.statLabel}>{i18n.t("admin.customerRequests.overview.pendingRequests")}</Text>
                <Text style={[styles.statTrend, requests.length > 0 && { color: '#1f9c8b' }]}>
                  {requests.length > 0 ? i18n.t("admin.customerRequests.overview.actionRequired") : i18n.t("admin.customerRequests.overview.allClear")}
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
                <Text style={styles.statLabel}>{i18n.t("admin.customerRequests.overview.todayRequests")}</Text>
                <Text style={styles.statTrend}>{i18n.t("admin.customerRequests.overview.new")}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <MaterialIcons name="edit-calendar" size={20} color="#1f9c8b" />
                </View>
                <Text style={styles.statNumber}>
                  {requests.filter(r => r.type === 'reschedule_request').length}
                </Text>
                <Text style={styles.statLabel}>{i18n.t("admin.customerRequests.overview.rescheduleRequests")}</Text>
                <Text style={styles.statTrend}>{i18n.t("admin.customerRequests.overview.priority")}</Text>
              </View>
            </View>
          </View>

          {/* REQUESTS LIST */}
          <View style={styles.section}>
            {requests.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="check-circle" size={64} color="#1f9c8b" />
                <Text style={styles.emptyTitle}>{i18n.t("admin.customerRequests.emptyState.title")}</Text>
                <Text style={styles.emptyText}>
                  {i18n.t("admin.customerRequests.emptyState.text")}
                </Text>
                <TouchableOpacity onPress={loadData} style={styles.primaryButton}>
                  <MaterialIcons name="refresh" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>{i18n.t("admin.customerRequests.emptyState.refresh")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="list-alt" size={20} color="#2c3e50" />
                  <Text style={styles.sectionTitle}>
                    {requests.length === 1
                      ? i18n.t("admin.customerRequests.requestList.title_one", { count: requests.length })
                      : i18n.t("admin.customerRequests.requestList.title_other", { count: requests.length })}
                  </Text>
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
                              {request.created_at
  ? formatDate(request.created_at, false)
  : i18n.t("admin.customerRequests.requestList.unknownDate")}
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
                              ? i18n.t("admin.customerRequests.requestList.passwordBadge")
                              : request.type === 'reschedule_request'
                                ? i18n.t("admin.customerRequests.requestList.rescheduleBadge")
                                : i18n.t("admin.customerRequests.requestList.serviceBadge")}
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
                            {i18n.t("admin.customerRequests.requestList.priority", { priority: getUrgencyLabel(request.urgency) })}
                          </Text>
                        </View>

                        <Text style={styles.description} numberOfLines={2}>
                          {request.description || i18n.t("admin.customerRequests.requestList.noDescription")}
                        </Text>

                        {request.images && request.images.length > 0 && (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginTop: 10 }}
                          >
                            {request.images.map((img, index) => (
                              <TouchableOpacity
                                key={index}
                                onPress={() => openImageViewer(request.images, index)}
                                activeOpacity={0.8}
                              >
                                <Image
                                  source={{ uri: IMAGE_BASE + img }}
                                  style={{
                                    width: 70,
                                    height: 70,
                                    borderRadius: 8,
                                    marginRight: 8,
                                    borderWidth: 1,
                                    borderColor: '#e9ecef'
                                  }}
                                  resizeMode="cover"
                                />
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        )}

                        {(request.preferred_date || request.preferred_time) && (
                          <View style={styles.preferredTime}>
                            <MaterialIcons name="schedule" size={14} color="#666" />
                            <Text style={styles.preferredTimeText}>
                              {i18n.t("admin.customerRequests.requestList.preferred", { datetime: formatDateTime(request.preferred_date, request.preferred_time) })}
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
                          <Text style={styles.detailsButtonText}>{i18n.t("admin.customerRequests.requestList.viewDetails")}</Text>
                        </TouchableOpacity>
                        
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={styles.declineButton}
                            onPress={() => handleDecline(request)}
                            disabled={processing}
                          >
                            <MaterialIcons name="close" size={16} color="#fff" />
                            <Text style={styles.declineButtonText}>{i18n.t("admin.customerRequests.requestList.decline")}</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => handleAccept(request)}
                            disabled={processing}
                          >
                            <MaterialIcons name="check" size={16} color="#fff" />
                            <Text style={styles.primaryButtonText}>{i18n.t("admin.customerRequests.requestList.accept")}</Text>
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
            <Text style={styles.footerText}>{i18n.t("admin.customerRequests.footer.system")}</Text>
            <Text style={styles.footerSubtext}>
              {i18n.t("admin.customerRequests.footer.version", {
  date: formatDate(new Date(), false)
})}
            </Text>
            <Text style={styles.footerCopyright}>
              {i18n.t("admin.customerRequests.footer.copyright", { year: new Date().getFullYear() })}
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
                  <Text style={styles.modalTitle}>{i18n.t("admin.customerRequests.detailsModal.title")}</Text>
                  <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                    <MaterialIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalContent}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>{i18n.t("admin.customerRequests.detailsModal.customer")}</Text>
                    <Text style={styles.detailValue}>{selectedRequest.customer_name}</Text>
                    {selectedRequest.customer_email && (
                      <Text style={styles.detailSubValue}>{selectedRequest.customer_email}</Text>
                    )}
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>{i18n.t("admin.customerRequests.detailsModal.serviceType")}</Text>
                    <Text style={styles.detailValue}>
                      {getServiceTypeLabel(selectedRequest.service_type, selectedRequest.special_service_subtype)}
                    </Text>
                    {selectedRequest.other_pest_name && (
                      <Text style={styles.detailSubValue}>
                        {i18n.t("admin.customerRequests.detailsModal.pest", { name: selectedRequest.other_pest_name })}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>{i18n.t("admin.customerRequests.detailsModal.urgency")}</Text>
                    <View style={[styles.urgencyDisplay, { backgroundColor: getUrgencyColor(selectedRequest.urgency) + '20' }]}>
                      <Text style={[styles.urgencyDisplayText, { color: getUrgencyColor(selectedRequest.urgency) }]}>
                        {getUrgencyLabel(selectedRequest.urgency)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>{i18n.t("admin.customerRequests.detailsModal.description")}</Text>
                    <Text style={styles.detailValue}>{selectedRequest.description}</Text>
                  </View>

                  {selectedRequest.images && selectedRequest.images.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>{i18n.t("admin.customerRequests.detailsModal.attachedImages")}</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginTop: 8 }}
                      >
                        {selectedRequest?.images?.map((img, index) => {
                          const imagesArray = selectedRequest.images; // capture stable reference

                          return (
                            <TouchableOpacity
                              key={index}
                              onPress={() => openImageViewer(imagesArray, index)}
                              activeOpacity={0.8}
                            >
                              <Image
                                source={{ uri: IMAGE_BASE + img }}
                                style={{
                                  width: 70,
                                  height: 70,
                                  borderRadius: 8,
                                  marginRight: 8,
                                  borderWidth: 1,
                                  borderColor: '#e9ecef'
                                }}
                                resizeMode="cover"
                              />
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                  
                  {selectedRequest.type === 'reschedule_request' && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>{i18n.t("admin.customerRequests.detailsModal.rescheduleDetails")}</Text>
                      <Text style={styles.detailValue}>
                        {i18n.t("admin.customerRequests.detailsModal.original", { datetime: formatDateTime(selectedRequest.original_date, selectedRequest.original_time) })}
                      </Text>
                      <Text style={styles.detailValue}>
                        {i18n.t("admin.customerRequests.detailsModal.requested", { datetime: formatDateTime(selectedRequest.preferred_date, selectedRequest.preferred_time) })}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>{i18n.t("admin.customerRequests.detailsModal.preferredDateTime")}</Text>
                    <Text style={styles.detailValue}>
                      {selectedRequest.preferred_date 
                        ? formatDateTime(selectedRequest.preferred_date, selectedRequest.preferred_time)
                        : i18n.t("admin.customerRequests.detailsModal.notSpecified")}
                    </Text>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>{i18n.t("admin.customerRequests.detailsModal.submitted")}</Text>
                    <Text style={styles.detailValue}>
                      {selectedRequest.created_at
  ? `${formatDate(selectedRequest.created_at)} ${i18n.t(
      "admin.customerRequests.at"
    )} ${formatTime(selectedRequest.created_at)}`
  : i18n.t("admin.customerRequests.requestList.unknownDate")}
                    </Text>
                  </View>
                  
                  {selectedRequest.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>{i18n.t("admin.customerRequests.detailsModal.additionalNotes")}</Text>
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
                        <Text style={styles.modalButtonText}>{i18n.t("admin.customerRequests.detailsModal.declineRequest")}</Text>
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
                            ? i18n.t("admin.customerRequests.passwordModal.resetPassword") || 'Reset Password'
                            : selectedRequest.type === 'reschedule_request'
                              ? i18n.t("admin.customerRequests.detailsModal.acceptReschedule") || 'Accept Reschedule'
                              : i18n.t("admin.customerRequests.detailsModal.acceptAndSchedule") || 'Accept & Schedule'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.loadingModalContent}>
                <ActivityIndicator size="large" color="#1f9c8b" />
                <Text style={styles.loadingText}>{i18n.t("admin.customerRequests.loading")}</Text>
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
                    ? i18n.t("admin.customerRequests.appointmentModal.approveTitle")
                    : i18n.t("admin.customerRequests.appointmentModal.title")}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setShowAppointmentModal(false);
                  setAppointmentPrice("");
                  setAppointmentVatPercent("24");
                }}
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
                        ? i18n.t("admin.customerRequests.appointmentModal.rescheduleInfo")
                        : i18n.t("admin.customerRequests.appointmentModal.customerInfo")}
                    </Text>
                  </View>
                </View>

                {/* SERVICE PRICE */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {i18n.t("admin.customerRequests.appointmentModal.servicePrice")} <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={styles.inputWithIcon}>
                    <MaterialIcons name="euro" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.formInput}
                      keyboardType="decimal-pad"
                      placeholder={i18n.t("admin.schedule.servicePrice.placeholder")}
                      value={appointmentPrice}
                      onChangeText={setAppointmentPrice}
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                {/* VAT */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {i18n.t("admin.schedule.serviceVat.title") || "VAT %"}{" "}
                    <Text style={styles.requiredStar}>*</Text>
                  </Text>

                  <View style={styles.inputWithIcon}>
                    <MaterialIcons
                      name="percent"
                      size={20}
                      color="#666"
                      style={styles.inputIcon}
                    />

                    <TextInput
                      style={styles.formInput}
                      keyboardType="decimal-pad"
                      placeholder={i18n.t("admin.schedule.serviceVat.placeholder")}
                      value={appointmentVatPercent}
                      onChangeText={setAppointmentVatPercent}
                      placeholderTextColor="#999"
                    />
                  </View>

                  <Text
                    style={{
                      marginTop: 8,
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#2c3e50"
                    }}
                  >
                    {i18n.t("admin.schedule.servicePrice.totalWithVat") ||
                      "Total with VAT"}: €{buildVatPricePayload(
                        appointmentPrice,
                        appointmentVatPercent
                      ).servicePrice.toFixed(2)}
                  </Text>
                </View>

                {/* APPOINTMENT CATEGORY */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {i18n.t("admin.customerRequests.appointmentModal.appointmentCategory")} <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.formDropdown}
                    onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dropdownContent}>
                      <MaterialIcons name="category" size={20} color="#666" />
                      <Text style={styles.dropdownText}>
                        {APPOINTMENT_CATEGORIES.find(c => c.id === appointmentCategory)?.label || i18n.t("admin.schedule.modals.selectCategory")}
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
                    {i18n.t("admin.customerRequests.appointmentModal.complianceValidUntil")} {selectedRequest?.service_type === 'myocide' && <Text style={styles.requiredStar}>*</Text>}
                  </Text>
                  <View style={styles.inputWithIcon}>
                    <MaterialIcons name="verified" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.formInput}
                      placeholder={selectedRequest?.service_type === 'myocide' ? i18n.t("admin.customerRequests.appointmentModal.complianceRequired") : i18n.t("admin.customerRequests.appointmentModal.complianceOptional")}
                      value={complianceValidUntil}
                      onChangeText={setComplianceValidUntil}
                      placeholderTextColor="#999"
                    />
                  </View>
                  <Text style={styles.helpText}>
                    {selectedRequest?.service_type === 'myocide' 
                      ? i18n.t("admin.schedule.compliance.requiredForMyocide")
                      : i18n.t("admin.customerRequests.appointmentModal.complianceOptionalDesc")}
                  </Text>
                </View>

                {/* SERVICE TYPE DISPLAY - For reschedule requests */}
                {selectedRequest.type === 'reschedule_request' ? (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>{i18n.t("admin.customerRequests.appointmentModal.serviceType")}</Text>
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
                    <Text style={styles.formLabel}>{i18n.t("admin.customerRequests.appointmentModal.serviceType")}</Text>
                    
                    {/* Display current service type */}
                    <View style={styles.currentServiceDisplay}>
                      <MaterialIcons name="star" size={18} color="#1f9c8b" />
                      <Text style={styles.currentServiceText}>
                        {i18n.t("admin.customerRequests.appointmentModal.currentService", { type: getServiceTypeLabel(
                          selectedRequest?.service_type,
                          selectedRequest?.special_service_subtype,
                          selectedRequest?.other_pest_name
                        ) })}
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
                          {serviceTypes.find(s => s.id === serviceType)?.label || i18n.t("admin.customerRequests.appointmentModal.changeServiceType")}
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
                    <Text style={styles.formLabel}>{i18n.t("admin.customerRequests.appointmentModal.specificServiceType")} <Text style={styles.requiredStar}>*</Text></Text>
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
                            : i18n.t("admin.schedule.specialSubtypes.selectType")}
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
                        <Text style={styles.formLabel}>{i18n.t("admin.schedule.specialSubtypes.specifyPest")} <Text style={styles.requiredStar}>*</Text></Text>
                        <View style={styles.borderedInputContainer}>
                          <TextInput
                            style={styles.formInput}
                            placeholder={i18n.t("admin.schedule.specialSubtypes.pestPlaceholder")}
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
                    <Text style={styles.formLabel}>{i18n.t("admin.schedule.treatmentDetails.title")} <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                      style={styles.formTextArea}
                      placeholder={i18n.t("admin.schedule.treatmentDetails.insecticidePlaceholder")}
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
                    <Text style={styles.formLabel}>{i18n.t("admin.schedule.treatmentDetails.title")} <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                      style={styles.formTextArea}
                      placeholder={i18n.t("admin.schedule.treatmentDetails.disinfectionPlaceholder")}
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
                    {i18n.t("admin.customerRequests.appointmentModal.technician")} <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  {technicians.length === 0 ? (
                    <View style={styles.noTechniciansContainer}>
                      <MaterialIcons name="warning" size={20} color="#F44336" />
                      <Text style={styles.noTechniciansText}>
                        {i18n.t("admin.customerRequests.appointmentModal.noTechnicians")}
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
                                {techName || tech.username || i18n.t("admin.schedule.technician.unknown") || 'Unknown'}
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
                    {i18n.t("admin.customerRequests.appointmentModal.date")} <Text style={styles.requiredStar}>*</Text>
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
                        <Text style={styles.dateTimeLabel}>{i18n.t("admin.schedule.dateTime.appointmentDate")}</Text>
                        <Text style={styles.dateTimeValue}>
                          {/* Format the date to show only YYYY-MM-DD */}
                          {formatDateOnly(appointmentData.date) || i18n.t("admin.schedule.dateTime.selectDate")}
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
                    {i18n.t("admin.customerRequests.appointmentModal.time")} <Text style={styles.requiredStar}>*</Text>
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
                        <Text style={styles.dateTimeLabel}>{i18n.t("admin.schedule.dateTime.appointmentTime")}</Text>
                        <Text style={styles.dateTimeValue}>
                          {appointmentData.time ? formatTime(appointmentData.time) : i18n.t("admin.schedule.dateTime.selectTime")}
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
                      <Text style={styles.preferencesTitle}>{i18n.t("admin.customerRequests.appointmentModal.customerPreferences")}</Text>
                    </View>
                    <View style={styles.preferencesContent}>
                      {selectedRequest?.preferred_date && (
                        <View style={styles.preferenceItem}>
                          <MaterialIcons name="calendar-today" size={16} color="#666" />
                          <Text style={styles.preferenceText}>
                            {i18n.t("admin.customerRequests.appointmentModal.preferredDate", { date: formatDate(selectedRequest.preferred_date) })}
                          </Text>
                        </View>
                      )}
                      {selectedRequest?.preferred_time && (
                        <View style={styles.preferenceItem}>
                          <MaterialIcons name="schedule" size={16} color="#666" />
                          <Text style={styles.preferenceText}>
                            {i18n.t("admin.customerRequests.appointmentModal.preferredTime", { time: formatTime(selectedRequest.preferred_time) })}
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
                      <Text style={styles.notesTitle}>{i18n.t("admin.customerRequests.appointmentModal.customerNotes")}</Text>
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
                <Text style={styles.loadingText}>{i18n.t("admin.customerRequests.loading")}</Text>
              </View>
            )}
            
            <View style={styles.appointmentModalFooter}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.cancelActionButton]}
                onPress={() => {
                  setShowAppointmentModal(false);
                  setAppointmentPrice("");
                  setAppointmentVatPercent("24");
                }}
                disabled={processing}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelActionButtonText}>{i18n.t("admin.customerRequests.appointmentModal.cancel")}</Text>
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
                      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.appointmentModal.complianceRequired"));
                      return;
                    }
                    approveReschedule();
                  } else {
                    // For new service requests, validate all fields
                    if (serviceType === 'myocide' && !complianceValidUntil) {
                      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.appointmentModal.complianceRequired"));
                      return;
                    }
                    
                    if (serviceType === 'special' && !specialServiceSubtype) {
                      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.appointmentModal.specialRequired"));
                      return;
                    }
                    
                    if (serviceType === 'special' && specialServiceSubtype === 'other' && !otherPestName.trim()) {
                      Alert.alert(i18n.t("common.error"), i18n.t("admin.customerRequests.appointmentModal.otherPestRequired"));
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
                        ? i18n.t("admin.customerRequests.appointmentModal.approveReschedule")
                        : i18n.t("admin.customerRequests.appointmentModal.createAppointment")}
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
              <Text style={styles.passwordTitle}>{i18n.t("admin.customerRequests.passwordModal.title")}</Text>
              <Text style={styles.passwordSubtitle}>
                {i18n.t("admin.customerRequests.passwordModal.subtitle")}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.passwordForm}>
              <Text style={styles.inputLabel}>{i18n.t("admin.customerRequests.passwordModal.newPassword")}</Text>
              <TextInput
                placeholder={i18n.t("admin.customerRequests.passwordModal.newPasswordPlaceholder") || "Enter new password"}
                secureTextEntry
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <Text style={styles.inputLabel}>{i18n.t("admin.customerRequests.passwordModal.confirmPassword")}</Text>
              <TextInput
                placeholder={i18n.t("admin.customerRequests.passwordModal.confirmPasswordPlaceholder") || "Re-enter new password"}
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
                <Text style={styles.cancelButtonText}>{i18n.t("common.cancel")}</Text>
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
                <Text style={styles.modalButtonText}>{i18n.t("admin.customerRequests.passwordModal.updatePassword")}</Text> 
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ImageViewing
        images={viewerImages}
        imageIndex={viewerIndex}
        visible={isImageViewerVisible}
        onRequestClose={() => setIsImageViewerVisible(false)}
        swipeToCloseEnabled={true}
        doubleTapToZoomEnabled={true}
      />
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