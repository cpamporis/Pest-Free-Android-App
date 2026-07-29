// AdminTechSchedule.js - Professional Styled Version
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  Image,
  Pressable
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, FontAwesome5, MaterialCommunityIcons, Feather, Entypo } from '@expo/vector-icons';
import DateTimePicker from "@react-native-community/datetimepicker";
import apiService, { API_BASE_URL } from "../../services/apiService";
import pestfreeLogo from "../../../assets/pestfree_logo.png";
import i18n from "../../services/i18n";

function normalizeCustomerSearch(value) {
  const text = String(value ?? "").trim().toLocaleLowerCase();

  return typeof text.normalize === "function"
    ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    : text;
}

function filterCustomersBySearch(customers, searchText) {
  const query = normalizeCustomerSearch(searchText);

  if (!query) return customers;

  return customers.filter((customer) =>
    [
      customer.customerName,
      customer.customerId,
      customer.address,
      customer.email,
      customer.telephone,
      customer.tin,
      customer.ama,
    ].some((value) => normalizeCustomerSearch(value).includes(query))
  );
}

function getCustomerSearchCopy() {
  const locale = String(
    i18n.locale || i18n.language || i18n.getLocale?.() || ""
  ).toLocaleLowerCase();

  const isGreek = locale.startsWith("el") || locale.startsWith("gr");

  return {
    placeholder: isGreek ? "Αναζήτηση πελάτη..." : "Search customer...",
    noResults: isGreek
      ? "Δεν βρέθηκαν πελάτες."
      : "No customers found.",
  };
}

export default function AdminTechSchedule({ onClose, initialCustomerId, onAppointmentChanged }) {
  const [appointments, setAppointments] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [appointmentTime, setAppointmentTime] = useState(new Date());
  const [editAppointmentTime, setEditAppointmentTime] = useState(new Date());
  const [customers, setCustomers] = useState([]);
  const [selectedTech, setSelectedTech] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [time, setTime] = useState("");
  const [serviceType, setServiceType] = useState("myocide");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false); 
  const [insecticideDetails, setInsecticideDetails] = useState(""); 
  const [disinfectionDetails, setDisinfectionDetails] = useState(""); 
  const [specialServiceSubtype, setSpecialServiceSubtype] = useState(null);
  const [showSpecialSubtypeDropdown, setShowSpecialSubtypeDropdown] = useState(false);
  const [otherPestName, setOtherPestName] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTechnicianDropdown, setShowTechnicianDropdown] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    scheduled: 0
  });
  const [complianceValidUntil, setComplianceValidUntil] = useState("");
  const [showCompliancePicker, setShowCompliancePicker] = useState(false);
  const [servicePrice, setServicePrice] = useState("");
  const [serviceVatPercent, setServiceVatPercent] = useState("24");
  const [appointmentCategory, setAppointmentCategory] = useState("first_time");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const appointmentCategories = [
    { id: "first_time", label: i18n.t("admin.schedule.appointmentCategory.first_time") },
    { id: "follow_up", label: i18n.t("admin.schedule.appointmentCategory.follow_up") },
    { id: "one_time", label: i18n.t("admin.schedule.appointmentCategory.one_time") },
    { id: "installation", label: i18n.t("admin.schedule.appointmentCategory.installation") },
    { id: "inspection", label: i18n.t("admin.schedule.appointmentCategory.inspection") },
    { id: "emergency", label: i18n.t("admin.schedule.appointmentCategory.emergency") },
    { id: "contract_service", label: i18n.t("admin.schedule.appointmentCategory.contract_service") },
  ];
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editDetails, setEditDetails] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editServiceType, setEditServiceType] = useState("myocide");
  const [editSpecialServiceSubtype, setEditSpecialServiceSubtype] = useState(null);
  const [editOtherPestName, setEditOtherPestName] = useState("");
  const [editInsecticideDetails, setEditInsecticideDetails] = useState("");
  const [editDisinfectionDetails, setEditDisinfectionDetails] = useState("");
  const [editServicePrice, setEditServicePrice] = useState("");
  const [editServiceVatPercent, setEditServiceVatPercent] = useState("");
  const [editAppointmentCategory, setEditAppointmentCategory] = useState("first_time");
  const [editComplianceValidUntil, setEditComplianceValidUntil] = useState("");
  const [showEditCategoryDropdown, setShowEditCategoryDropdown] = useState(false);
  const [showEditServiceDropdown, setShowEditServiceDropdown] = useState(false);
  const [showEditSpecialSubtypeDropdown, setShowEditSpecialSubtypeDropdown] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [editTime, setEditTime] = useState("");
  const [editTechnicianId, setEditTechnicianId] = useState(null);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerForAdd, setSelectedCustomerForAdd] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");

  // Define special service subtypes
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

  // Update serviceTypes with icons
  const serviceTypes = [
    { id: "myocide", label: i18n.t("admin.schedule.serviceType.myocide.label"), description: i18n.t("admin.schedule.serviceType.myocide.description"), icon: "pest-control-rodent", color: "#1f9c8b" },
    { id: "disinfection", label: i18n.t("admin.schedule.serviceType.disinfection.label"), description: i18n.t("admin.schedule.serviceType.disinfection.description"), icon: "clean-hands", color: "#1f9c8b" },
    { id: "insecticide", label: i18n.t("admin.schedule.serviceType.insecticide.label"), description: i18n.t("admin.schedule.serviceType.insecticide.description"), icon: "pest-control", color: "#1f9c8b" },
    { id: "special", label: i18n.t("admin.schedule.serviceType.special.label"), description: i18n.t("admin.schedule.serviceType.special.description"), icon: "star", color: "#1f9c8b" },
    {
      id: "certificate",
      label: i18n.t("admin.schedule.serviceType.certificate.label"),
      description: i18n.t(
        "admin.schedule.serviceType.certificate.description"
      ),
      icon: "verified",
      color: "#1f9c8b"
    },
  ];

  // Generate time options
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));



  // Initialize time on component mount
  useEffect(() => {
  const now = new Date();
  setAppointmentTime(now);
  // Set initial time in HH:MM format
  setTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
}, []);

  // Reset otherPestName when subtype changes from "other" to something else
  useEffect(() => {
    if (specialServiceSubtype !== "other") {
      setOtherPestName("");
    }
  }, [specialServiceSubtype]);

  useEffect(() => {
    const now = new Date();
    // Set the DateTimePicker value
    setAppointmentTime(now);
    // Also set the time string in HH:MM format
    setTime(formatTime(now.toTimeString().slice(0,5)));
  }, []);

  const selectedService = serviceTypes.find(s => s.id === serviceType) || serviceTypes[0];

  useEffect(() => {
    loadInitialData();
  }, []);


  useEffect(() => {
    if (selectedTech) {
      loadAppointments();
    }
  }, [selectedTech, selectedDate]);

  function isUUID(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  async function loadInitialData() {
    setLoading(true);
    try {

      // Load technicians separately
      await loadTechnicians();
      
      // Load customers
      const custResult = await apiService.getCustomers();
      
      // FIX: Use the correct property names
      const formattedCustomers = Array.isArray(custResult)
        ? custResult.map(c => ({
            customerId: c.customerId || c.id, // Use customerId from API response
            customerName: c.customerName || c.name,
            address: c.address,
            email: c.email,
            telephone: c.telephone,
            tin: c.tin,
            ama: c.ama
          }))
        : [];
      
      setCustomers(formattedCustomers);
      
    } catch (error) {
      console.error("Failed to load initial data:", error);
      Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.loading"));
    } finally {
      setLoading(false);
    }
  }

  async function loadTechnicians() {
    try {
      const techResult = await apiService.getTechnicians();
      
      let techsList = [];
      if (Array.isArray(techResult)) {
        techsList = techResult.map(tech => {
          
          // Handle different ID field names
          const id = tech.id || tech.technicianId || tech.userId;
          const name = `${tech.first_name || tech.firstName || ''} ${tech.last_name || tech.lastName || ''}`.trim() || 
                      tech.name || tech.username || i18n.t("admin.schedule.technician.unknown") || 'Unknown';
          
          return {
            id: id,
            name: name,
            firstName: tech.first_name || tech.firstName,
            lastName: tech.last_name || tech.lastName,
            username: tech.username
          };
        });
      } else if (techResult && typeof techResult === 'object' && !Array.isArray(techResult)) {
        // Handle object response (maybe success wrapper)
        
        if (techResult.success !== false && Array.isArray(techResult.technicians)) {
          techsList = techResult.technicians.map(tech => ({
            id: tech.id || tech.technicianId,
            name: `${tech.first_name || tech.firstName || ''} ${tech.last_name || tech.lastName || ''}`.trim() || 
                  tech.username || i18n.t("admin.schedule.technician.unknown") || 'Unknown',
            firstName: tech.first_name || tech.firstName,
            lastName: tech.last_name || tech.lastName,
            username: tech.username
          }));
        } else if (Array.isArray(techResult.data)) {
          techsList = techResult.data.map(tech => ({
            id: tech.id || tech.technicianId,
            name: `${tech.first_name || tech.firstName || ''} ${tech.last_name || tech.lastName || ''}`.trim() || 
                  tech.username || i18n.t("admin.schedule.technician.unknown") || 'Unknown',
            firstName: tech.first_name || tech.firstName,
            lastName: tech.last_name || tech.lastName,
            username: tech.username
          }));
        }
      }
      
      setTechnicians(techsList);
      
      // Auto-select first technician if none selected
      if (techsList.length > 0 && !selectedTech) {
        setSelectedTech(techsList[0].id);
      }
      
    } catch (error) {
      console.error("❌ Failed to load technicians:", error);
      Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.technician.loadError") || "Failed to load technicians");
      setTechnicians([]);
    }
  }

  // Load schedule and calculate stats
  async function loadAppointments() {
    const dateStr = selectedDate.toISOString().split("T")[0];
    try {
      const data = await apiService.getAppointmentsWithPricing({
        dateFrom: dateStr,
        dateTo: dateStr,
        technicianId: selectedTech
      });
      
      // Directly set the appointments - no filtering needed
      setAppointments(data);
      
      // Calculate statistics
      const total = data.length;
      const completed = data.filter(a => a.status === 'completed').length;
      const scheduled = data.filter(a => a.status === 'scheduled').length;
      
      setStats({ total, completed, scheduled });
      
    } catch (error) {
      console.error("❌ Failed to load appointments:", error);
      Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.appointments.loadError") || "Failed to load appointments");
    }
  }

  function parseDecimalInput(value) {
  if (value === null || value === undefined || value === "") {
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
  const netPrice = roundMoney(parseDecimalInput(netValue) || 0);
  const vatPercent = roundMoney(parseDecimalInput(vatValue) || 0);
  const vatAmount = roundMoney(netPrice * (vatPercent / 100));
  const grossPrice = roundMoney(netPrice + vatAmount);

  return {
    serviceNetPrice: netPrice,
    serviceVatPercent: vatPercent,
    serviceVatAmount: vatAmount,
    servicePrice: grossPrice,
  };
}

  async function addCustomerToSchedule(customerId) {

    customerId = String(customerId);

    if (!customerId || customerId === "undefined") {
      console.error("Invalid customerId:", customerId);
      return Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.addCustomer.invalidCustomer") || "Invalid customer selected");
    }

    if (!selectedTech) {
      console.error("No technician selected:", { selectedTech, technicians });
      Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.addCustomer.noTechnician") || "Please select a technician first");
      return;
    }

    const techExists = technicians.some(t => t.id === selectedTech);
    if (!techExists) {
      console.error("Selected technician not found:", { selectedTech, technicians });
      Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.addCustomer.invalidTechnician") || "Selected technician not found. Please select a valid technician.");
      return;
    }

    if (!time.trim()) return Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.addCustomer.noTime") || "Please enter appointment time");
    
    const normalizedPrice = servicePrice.replace(",", ".").trim();

      if (
        !normalizedPrice ||
        normalizedPrice === "." ||
        normalizedPrice.endsWith(".")
      ) {
        return Alert.alert(
          i18n.t("admin.schedule.servicePrice.title") || "Invalid Price",
          i18n.t("admin.schedule.servicePrice.invalidFormat") ||
            "Enter a valid price (e.g. 40,05)"
        );
      }

      const price = parseFloat(normalizedPrice);

      if (isNaN(price) || price <= 0) {
        return Alert.alert(
          i18n.t("admin.schedule.servicePrice.title") || "Invalid Price",
          i18n.t("admin.schedule.servicePrice.invalid") ||
            "Price must be greater than 0"
        );
      }

      const normalizedVatPercent = serviceVatPercent
        .replace(",", ".")
        .trim();

      if (
        !normalizedVatPercent ||
        normalizedVatPercent === "." ||
        normalizedVatPercent.endsWith(".")
      ) {
        return Alert.alert(
          i18n.t("admin.schedule.serviceVat.title") || "Invalid VAT",
          i18n.t("admin.schedule.serviceVat.invalidFormat") ||
            "Enter a valid VAT percentage (e.g. 24 or 13,5)"
        );
      }

      const vatPercent = parseFloat(normalizedVatPercent);

      if (isNaN(vatPercent) || vatPercent < 0) {
        return Alert.alert(
          i18n.t("admin.schedule.serviceVat.title") || "Invalid VAT",
          i18n.t("admin.schedule.serviceVat.invalid") ||
            "VAT must be 0 or greater"
        );
      }

      const pricePayload = buildVatPricePayload(
        normalizedPrice,
        normalizedVatPercent
      );
    
    if (!serviceType) return Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.addCustomer.noServiceType") || "Please select a service type");

    if (
      (serviceType === "myocide" || serviceType === "certificate") &&
      !complianceValidUntil
    ) {
      Alert.alert(
        i18n.t("admin.schedule.compliance.missing") || "Missing compliance date",
        i18n.t("admin.schedule.compliance.requiredForMyocide") || "Compliance valid-until date is required for Myocide services."
      );
      return;
    }

    // IMPORTANT: For insecticide, we should use the insecticideDetails state
    if (serviceType === "insecticide" && !insecticideDetails.trim()) {
      return Alert.alert(i18n.t("common.required"), i18n.t("admin.schedule.treatmentDetails.insecticideRequired") || "Please provide details about the insecticide treatment");
    }
    
    if (serviceType === "disinfection" && !disinfectionDetails.trim()) {
      return Alert.alert(i18n.t("common.required"), i18n.t("admin.schedule.treatmentDetails.disinfectionRequired") || "Please provide details about the disinfection treatment");
    }
    
    if (serviceType === "special" && !specialServiceSubtype) {
      return Alert.alert(i18n.t("common.required"), i18n.t("admin.schedule.addCustomer.specialRequired") || "Please select a specific service type for Special Service");
    }
    
    if (serviceType === "special" && specialServiceSubtype === "other" && !otherPestName.trim()) {
      return Alert.alert(i18n.t("common.required"), i18n.t("admin.schedule.addCustomer.otherPestRequired") || "Please type the name of the pest for 'Other' service");
    }

    if (!/^\d{2}:\d{2}$/.test(time.trim())) {
      return Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.addCustomer.invalidTimeFormat") || "Please use HH:MM format (e.g., 09:30 or 14:00)");
    }

    const [hours, minutes] = time.trim().split(':').map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.addCustomer.invalidTimeRange") || "Hours must be 00-23, minutes must be 00-59");
    }

    const dayKey = selectedDate.toISOString().split("T")[0];
    
    const existingAppointment = appointments.find(
      a =>
        a.technicianId === selectedTech &&
        a.date === dayKey &&
        a.time === time
    );

    
    if (existingAppointment) {
      return Alert.alert(i18n.t("admin.schedule.addCustomer.timeSlotUnavailable") || "Time Slot Unavailable", i18n.t("admin.schedule.addCustomer.timeSlotTaken") || "This time slot is already booked for the selected technician");
    }

    try {
      const dayKey = selectedDate.toISOString().split("T")[0];

      const isUuidCustomer = isUUID(customerId);

      // Prepare the payload
      const payload = {
        technicianId: selectedTech,
        customerId: isUuidCustomer ? customerId : null,
        legacyCustomerKey: !isUuidCustomer ? customerId : null,
        appointmentDate: dayKey,
        appointmentTime: time.trim(),
        serviceType,
        appointmentCategory,
        ...pricePayload,
        status: "scheduled",
        ...(complianceValidUntil && {
          compliance_valid_until: complianceValidUntil
        })
      };
            
      // Add service-specific details
      if (serviceType === "insecticide") {
        // ✅ Store BOTH in otherPestName AND insecticideDetails
        payload.otherPestName = insecticideDetails.trim();
        payload.insecticideDetails = insecticideDetails.trim();
      } else if (serviceType === "disinfection") {
        // ✅ Store BOTH in otherPestName AND disinfection_details
        payload.otherPestName = disinfectionDetails.trim();
        payload.disinfection_details = disinfectionDetails.trim();
      } else if (serviceType === "special") {
        payload.specialServiceSubtype = specialServiceSubtype;
        if (specialServiceSubtype === "other") {
          payload.otherPestName = otherPestName.trim();
        } else {
          // For non-"other" special services
          const subtype = specialServiceSubtypes.find(s => s.id === specialServiceSubtype);
          payload.otherPestName = subtype?.label || specialServiceSubtype;
        }
      } else if (serviceType === "myocide") {
        // ✅ Also for myocide, set otherPestName
        payload.otherPestName = i18n.t("admin.schedule.serviceType.myocide.label") || "Myocide Service";
      }
      else if (serviceType === "certificate") {
        payload.otherPestName =
          i18n.t("admin.schedule.serviceType.certificate.label") ||
          "Certification Service";
      }
  
      const res = await apiService.createAppointment(payload);

      if (!res?.success) {
        return Alert.alert(i18n.t("common.error"), res.error || i18n.t("admin.schedule.addCustomer.createFailed") || "Failed to create appointment");
      }

      await loadAppointments();
      Alert.alert(i18n.t("common.success"), i18n.t("admin.schedule.addCustomer.createSuccess") || "Appointment created");
      
      // Reset all fields
      setTime("");
      setInsecticideDetails("");
      setDisinfectionDetails("");
      setSpecialServiceSubtype(null);
      setServicePrice("");
      setServiceVatPercent("24");
      setOtherPestName("");
      
    } catch (err) {
      console.error("Error creating appointment:", err);
      Alert.alert(i18n.t("common.error"), err.message || i18n.t("admin.schedule.addCustomer.createFailed") || "Failed to create appointment");
    }
  }

  async function updateAppointmentDetails(appointmentId, newDetails) {
    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) return;
      
      const payload = {
        otherPestName: newDetails,
        ...(appointment.serviceType === 'insecticide' && {
          insecticideDetails: newDetails
        }),
        ...(appointment.serviceType === 'disinfection' && {
          disinfection_details: newDetails
        })
      };
      
      
      const result = await apiService.updateAppointment(appointmentId, payload);
      
      if (result?.success) {
        await loadAppointments();
        Alert.alert(i18n.t("common.success"), i18n.t("admin.schedule.editModal.updateSuccess") || "Treatment details updated");
        return true;
      } else {
        Alert.alert(i18n.t("common.error"), result?.error || i18n.t("admin.schedule.editModal.updateFailed") || "Failed to update details");
        return false;
      }
    } catch (err) {
      console.error("Update details error:", err);
      Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.editModal.updateFailed") || "Failed to update treatment details");
      return false;
    }
  }

  async function removeCustomer(appointmentId) {
    Alert.alert(
      i18n.t("admin.schedule.appointments.removeTitle") || "Remove Appointment",
      i18n.t("admin.schedule.appointments.removeConfirm") || "Are you sure you want to remove this appointment?",
      [
        { text: i18n.t("common.cancel"), style: "cancel" },
        {
          text: i18n.t("common.delete") || "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const appointment = appointments.find(a => a.id === appointmentId);
              
              if (appointment && appointment.status === 'completed') {
                Alert.alert(
                  i18n.t("admin.schedule.appointments.cannotRemove") || "Cannot Remove",
                  i18n.t("admin.schedule.appointments.completedCannotRemove") || "This appointment has already been completed and cannot be removed."
                );
                return;
              }
              
              const result = await apiService.deleteAppointment(appointmentId);
              
              if (result?.success) {
                await loadAppointments();
                
                // 🔥 Call the callback to notify parent/calendar
                if (onAppointmentChanged) {
                  onAppointmentChanged();
                }
                
                Alert.alert(i18n.t("common.success"), i18n.t("admin.schedule.appointments.removeSuccess") || "Appointment removed successfully");
              } else {
                Alert.alert(i18n.t("common.error"), result?.error || i18n.t("admin.schedule.appointments.removeFailed") || "Failed to delete appointment");
              }
            } catch (err) {
              console.error("Delete appointment error:", err);
              Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.appointments.removeFailed") || "Failed to delete appointment");
            }
          }
        }
      ]
    );
  }

  async function cancelAppointment(appointmentId) {
    Alert.alert(
      i18n.t("admin.schedule.appointments.cancelTitle") || "Cancel Appointment",
      i18n.t("admin.schedule.appointments.cancelConfirm") || "This appointment will be marked as cancelled but kept for records. Continue?",
      [
        { text: i18n.t("common.cancel"), style: "cancel" },
        {
          text: i18n.t("admin.schedule.appointments.cancelButton") || "Cancel Appointment",
          style: "destructive",
          onPress: async () => {
            try {
              const appointment = appointments.find(a => a.id === appointmentId);

              if (!appointment) return;

              if (appointment.status === "completed") {
                Alert.alert(
                  i18n.t("admin.schedule.appointments.notAllowed") || "Not Allowed",
                  i18n.t("admin.schedule.appointments.completedCannotCancel") || "Completed appointments cannot be cancelled."
                );
                return;
              }

              const res = await apiService.cancelAppointment(appointmentId);

              if (!res?.success) {
                return Alert.alert(i18n.t("common.error"), res?.error || i18n.t("admin.schedule.appointments.cancelFailed") || "Failed to cancel appointment");
              }

              await loadAppointments();
              
              // 🔥 Call the callback to notify parent/calendar
              if (onAppointmentChanged) {
                onAppointmentChanged();
              }
              
              Alert.alert(i18n.t("admin.schedule.appointments.cancelled") || "Cancelled", i18n.t("admin.schedule.appointments.cancelSuccess") || "Appointment has been cancelled.");
            } catch (err) {
              console.error("Cancel appointment error:", err);
              Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.appointments.cancelFailed") || "Failed to cancel appointment");
            }
          }
        }
      ]
    );
  }

  function formatAppointmentTime(timeString) {
    
    if (!timeString || typeof timeString !== 'string') {
      console.warn("⚠️ Invalid time string:", timeString);
      return i18n.t("admin.schedule.appointments.noTime") || "No time";
    }
    
    // Extract just HH:MM from formats like "12:10:00" or "12:10:00.000Z"
    const match = timeString.match(/^(\d{1,2}):(\d{2})/);
    
    if (match) {
      const hours = match[1];
      const minutes = match[2];
      const formatted = `${hours}:${minutes}`; // Returns "09:10"
      return formatted;
    }
    
    console.warn("⚠️ Could not parse time string:", timeString);
    return timeString;
  }

  function getDayAssignments() {
    const filtered = appointments
      .filter(a => {
        const matches = a.technicianId === selectedTech;
        return matches;
      })
      .sort((a, b) => a.time.localeCompare(b.time));
      
    return filtered;
  }

  function getServiceTypeLabel(typeId, subtypeId = null, otherPest = null) {
    const service = serviceTypes.find(s => s.id === typeId);
    let label = service ? service.label : typeId || i18n.t("serviceTypes.myocide");
    
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
  }

  function handleEditAppointment(appointment) {
    
    setEditingAppointment(appointment);
    
    // Populate all fields from the appointment
    setEditServiceType(appointment.serviceType || 'myocide');
    setEditSpecialServiceSubtype(appointment.specialServiceSubtype || appointment.special_service_subtype || null);
    setEditOtherPestName(appointment.otherPestName || appointment.other_pest_name || '');
    setEditInsecticideDetails(appointment.insecticideDetails || appointment.insecticide_details || '');
    setEditDisinfectionDetails(appointment.disinfection_details || '');
    const storedNetPrice =
      appointment.serviceNetPrice ??
      appointment.service_net_price ??
      appointment.netPrice ??
      appointment.net_price ??
      null;

    const storedGrossPrice =
      appointment.servicePrice ??
      appointment.service_price ??
      null;

    const storedVatPercent =
      appointment.serviceVatPercent ??
      appointment.service_vat_percent ??
      appointment.vatPercent ??
      appointment.vat_percent ??
      null;

    const storedVatAmount =
      appointment.serviceVatAmount ??
      appointment.service_vat_amount ??
      appointment.vatAmount ??
      appointment.vat_amount ??
      null;

    let existingNetPrice = parseDecimalInput(storedNetPrice);
    let existingVatPercent = parseDecimalInput(storedVatPercent);

    const existingGrossPrice = parseDecimalInput(storedGrossPrice);
    const existingVatAmount = parseDecimalInput(storedVatAmount);

    if (existingNetPrice === null && existingGrossPrice !== null) {
      if (existingVatAmount !== null) {
        existingNetPrice = roundMoney(
          existingGrossPrice - existingVatAmount
        );
      } else if (
        existingVatPercent !== null &&
        existingVatPercent > -100
      ) {
        existingNetPrice = roundMoney(
          existingGrossPrice / (1 + existingVatPercent / 100)
        );
      } else {
        existingNetPrice = existingGrossPrice;
      }
    }

    if (
      existingVatPercent === null &&
      existingNetPrice !== null &&
      existingNetPrice > 0
    ) {
      if (existingVatAmount !== null) {
        existingVatPercent = roundMoney(
          (existingVatAmount / existingNetPrice) * 100
        );
      } else if (existingGrossPrice !== null) {
        existingVatPercent = roundMoney(
          (
            (existingGrossPrice - existingNetPrice) /
            existingNetPrice
          ) * 100
        );
      }
    }

    setEditServicePrice(
      existingNetPrice !== null
        ? existingNetPrice.toString()
        : ""
    );

    setEditServiceVatPercent(
      existingVatPercent !== null
        ? existingVatPercent.toString()
        : ""
    );
    setEditAppointmentCategory(appointment.appointmentCategory || appointment.appointment_category || 'first_time');
    setEditComplianceValidUntil(appointment.complianceValidUntil || appointment.compliance_valid_until || '');
    
    // Populate time
    const appointmentTimeStr = appointment.time || appointment.appointment_time || "09:30";
    setEditTime(appointmentTimeStr);

    if (appointmentTimeStr) {
      const [hours, minutes] = appointmentTimeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours) || 9);
      date.setMinutes(parseInt(minutes) || 30);
      setEditAppointmentTime(date);
    }
    
    // Parse time for time picker - FIXED: Use appointmentTimeStr instead of appointmentTime
    let hour = "09";
    let minute = "30";
    
    if (appointmentTimeStr) {  // FIXED: Changed from appointmentTime to appointmentTimeStr
      const timeMatch = appointmentTimeStr.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        hour = timeMatch[1].padStart(2, '0');
        minute = timeMatch[2].padStart(2, '0');
      }
    }
    
    // CRITICAL FIX: Find the technician ID - try ALL possible field names
    let technicianId = null;
    
    // Try all possible field names for technician ID
    if (appointment.technicianId) {
      technicianId = appointment.technicianId;
    } else if (appointment.technician_id) {
      technicianId = appointment.technician_id;
    } else if (appointment.technician) {
      technicianId = appointment.technician;
    } else if (appointment.technician_id) {
      technicianId = appointment.technician_id;
    }
    
    // If still null, try to find it from the appointments array
    if (!technicianId && appointments.length > 0) {
      const fullAppointment = appointments.find(a => a.id === appointment.id);
      if (fullAppointment) {
        if (fullAppointment.technicianId) technicianId = fullAppointment.technicianId;
        else if (fullAppointment.technician_id) technicianId = fullAppointment.technician_id;
        else if (fullAppointment.technician) technicianId = fullAppointment.technician;
      }
    }

    setEditTechnicianId(technicianId);
    
    setShowEditModal(true);
  }

  async function saveEditedDetails() {
    if (!editingAppointment || processing) return;
    
    setProcessing(true);
    
    const appointmentIdToUpdate = editingAppointment?.id;
    
    if (!appointmentIdToUpdate) {
      console.error("❌ ERROR: No appointment ID to update!");
      Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.editModal.missingId") || "Cannot update: Appointment ID is missing");
      setProcessing(false);
      return;
    }
    
    try {
      // Validate required fields
      const normalizedPrice = editServicePrice
        .replace(",", ".")
        .trim();

      if (
        !normalizedPrice ||
        normalizedPrice === "." ||
        normalizedPrice.endsWith(".")
      ) {
        Alert.alert(
          i18n.t("admin.schedule.servicePrice.title") || "Invalid Price",
          i18n.t("admin.schedule.servicePrice.invalidFormat") ||
            "Enter a valid price (e.g. 40,05)"
        );
        setProcessing(false);
        return;
      }

      const price = parseFloat(normalizedPrice);

      if (isNaN(price) || price <= 0) {
        Alert.alert(
          i18n.t("admin.schedule.servicePrice.title") || "Invalid Price",
          i18n.t("admin.schedule.servicePrice.invalid") ||
            "Price must be greater than 0"
        );
        setProcessing(false);
        return;
      }

      const normalizedVatPercent = editServiceVatPercent
        .replace(",", ".")
        .trim();

      if (
        !normalizedVatPercent ||
        normalizedVatPercent === "." ||
        normalizedVatPercent.endsWith(".")
      ) {
        Alert.alert(
          i18n.t("admin.schedule.serviceVat.title") || "Invalid VAT",
          i18n.t("admin.schedule.serviceVat.invalidFormat") ||
            "Enter a valid VAT percentage (e.g. 24 or 13,5)"
        );
        setProcessing(false);
        return;
      }

      const vatPercent = parseFloat(normalizedVatPercent);

      if (isNaN(vatPercent) || vatPercent < 0) {
        Alert.alert(
          i18n.t("admin.schedule.serviceVat.title") || "Invalid VAT",
          i18n.t("admin.schedule.serviceVat.invalid") ||
            "VAT must be 0 or greater"
        );
        setProcessing(false);
        return;
      }

      const editPricePayload = buildVatPricePayload(
        normalizedPrice,
        normalizedVatPercent
      );
      
      if (!editTime.trim()) {
        Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.editModal.noTime") || "Please select appointment time");
        setProcessing(false);
        return;
      }
      
      if (!editTechnicianId) {
        Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.editModal.noTechnician") || "Please select a technician");
        setProcessing(false);
        return;
      }
      
      if (
        (
          editServiceType === "myocide" ||
          editServiceType === "certificate"
        ) &&
        !editComplianceValidUntil
      ) {
        Alert.alert(i18n.t("admin.schedule.compliance.missing") || "Missing compliance date", i18n.t("admin.schedule.compliance.requiredForMyocide") || "Compliance valid-until date is required for Myocide services.");
        setProcessing(false);
        return;
      }
      
      if (editServiceType === "special" && !editSpecialServiceSubtype) {
        Alert.alert(i18n.t("common.required"), i18n.t("admin.schedule.editModal.specialRequired") || "Please select a specific service type for Special Service");
        setProcessing(false);
        return;
      }
      
      if (editServiceType === "special" && editSpecialServiceSubtype === "other" && !editOtherPestName.trim()) {
        Alert.alert(i18n.t("common.required"), i18n.t("admin.schedule.editModal.otherPestRequired") || "Please type the name of the pest for 'Other' service");
        setProcessing(false);
        return;
      }
      
      // Build the update payload
      const payload = {
        ...editPricePayload,
        appointmentCategory: editAppointmentCategory,
        serviceType: editServiceType,
        specialServiceSubtype: editSpecialServiceSubtype,
        otherPestName: '',
        compliance_valid_until: editComplianceValidUntil || null,
        time: editTime.trim(),
        technicianId: editTechnicianId,
        technician_id: editTechnicianId, 
      };
      
      // Set treatment details based on service type
      if (editServiceType === "insecticide") {
        payload.otherPestName = editInsecticideDetails.trim();
        payload.insecticideDetails = editInsecticideDetails.trim();
      } else if (editServiceType === "disinfection") {
        payload.otherPestName = editDisinfectionDetails.trim();
        payload.disinfection_details = editDisinfectionDetails.trim();
      } else if (editServiceType === "special") {
        payload.otherPestName = editSpecialServiceSubtype === "other" 
          ? editOtherPestName.trim() 
          : specialServiceSubtypes.find(s => s.id === editSpecialServiceSubtype)?.label || editSpecialServiceSubtype;
      } else if (editServiceType === "myocide") {
        payload.otherPestName = i18n.t("admin.schedule.serviceType.myocide.label") || "Myocide Service";
      }
      else if (editServiceType === "certificate") {
        payload.otherPestName =
          i18n.t("admin.schedule.serviceType.certificate.label") ||
          "Certification Service";
      }
      
      const result = await apiService.updateAppointment(appointmentIdToUpdate, payload);
      
      if (result?.success) {
        await loadAppointments();
        
        // Verify the change was applied
        const updatedAppointments = await apiService.getAppointmentsWithPricing({
          dateFrom: selectedDate.toISOString().split("T")[0],
          dateTo: selectedDate.toISOString().split("T")[0],
          technicianId: selectedTech
        });
        
        const updatedAppointment = updatedAppointments.find(a => a.id === appointmentIdToUpdate);
        
        Alert.alert(i18n.t("common.success"), i18n.t("admin.schedule.editModal.updateSuccess") || "Appointment updated successfully");
        closeEditModal();
      } else {
        console.error("❌ Update failed:", result?.error);
        Alert.alert(i18n.t("common.error"), result?.error || i18n.t("admin.schedule.editModal.updateFailed") || "Failed to update appointment");
      }
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert(i18n.t("common.error"), i18n.t("admin.schedule.editModal.updateFailed") || "Failed to save changes");
    } finally {
      setProcessing(false);
    }
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditingAppointment(null);
    setEditDetails("");
    setEditServiceType("myocide");
    setEditSpecialServiceSubtype(null);
    setEditOtherPestName("");
    setEditInsecticideDetails("");
    setEditDisinfectionDetails("");
    setEditServicePrice("");
    setEditServiceVatPercent("");
    setEditAppointmentCategory("first_time");
    setEditComplianceValidUntil("");
    setEditTime("");
    setEditTechnicianId(null);
    setShowEditCategoryDropdown(false);
    setShowEditServiceDropdown(false);
    setShowEditSpecialSubtypeDropdown(false);
    setShowEditTimePicker(false);
    setProcessing(false);
  }

  function getIconComponent(subtype) {
    const { icon, library } = subtype;
    
    switch (library) {
      case "Feather":
        return <Feather name={icon} size={20} color="#666" />;
      case "FontAwesome5":
        return <FontAwesome5 name={icon} size={20} color="#666" />;
      case "MaterialIcons":
        return <MaterialIcons name={icon} size={20} color="#666" />;
      case "MaterialCommunityIcons":
        return <MaterialCommunityIcons name={icon} size={20} color="#666" />;
      case "Entypo":
        return <Entypo name={icon} size={20} color="#666" />;
      default:
        return <MaterialIcons name="help" size={20} color="#666" />;
    }
  }

  const handleTimeChange = (event, selectedTime) => {
  setShowTimePicker(false);
  if (selectedTime) {
    setAppointmentTime(selectedTime);
    
    // FORCE format to HH:MM without seconds (same as CustomerRequestScreen)
    const hours = selectedTime.getHours().toString().padStart(2, '0');
    const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;
  
    setTime(formattedTime);
    // REMOVE THESE LINES - we don't need selectedHour/selectedMinute anymore
    // setSelectedHour(hours);
    // setSelectedMinute(minutes);
  }
};

 const handleEditTimeChange = (event, selectedTime) => {
  setShowEditTimePicker(false);
  if (selectedTime) {
    setEditAppointmentTime(selectedTime);
    
    const hours = selectedTime.getHours().toString().padStart(2, '0');
    const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;
    
    setEditTime(formattedTime);
    // REMOVE THESE LINES:
    // setEditSelectedHour(hours);
    // setEditSelectedMinute(minutes);
  }
};

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


  // Get selected technician name
  const selectedTechnicianName = technicians.find(t => t.id === selectedTech)?.name || i18n.t("admin.schedule.technician.select") || "Select Technician";
  const filteredCustomersForAdd =
    filterCustomersBySearch(customers, customerSearch);

  const customerSearchCopy = getCustomerSearchCopy();

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f9c8b" />
          <Text style={styles.loadingText}>{i18n.t("admin.schedule.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        key="admin-schedule-scrollview"
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandContainer}>
              <Image source={pestfreeLogo} style={styles.logo} resizeMode="contain" />
              <View style={styles.adminBadge}>
                <MaterialIcons name="schedule" size={14} color="#fff" />
                <Text style={styles.adminBadgeText}>{i18n.t("admin.schedule.header.badge")}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>{i18n.t("admin.schedule.header.welcome")}</Text>
            <Text style={styles.title}>{i18n.t("admin.schedule.header.title")}</Text>
            <Text style={styles.subtitle}>
              {i18n.t("admin.schedule.header.subtitle")}
            </Text>
          </View>
        </View>

        {/* STATS BAR */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialIcons name="event" size={18} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>{i18n.t("admin.schedule.stats.totalVisits")}</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialIcons name="check-circle" size={18} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabel}>{i18n.t("admin.schedule.stats.completed")}</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialIcons name="pending" size={18} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>{stats.scheduled}</Text>
            <Text style={styles.statLabel}>{i18n.t("admin.schedule.stats.scheduled")}</Text>
          </View>
        </View>

        {/* TECHNICIAN SELECTION */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="engineering" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>{i18n.t("admin.schedule.technician.title")}</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadInitialData}
            activeOpacity={0.7}
          >
            <MaterialIcons name="refresh" size={18} color="#1f9c8b" />
            <Text style={styles.refreshButtonText}>{i18n.t("common.refresh")}</Text>
          </TouchableOpacity>
        </View>

        {technicians.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="person-off" size={60} color="#ddd" />
            </View>
            <Text style={styles.emptyStateTitle}>{i18n.t("admin.schedule.technician.noTechnicians")}</Text>
            <Text style={styles.emptyStateText}>
              {i18n.t("admin.schedule.technician.noTechniciansDesc")}
            </Text>
          </View>
        ) : (
          <>
            {/* Technician Dropdown Button */}
            <TouchableOpacity
              style={[styles.customerDropdownButton, { marginBottom: 16 }]}
              onPress={() => setShowTechnicianDropdown(!showTechnicianDropdown)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownContent}>
                <MaterialIcons name="engineering" size={20} color="#666" />
                <Text style={styles.dropdownText}>
                  {selectedTechnicianName}
                </Text>
              </View>
              <MaterialIcons 
                name={showTechnicianDropdown ? "expand-less" : "expand-more"} 
                size={24} 
                color="#666" 
              />
            </TouchableOpacity>

            {/* Technician Dropdown Options */}
            {showTechnicianDropdown && (
              <View style={[styles.customerDropdownOptions, { marginBottom: 24 }]}>
                <ScrollView 
                  style={styles.customerOptionList}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {technicians.map((item) => {
                    const techId = item.id || item.technicianId;
                    const techName = item.name || 
                      `${item.firstName || item.first_name || ''} ${item.lastName || item.last_name || ''}`.trim() || 
                      item.username || 
                      i18n.t("admin.schedule.technician.unknown") || 
                      'Unknown';
                    const techUsername = item.username ? `@${item.username}` : '';
                    
                    return (
                      <TouchableOpacity
                        key={techId || techUsername || `tech-${Math.random()}`}
                        style={[
                          styles.customerOption,
                          selectedTech === techId && styles.customerOptionSelected
                        ]}
                        onPress={() => {
                          setSelectedTech(techId);
                          setShowTechnicianDropdown(false);
                        }}
                      >
                        <View style={styles.customerOptionContent}>
                          <View style={[styles.customerOptionAvatar, { backgroundColor: '#1f9c8b' }]}>
                            <MaterialIcons name="person" size={20} color="#fff" />
                          </View>
                          <View style={styles.customerOptionInfo}>
                            <Text style={styles.customerOptionName}>{techName}</Text>
                            {techUsername ? (
                              <Text style={styles.customerOptionId}>{techUsername}</Text>
                            ) : null}
                          </View>
                        </View>
                        {selectedTech === techId && (
                          <MaterialIcons name="check" size={20} color="#1f9c8b" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {/* COMPLIANCE VALIDITY DATE */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MaterialIcons name="verified" size={20} color="#2c3e50" />
              <Text style={styles.sectionTitle}>{i18n.t("admin.schedule.compliance.title")}</Text>
            </View>
            {complianceValidUntil ? (
              <Text style={styles.selectedDateText}>
                {complianceValidUntil}
              </Text>
            ) : (
              <Text style={[styles.selectedDateText, { opacity: 0.5 }]}>
                {i18n.t("admin.schedule.compliance.requiredForMyocide")}
              </Text>
            )}
          </View>

          {/* Updated compliance date button to match appointment date styling */}
          <TouchableOpacity
            style={[styles.dateTimeButton, { marginHorizontal: 24, marginBottom: 24 }]} 
            onPress={() => setShowCompliancePicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dateTimeButtonContent}>
              <View style={[styles.dateTimeIcon, { backgroundColor: 'rgba(31, 156, 139, 0.1)' }]}>
                <MaterialIcons name="event-available" size={20} color="#1f9c8b" />
              </View>
              <View style={styles.dateTimeTextContainer}>
                <Text style={styles.dateTimeLabel}>{i18n.t("admin.schedule.compliance.validUntil")}</Text>
                <Text style={styles.dateTimeValue}>
                  {complianceValidUntil || i18n.t("admin.schedule.compliance.selectDate")}
                </Text>
              </View>
              <MaterialIcons name="calendar-today" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          {/* Centered compliance date picker */}
          {showCompliancePicker && (
            <View style={styles.timePickerContainer}> 
              <DateTimePicker
                value={
                  complianceValidUntil
                    ? new Date(complianceValidUntil)
                    : new Date()
                }
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowCompliancePicker(false);
                  if (date) {
                    const formatted = date.toISOString().split("T")[0];
                    setComplianceValidUntil(formatted);
                  }
                }}
                style={styles.datePicker}
              />
            </View>
          )}

        {/* DATE & TIME SELECTION - Fixed with Pressable */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="calendar-today" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>{i18n.t("admin.schedule.dateTime.title")}</Text>
          </View>
          <Text style={styles.selectedDateText}>
            {selectedDate.toISOString().split("T")[0]}
          </Text>
        </View>

        <View style={styles.datetimeGrid}>
          {/* DATE CARD */}
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dateTimeButtonContent}>
              <View style={[styles.dateTimeIcon, { backgroundColor: 'rgba(31, 156, 139, 0.1)' }]}>
                <MaterialIcons name="event" size={20} color="#1f9c8b" />
              </View>
              <View style={styles.dateTimeTextContainer}>
                <Text style={styles.dateTimeLabel}>{i18n.t("admin.schedule.dateTime.selectedDate")}</Text>
                <Text style={styles.dateTimeValue}>
                  {selectedDate.toISOString().split("T")[0]}
                </Text>
              </View>
              <MaterialIcons name="calendar-today" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          {/* TIME CARD - Using DateTimePicker like CustomerRequestScreen */}
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
                  {time ? formatTime(time) : i18n.t("admin.schedule.dateTime.selectTime")}
                </Text>
              </View>
              <MaterialIcons name="schedule" size={20} color="#666" />
            </View>
          </TouchableOpacity>
        </View>

        {showPicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowPicker(false);
              if (date) setSelectedDate(date);
            }}
          />
        )}

        {showTimePicker && (
          <View style={styles.timePickerContainer}> 
            <DateTimePicker
              value={appointmentTime}
              mode="time"
              display="spinner"
              is24Hour={true}
              minuteInterval={5}
              onChange={handleTimeChange}
              style={styles.datePicker}
            />
          </View>
        )}

        {/* SERVICE TYPE SELECTION */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="category" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>{i18n.t("admin.schedule.serviceType.title")}</Text>
          </View>
          <Text style={styles.serviceTypeBadge}>
            {selectedService.label}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.serviceSelector}
          onPress={() => setShowServiceDropdown(true)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.serviceIcon,
            { backgroundColor: `${selectedService.color}15` }
          ]}>
            <MaterialIcons 
              name={selectedService.icon} 
              size={24} 
              color={selectedService.color} 
            />
          </View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceLabel}>{selectedService.label}</Text>
            <Text style={styles.serviceDescription}>{selectedService.description}</Text>
          </View>
          <MaterialIcons name="expand-more" size={24} color="#666" />
        </TouchableOpacity>

        {/* Special Service Subtype */}
        {serviceType === "special" && (
          <View style={styles.nestedSection}>
            <TouchableOpacity
              style={styles.subtypeSelector}
              onPress={() => setShowSpecialSubtypeDropdown(true)}
              activeOpacity={0.7}
            >
              <View style={styles.subtypeContent}>
                <Text style={[
                  styles.subtypeLabel,
                  specialServiceSubtype && styles.subtypeLabelSelected
                ]}>
                  {specialServiceSubtype 
                    ? specialServiceSubtypes.find(s => s.id === specialServiceSubtype)?.label
                    : i18n.t("admin.schedule.specialSubtypes.selectType")}
                </Text>
                {specialServiceSubtype && (
                  <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                )}
              </View>
              <MaterialIcons name="expand-more" size={20} color="#666" />
            </TouchableOpacity>
            
            {/* Other Pest Name Input */}
            {specialServiceSubtype === "other" && (
              <View style={styles.otherPestContainer}>
                <Text style={styles.otherPestLabel}>{i18n.t("admin.schedule.specialSubtypes.specifyPest")}</Text>
                <TextInput
                  style={styles.otherPestInput}
                  placeholder={i18n.t("admin.schedule.specialSubtypes.pestPlaceholder")}
                  placeholderTextColor="#999"
                  value={otherPestName}
                  onChangeText={setOtherPestName}
                  maxLength={50}
                />
              </View>
            )}
          </View>
        )}

        {/* Service Details Inputs */}
        {serviceType === "insecticide" && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsLabel}>{i18n.t("admin.schedule.treatmentDetails.title")}</Text>
            <TextInput
              style={styles.detailsInput}
              placeholder={i18n.t("admin.schedule.treatmentDetails.insecticidePlaceholder")}
              placeholderTextColor="#999"
              value={insecticideDetails}
              onChangeText={setInsecticideDetails}
            />
          </View>
        )}

        {serviceType === "disinfection" && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsLabel}>{i18n.t("admin.schedule.treatmentDetails.title")}</Text>
            <TextInput
              style={styles.detailsInput}
              placeholder={i18n.t("admin.schedule.treatmentDetails.disinfectionPlaceholder")}
              placeholderTextColor="#999"
              value={disinfectionDetails}
              onChangeText={setDisinfectionDetails}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {/* APPOINTMENT CATEGORY */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="assignment" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>{i18n.t("admin.schedule.appointmentCategory.title")}</Text>
          </View>
          <Text style={styles.serviceTypeBadge}>
            {appointmentCategories.find(c => c.id === appointmentCategory)?.label}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.serviceSelector}
          onPress={() => setShowCategoryDropdown(true)}
          activeOpacity={0.7}
        >
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceLabel}>
              {appointmentCategories.find(c => c.id === appointmentCategory)?.label}
            </Text>
            <Text style={styles.serviceDescription}>
              {i18n.t("admin.schedule.appointmentCategory.description")}
            </Text>
          </View>
          <MaterialIcons name="expand-more" size={24} color="#666" />
        </TouchableOpacity>

        {/* SERVICE PRICE */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="euro" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>{i18n.t("admin.schedule.servicePrice.title")}</Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <TextInput
            style={styles.detailsInput}
            placeholder={i18n.t("admin.schedule.servicePrice.placeholder")}
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
            value={servicePrice}
            onChangeText={setServicePrice}
          />
        </View>

        {/* VAT */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons
              name="percent"
              size={20}
              color="#2c3e50"
            />

            <Text style={styles.sectionTitle}>
              {i18n.t("admin.schedule.serviceVat.title") || "VAT %"}
            </Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <TextInput
            style={styles.detailsInput}
            placeholder={
              i18n.t("admin.schedule.serviceVat.placeholder") ||
              "e.g. 24"
            }
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
            value={serviceVatPercent}
            onChangeText={setServiceVatPercent}
          />

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
                servicePrice,
                serviceVatPercent
              ).servicePrice.toFixed(2)}
          </Text>
        </View>

        {/* TODAY'S APPOINTMENTS */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="schedule" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>
              {i18n.t("admin.schedule.appointments.title", { date: selectedDate.toISOString().split("T")[0] })}
            </Text>
          </View>
          <Text style={styles.appointmentCount}>
            {getDayAssignments().length} {i18n.t("admin.schedule.stats.scheduled").toLowerCase()}
          </Text>
        </View>

        {getDayAssignments().length === 0 ? (
          <View style={styles.emptyAppointments}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="event-busy" size={60} color="#ddd" />
            </View>
            <Text style={styles.emptyStateTitle}>{i18n.t("admin.schedule.appointments.noAppointments")}</Text>
            <Text style={styles.emptyStateText}>
              {i18n.t("admin.schedule.appointments.noAppointmentsDesc")}
            </Text>
          </View>
        ) : (
          <View style={styles.appointmentsList}>
            {getDayAssignments().map((item, index) => {
              const customer = customers.find(c => 
                c.customerId === item.customerId || 
                c.customerId === item.legacyCustomerKey
              );
              
              // Check if appointment is completed or cancelled
              const isCompletedOrCancelled = item.status === 'completed' || item.status === 'cancelled';
              
              return (
                <View 
                  key={item.id}
                  style={[
                    styles.appointmentCard,
                    isCompletedOrCancelled && styles.appointmentCardCompletedOrCancelled // New style
                  ]}
                >
                  <View style={styles.appointmentHeader}>
                    <View style={styles.appointmentTimeContainer}>
                      <MaterialIcons name="access-time" size={16} color="#1f9c8b" />
                      <Text style={styles.appointmentTime}>
                        {formatAppointmentTime(item.time || item.appointment_time)} 
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {/* Edit Button - Only show for non-completed, non-cancelled appointments */}
                      {!isCompletedOrCancelled && (item.serviceType === 'insecticide' || item.serviceType === 'disinfection' || item.serviceType === 'special' || item.serviceType === 'myocide' || item.serviceType === "certificate") && (
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => handleEditAppointment(item)}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="edit" size={18} color="#1f9c8b" />
                        </TouchableOpacity>
                      )}
                      
                      {/* Cancel and Delete buttons - Only show for scheduled appointments */}
                      {item.status === "scheduled" && (
                        <>
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => cancelAppointment(item.id)}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons name="cancel" size={18} color="#1f9c8b" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => removeCustomer(item.id)}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons name="delete-outline" size={18} color="#1f9c8b" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                  
                  <Text style={styles.appointmentCustomer}>
                    {customer?.customerName || 
                    item.customer_name || 
                    (item.legacyCustomerKey ? `${i18n.t("admin.schedule.appointments.customerId", { id: item.legacyCustomerKey })}` : 
                      item.customerId ? `${i18n.t("admin.schedule.appointments.customerId", { id: item.customerId })}` : 
                      i18n.t("admin.schedule.appointments.unknownCustomer"))}
                  </Text>
                  
                  <View style={styles.serviceBadge}>
                    <MaterialIcons 
                      name={serviceTypes.find(s => s.id === item.serviceType)?.icon || 'help'} 
                      size={12} 
                      color="#666" 
                    />
                    <Text style={styles.serviceBadgeText}>
                      {getServiceTypeLabel(item.serviceType, item.specialServiceSubtype, item.otherPestName)}
                    </Text>
                  </View>
                  
                  {item.status === 'completed' && (
                    <View style={styles.completedBadge}>
                      <MaterialIcons name="check-circle" size={12} color="#1f9c8b" />
                      <Text style={styles.completedText}>{i18n.t("status.completed")}</Text>
                    </View>
                  )}
                  {item.status === "cancelled" && (
                    <View style={styles.cancelledBadge}>
                      <MaterialIcons name="cancel" size={12} color="#F44336" />
                      <Text style={styles.cancelledText}>{i18n.t("status.cancelled")}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ADD CUSTOMER DROPDOWN */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="person-add" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>{i18n.t("admin.schedule.addCustomer.title")}</Text>
          </View>
          <Text style={styles.customersCount}>
            {customers.length === 1
              ? i18n.t("admin.schedule.addCustomer.available_one", { count: customers.length })
              : i18n.t("admin.schedule.addCustomer.available_other", { count: customers.length })}
          </Text>
        </View>

        {/* Customer Dropdown Button */}
        <TouchableOpacity
          style={styles.customerDropdownButton}
          onPress={() => {
            if (showCustomerDropdown) {
              setCustomerSearch("");
            }

            setShowCustomerDropdown(!showCustomerDropdown);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.dropdownContent}>
            <MaterialIcons name="people" size={20} color="#666" />
            <Text style={styles.dropdownText}>
              {selectedCustomerForAdd 
                ? customers.find(c => c.customerId === selectedCustomerForAdd)?.customerName 
                : i18n.t("admin.schedule.addCustomer.dropdownPlaceholder")}
            </Text>
          </View>
          <MaterialIcons 
            name={showCustomerDropdown ? "expand-less" : "expand-more"} 
            size={24} 
            color="#666" 
          />
        </TouchableOpacity>

        {/* Customer Dropdown Options */}
        {showCustomerDropdown && (
          <View style={styles.customerDropdownOptions}>
            <View style={styles.customerSearchContainer}>
              <MaterialIcons name="search" size={20} color="#666" />

              <TextInput
                style={styles.customerSearchInput}
                placeholder={customerSearchCopy.placeholder}
                placeholderTextColor="#999"
                value={customerSearch}
                onChangeText={setCustomerSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {!!customerSearch && (
                <TouchableOpacity
                  style={styles.customerSearchClearButton}
                  onPress={() => setCustomerSearch("")}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="close" size={18} color="#666" />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView 
              style={styles.customerOptionList}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {filteredCustomersForAdd.length === 0 ? (
                <View style={styles.customerOptionEmpty}>
                  <Text style={styles.customerOptionEmptyText}>
                    {customerSearch.trim()
                      ? customerSearchCopy.noResults
                      : i18n.t("admin.schedule.addCustomer.noCustomers")}
                  </Text>
                </View>
              ) : (
                filteredCustomersForAdd.map((item) => (
                  <TouchableOpacity
                    key={item.customerId}
                    style={[
                      styles.customerOption,
                      selectedCustomerForAdd === item.customerId && styles.customerOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedCustomerForAdd(item.customerId);
                      setCustomerSearch("");
                      setShowCustomerDropdown(false);
                    }}
                  >
                    <View style={styles.customerOptionContent}>
                      <View style={styles.customerOptionAvatar}>
                        <Text style={styles.customerOptionAvatarText}>
                          {item.customerName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.customerOptionInfo}>
                        <Text style={styles.customerOptionName}>{item.customerName}</Text>
                        <Text style={styles.customerOptionId}>{i18n.t("admin.schedule.addCustomer.id", { id: item.customerId })}</Text>
                      </View>
                    </View>
                    {selectedCustomerForAdd === item.customerId && (
                      <MaterialIcons name="check" size={20} color="#1f9c8b" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* Schedule Button */}
        {selectedCustomerForAdd && (
          <TouchableOpacity
            style={styles.scheduleButton}
            onPress={() => addCustomerToSchedule(selectedCustomerForAdd)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add-circle" size={20} color="#fff" />
            <Text style={styles.scheduleButtonText}>{i18n.t("admin.schedule.addCustomer.scheduleButton")}</Text>
          </TouchableOpacity>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{i18n.t("admin.schedule.footer.system")}</Text>
          <Text style={styles.footerSubtext}>
              {i18n.t("admin.schedule.footer.version", { date: new Date().toLocaleDateString() })}
          </Text>
          <Text style={styles.footerCopyright}>
              {i18n.t("admin.schedule.footer.copyright", { year: new Date().getFullYear() })}
          </Text>
        </View>
      </ScrollView>

      {/* MODALS */}
      {/* Service Type Modal */}
      <Modal
        visible={showServiceDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowServiceDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowServiceDropdown(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.t("admin.schedule.modals.selectService")}</Text>
              <TouchableOpacity 
                onPress={() => setShowServiceDropdown(false)}
                style={styles.modalCloseButton}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={serviceTypes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    serviceType === item.id && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    setServiceType(item.id);
                    setSpecialServiceSubtype(null);
                    setOtherPestName("");
                    setInsecticideDetails("");
                    setDisinfectionDetails("");
                    setShowServiceDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.modalItemIcon,
                    { backgroundColor: `${item.color}15` }
                  ]}>
                    <MaterialIcons 
                      name={item.icon} 
                      size={20} 
                      color={item.color} 
                    />
                  </View>
                  <View style={styles.modalItemContent}>
                    <Text style={[
                      styles.modalItemLabel,
                      serviceType === item.id && styles.modalItemLabelSelected
                    ]}>
                      {item.label}
                    </Text>
                    <Text style={styles.modalItemDescription}>
                      {item.description}
                    </Text>
                  </View>
                  {serviceType === item.id && (
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
        visible={showSpecialSubtypeDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSpecialSubtypeDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSpecialSubtypeDropdown(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.t("admin.schedule.modals.selectSpecialType")}</Text>
              <TouchableOpacity 
                onPress={() => setShowSpecialSubtypeDropdown(false)}
                style={styles.modalCloseButton}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={specialServiceSubtypes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    specialServiceSubtype === item.id && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    setSpecialServiceSubtype(item.id);
                    setShowSpecialSubtypeDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  {item.library === "Feather" ? (
                    <Feather name={item.icon} size={20} color="#666" />
                  ) : item.library === "FontAwesome5" ? (
                    <FontAwesome5 name={item.icon} size={20} color="#666" />
                  ) : item.library === "MaterialIcons" ? (
                    <MaterialIcons name={item.icon} size={20} color="#666" />
                  ) : item.library === "MaterialCommunityIcons" ? (
                    <MaterialCommunityIcons name={item.icon} size={20} color="#666" />
                  ) : (
                    <Entypo name={item.icon} size={20} color="#666" />
                  )}
                  <Text style={[
                    styles.modalItemLabel,
                    specialServiceSubtype === item.id && styles.modalItemLabelSelected
                  ]}>
                    {item.label}
                  </Text>
                  {specialServiceSubtype === item.id && (
                    <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Appointment Category Modal */}
      <Modal
        visible={showCategoryDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryDropdown(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.t("admin.schedule.modals.selectCategory")}</Text>
              <TouchableOpacity onPress={() => setShowCategoryDropdown(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={appointmentCategories}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    appointmentCategory === item.id && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    setAppointmentCategory(item.id);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={styles.modalItemLabel}>{item.label}</Text>
                  {appointmentCategory === item.id && (
                    <MaterialIcons name="check-circle" size={20} color="#1f9c8b" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.appointmentModalContainer}>
            <View style={styles.appointmentModalHeader}>
              <View style={styles.appointmentModalTitleContainer}>
                <MaterialIcons 
                  name="edit" 
                  size={24} 
                  color="#1f9c8b" 
                  style={styles.appointmentModalIcon}
                />
                <Text style={styles.appointmentModalTitle}>
                  {i18n.t("admin.schedule.editModal.title")}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={closeEditModal}
                style={styles.appointmentCloseButton}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {editingAppointment ? (
              <ScrollView 
                style={styles.appointmentModalContent} 
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.appointmentModalScrollContent}
              >
                {/* Customer Info */}
                <View style={styles.customerInfoHeader}>
                  <View style={styles.customerAvatar}>
                    <Text style={styles.customerAvatarText}>
                      {(() => {
                        const customer = customers.find(c => 
                          c.customerId === editingAppointment.customerId || 
                          c.customerId === editingAppointment.legacyCustomerKey
                        );
                        return customer?.customerName?.charAt(0).toUpperCase() || 'C';
                      })()}
                    </Text>
                  </View>
                  <View style={styles.customerInfoText}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {(() => {
                        const customer = customers.find(c => 
                          c.customerId === editingAppointment.customerId || 
                          c.customerId === editingAppointment.legacyCustomerKey
                        );
                        return customer?.customerName || editingAppointment.customer_name || i18n.t("admin.schedule.appointments.unknownCustomer");
                      })()}
                    </Text>
                    <Text style={styles.customerRequestType}>
                      {i18n.t("admin.schedule.editModal.customerInfo")}
                    </Text>
                  </View>
                </View>

                {/* SERVICE PRICE */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {i18n.t("admin.schedule.editModal.servicePrice")} <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={styles.inputWithIcon}>
                    <MaterialIcons name="euro" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.formInput}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 80"
                      value={editServicePrice}
                      onChangeText={setEditServicePrice}
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
                      placeholder="e.g. 24"
                      value={editServiceVatPercent}
                      onChangeText={setEditServiceVatPercent}
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
                        editServicePrice,
                        editServiceVatPercent
                      ).servicePrice.toFixed(2)}
                  </Text>
                </View>

                {/* APPOINTMENT CATEGORY */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {i18n.t("admin.schedule.editModal.appointmentCategory")} <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.formDropdown}
                    onPress={() => setShowEditCategoryDropdown(!showEditCategoryDropdown)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dropdownContent}>
                      <MaterialIcons name="category" size={20} color="#666" />
                      <Text style={styles.dropdownText}>
                        {appointmentCategories.find(c => c.id === editAppointmentCategory)?.label || i18n.t("admin.schedule.modals.selectCategory")}
                      </Text>
                    </View>
                    <MaterialIcons 
                      name={showEditCategoryDropdown ? "expand-less" : "expand-more"} 
                      size={24} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                  
                  {showEditCategoryDropdown && (
                    <View style={styles.dropdownOptionsContainer}>
                      <ScrollView 
                        style={styles.dropdownScrollView}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {appointmentCategories.map(cat => (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.dropdownOption,
                              editAppointmentCategory === cat.id && styles.dropdownOptionSelected
                            ]}
                            onPress={() => {
                              setEditAppointmentCategory(cat.id);
                              setShowEditCategoryDropdown(false);
                            }}
                          >
                            <Text style={[
                              styles.dropdownOptionText,
                              editAppointmentCategory === cat.id && styles.dropdownOptionTextSelected
                            ]} numberOfLines={1}>
                              {cat.label}
                            </Text>
                            {editAppointmentCategory === cat.id && (
                              <MaterialIcons name="check" size={18} color="#1f9c8b" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* COMPLIANCE */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {i18n.t("admin.schedule.editModal.complianceValidUntil")}{" "}

                    {(editServiceType === "myocide" ||
                      editServiceType === "certificate") && (
                      <Text style={styles.requiredStar}>*</Text>
                    )}
                  </Text>

                  <View style={styles.inputWithIcon}>
                    <MaterialIcons
                      name="verified"
                      size={20}
                      color="#666"
                      style={styles.inputIcon}
                    />

                    <TextInput
                      style={styles.formInput}
                      placeholder={
                        editServiceType === "myocide" ||
                        editServiceType === "certificate"
                          ? i18n.t("admin.schedule.editModal.complianceRequired")
                          : i18n.t("admin.schedule.editModal.complianceOptional")
                      }
                      value={editComplianceValidUntil}
                      onChangeText={setEditComplianceValidUntil}
                      placeholderTextColor="#999"
                    />
                  </View>

                  <Text style={styles.helpText}>
                    {editServiceType === "myocide" ||
                    editServiceType === "certificate"
                      ? i18n.t("admin.schedule.compliance.requiredForMyocide")
                      : i18n.t("admin.schedule.editModal.complianceOptional")}
                  </Text>
                </View>

                {/* TIME SELECTION - In Edit Appointment Modal */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {i18n.t("admin.schedule.editModal.time")} <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowEditTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dateTimeButtonContent}>
                      <View style={[styles.dateTimeIcon, { backgroundColor: 'rgba(31, 156, 139, 0.1)' }]}>
                        <MaterialIcons name="access-time" size={20} color="#1f9c8b" />
                      </View>
                      <View style={styles.dateTimeTextContainer}>
                        <Text style={styles.dateTimeLabel}>{i18n.t("admin.schedule.dateTime.appointmentTime")}</Text>
                        <Text style={styles.dateTimeValue}>
                          {editTime ? formatTime(editTime) : i18n.t("admin.schedule.dateTime.selectTime")}
                        </Text>
                      </View>
                      <MaterialIcons name="schedule" size={20} color="#666" />
                    </View>
                  </TouchableOpacity>
                  
                  {showEditTimePicker && (
                    <View style={styles.timePickerContainer}> 
                      <DateTimePicker
                        value={editAppointmentTime}
                        mode="time"
                        display="spinner"
                        is24Hour={true}
                        minuteInterval={5}
                        onChange={handleEditTimeChange}
                        style={styles.datePicker}
                      />
                    </View>
                  )}
                </View>

                {/* TECHNICIAN SELECTION */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {i18n.t("admin.schedule.editModal.technician")} <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  {technicians.length === 0 ? (
                    <View style={styles.noTechniciansContainer}>
                      <MaterialIcons name="warning" size={20} color="#F44336" />
                      <Text style={styles.noTechniciansText}>
                        {i18n.t("admin.schedule.addCustomer.noTechnicians") || "No technicians available."}
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
                        const techName = `${tech.firstName || tech.first_name || ''} ${tech.lastName || tech.last_name || ''}`.trim() || tech.username || i18n.t("admin.schedule.technician.unknown") || 'Unknown';
                        
                        
                        return (
                          <TouchableOpacity
                            key={techId || tech.username || `tech-${index}`}
                            style={[
                              styles.technicianOption,
                              editTechnicianId === techId && 
                              styles.technicianOptionSelected
                            ]}
                            onPress={() => {
                              setEditTechnicianId(techId);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.technicianOptionContent}>
                              <View style={[
                                styles.technicianAvatar,
                                editTechnicianId === techId && 
                                styles.technicianAvatarSelected
                              ]}>
                                <FontAwesome5 
                                  name="user-cog" 
                                  size={14} 
                                  color={editTechnicianId === techId ? "#fff" : "#1f9c8b"} 
                                />
                              </View>
                              <Text style={[
                                styles.technicianName,
                                editTechnicianId === techId && 
                                styles.technicianNameSelected
                              ]} numberOfLines={1}>
                                {techName}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>

                {/* SERVICE TYPE - Read Only */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{i18n.t("admin.schedule.editModal.serviceType")}</Text>
                  <View style={styles.readOnlyDisplay}>
                    <View style={[
                      styles.serviceIcon,
                      { backgroundColor: `${serviceTypes.find(s => s.id === editServiceType)?.color || '#1f9c8b'}15` }
                    ]}>
                      <MaterialIcons 
                        name={serviceTypes.find(s => s.id === editServiceType)?.icon || 'help'} 
                        size={24} 
                        color={serviceTypes.find(s => s.id === editServiceType)?.color || '#1f9c8b'} 
                      />
                    </View>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceLabel}>
                        {serviceTypes.find(s => s.id === editServiceType)?.label || editServiceType}
                      </Text>
                      <Text style={styles.serviceDescription}>
                        {i18n.t("admin.schedule.editModal.serviceTypeUnchangeable")}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* SPECIAL SERVICE SUBTYPE */}
                {editServiceType === 'special' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>{i18n.t("admin.schedule.editModal.specificServiceType")} <Text style={styles.requiredStar}>*</Text></Text>
                    <TouchableOpacity
                      style={styles.formDropdown}
                      onPress={() => setShowEditSpecialSubtypeDropdown(!showEditSpecialSubtypeDropdown)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dropdownContent}>
                        <MaterialIcons name="category" size={20} color="#666" />
                        <Text style={styles.dropdownText}>
                          {editSpecialServiceSubtype 
                            ? specialServiceSubtypes.find(s => s.id === editSpecialServiceSubtype)?.label
                            : i18n.t("admin.schedule.specialSubtypes.selectType")}
                        </Text>
                      </View>
                      <MaterialIcons 
                        name={showEditSpecialSubtypeDropdown ? "expand-less" : "expand-more"} 
                        size={24} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                    
                    {showEditSpecialSubtypeDropdown && (
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
                                editSpecialServiceSubtype === subtype.id && styles.dropdownOptionSelected
                              ]}
                              onPress={() => {
                                setEditSpecialServiceSubtype(subtype.id);
                                setShowEditSpecialSubtypeDropdown(false);
                                
                                // Reset other pest name if not "other"
                                if (subtype.id !== 'other') {
                                  setEditOtherPestName('');
                                }
                              }}
                            >
                              <View style={styles.serviceOptionContent}>
                                {getIconComponent(subtype)}
                                <Text style={[
                                  styles.dropdownOptionText,
                                  editSpecialServiceSubtype === subtype.id && styles.dropdownOptionTextSelected
                                ]}>
                                  {subtype.label}
                                </Text>
                              </View>
                              {editSpecialServiceSubtype === subtype.id && (
                                <MaterialIcons name="check" size={18} color="#1f9c8b" />
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Other Pest Name Input */}
                    {editSpecialServiceSubtype === "other" && (
                      <View style={[styles.formGroup, { marginHorizontal: 0, marginTop: 12 }]}>
                        <View>
                        <Text style={styles.formLabel}>{i18n.t("admin.schedule.specialSubtypes.specifyPest")} <Text style={styles.requiredStar}>*</Text></Text>
                        <View style={styles.borderedInputContainer}>
                          <TextInput
                            style={styles.formInput}
                            placeholder={i18n.t("admin.schedule.specialSubtypes.pestPlaceholder")}
                            placeholderTextColor="#999"
                            value={editOtherPestName}
                            onChangeText={setEditOtherPestName}
                            maxLength={50}
                          />
                        </View>
                      </View>
                      </View>
                    )}
                  </View>
                  
                )}

                {/* TREATMENT DETAILS - INSECTICIDE */}
                {editServiceType === "insecticide" && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>{i18n.t("admin.schedule.editModal.treatmentDetails")} <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                      style={styles.formTextArea}
                      placeholder={i18n.t("admin.schedule.treatmentDetails.insecticidePlaceholder")}
                      placeholderTextColor="#999"
                      value={editInsecticideDetails}
                      onChangeText={setEditInsecticideDetails}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                )}

                {/* TREATMENT DETAILS - DISINFECTION */}
                {editServiceType === "disinfection" && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>{i18n.t("admin.schedule.editModal.treatmentDetails")} <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                      style={styles.formTextArea}
                      placeholder={i18n.t("admin.schedule.treatmentDetails.disinfectionPlaceholder")}
                      placeholderTextColor="#999"
                      value={editDisinfectionDetails}
                      onChangeText={setEditDisinfectionDetails}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                )}

                {/* Current appointment info */}
                <View style={styles.preferencesCard}>
                  <View style={styles.preferencesHeader}>
                    <MaterialIcons name="info" size={18} color="#1f9c8b" />
                    <Text style={styles.preferencesTitle}>{i18n.t("admin.schedule.editModal.currentDetails")}</Text>
                  </View>
                  <View style={styles.preferencesContent}>
                    <View style={styles.preferenceItem}>
                      <MaterialIcons name="event" size={16} color="#666" />
                      <Text style={styles.preferenceText}>
                        {i18n.t("admin.schedule.editModal.date", { date: editingAppointment.date || editingAppointment.appointment_date })}
                      </Text>
                    </View>
                    <View style={styles.preferenceItem}>
                      <MaterialIcons name="schedule" size={16} color="#666" />
                      <Text style={styles.preferenceText}>
                        {i18n.t("admin.schedule.editModal.time_current", { time: formatAppointmentTime(editingAppointment.time || editingAppointment.appointment_time) })}
                      </Text>
                    </View>
                    <View style={styles.preferenceItem}>
                      <MaterialIcons name="engineering" size={16} color="#666" />
                      <Text style={styles.preferenceText}>
                        {i18n.t("admin.schedule.editModal.technician_current", { name: selectedTechnicianName })}
                      </Text>
                    </View>
                  </View>
                </View>

              </ScrollView>
            ) : (
              <View style={styles.loadingModalContent}>
                <ActivityIndicator size="large" color="#1f9c8b" />
                <Text style={styles.loadingText}>{i18n.t("admin.schedule.loading")}</Text>
              </View>
            )}
            
            <View style={styles.appointmentModalFooter}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.cancelActionButton]}
                onPress={closeEditModal}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelActionButtonText}>{i18n.t("admin.schedule.editModal.cancel")}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalActionButton, 
                  styles.primaryActionButton,
                  (!editServicePrice || processing) && styles.disabledActionButton
                ]}
                onPress={saveEditedDetails}
                disabled={!editServicePrice || processing}
                activeOpacity={0.7}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={18} color="#fff" />
                    <Text style={styles.primaryActionButtonText}>{i18n.t("admin.schedule.editModal.saveChanges")}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  customerSearchContainer: {
  flexDirection: "row",
  alignItems: "center",
  margin: 12,
  marginBottom: 4,
  paddingHorizontal: 12,
  borderWidth: 1,
  borderColor: "#e9ecef",
  borderRadius: 10,
  backgroundColor: "#f8f9fa",
},

customerSearchInput: {
  flex: 1,
  paddingVertical: 11,
  paddingHorizontal: 10,
  fontSize: 15,
  color: "#2c3e50",
  fontFamily: "System",
},

customerSearchClearButton: {
  padding: 4,
},
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40,
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
  closeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 36,
    height: 36,
    borderRadius: 18,
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
  // STATS BAR
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 24,
    marginTop: -16,
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
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4,
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    fontFamily: 'System',
  },
  statDivider: {
    width: 1,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 10,
  },
  // SECTION HEADERS
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
    marginHorizontal: 24,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginLeft: 8,
    fontFamily: 'System',
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1f9c8b",
  },
  refreshButtonText: {
    fontSize: 14,
    color: "#1f9c8b",
    fontWeight: "600",
    marginLeft: 6,
    fontFamily: 'System',
  },
  selectedDateText: {
    fontSize: 14,
    color: "#1f9c8b",
    fontWeight: "600",
    backgroundColor: "#e9f7f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontFamily: 'System',
  },
  serviceTypeBadge: {
    fontSize: 14,
    color: "#1f9c8b",
    fontWeight: "600",
    backgroundColor: "#e9f7f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontFamily: 'System',
  },
  appointmentCount: {
    fontSize: 14,
    color: "#1f9c8b",
    fontWeight: "600",
    backgroundColor: "#e9f7f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontFamily: 'System',
  },
  customersCount: {
    fontSize: 14,
    color: "#1f9c8b",
    fontWeight: "600",
    backgroundColor: "#e9f7f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontFamily: 'System',
  },
  // TECHNICIAN GRID
  techGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  techCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: "1%",
    marginBottom: 12,
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
  techCardSelected: {
    backgroundColor: "#e0f7fa",
    borderColor: "#1f9c8b",
    borderWidth: 2,
  },
  techCardHeader: {
    position: "relative",
    marginBottom: 12,
  },
  techAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1f9c8b",
    justifyContent: "center",
    alignItems: "center",
  },
  techAvatarSelected: {
    backgroundColor: "#1f9c8b",
  },
  techSelectedBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#1f9c8b",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  techName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 4,
    fontFamily: 'System',
  },
  techNameSelected: {
    color: "#1f9c8b",
  },
  techUsername: {
    fontSize: 12,
    color: "#666",
    fontFamily: 'System',
  },
  // DATE & TIME GRID
  datetimeGrid: {
    flexDirection: "column", // Changed from "row" to "column" for vertical stacking
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
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
    // SERVICE SELECTOR
  serviceSelector: {
    backgroundColor: "#fff",
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
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
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 4,
    fontFamily: 'System',
  },
  serviceDescription: {
    fontSize: 13,
    color: "#666",
    fontFamily: 'System',
  },
  // NESTED SELECTIONS
  nestedSection: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  subtypeSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  subtypeContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  subtypeLabel: {
    fontSize: 15,
    color: "#333",
    fontStyle: "italic",
    fontFamily: 'System',
    marginRight: 8,
  },
  subtypeLabelSelected: {
    color: "#333",
    fontWeight: "500",
    fontStyle: "normal",
  },
  otherPestContainer: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  otherPestLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    fontFamily: 'System',
  },
  otherPestInput: {
    backgroundColor: "#f7f8fa",
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    fontFamily: 'System',
  },
  // DETAILS INPUTS
  detailsContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
    fontFamily: 'System',
  },
  detailsInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 8,
    padding: 16,
    fontSize: 15,
    color: "#333",
    minHeight: 100,
    textAlignVertical: "top",
    fontFamily: 'System',
  },
  formDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#f9f9f9',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownOptionsContainer: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownOptionSelected: {
    backgroundColor: '#f0f9ff',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  dropdownOptionTextSelected: {
    color: '#1f9c8b',
    fontWeight: '500',
  },
  // APPOINTMENTS
  appointmentsList: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  appointmentCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
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
  appointmentCardCompletedOrCancelled: {
    opacity: 0.6,
    backgroundColor: '#f8f9fa', 
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
  appointmentTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  appointmentTime: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f9c8b",
    marginLeft: 8,
    fontFamily: 'System',
  },
  appointmentCustomer: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 12,
    fontFamily: 'System',
  },
  serviceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  serviceBadgeText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 6,
    fontFamily: 'System',
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  completedText: {
    fontSize: 12,
    color: "#1f9c8b",
    fontWeight: "600",
    marginLeft: 4,
    fontFamily: 'System',
  },
  removeButton: {
    padding: 6,
  },
  // CUSTOMERS GRID
  customersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  customerInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customerCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: "1%",
    marginBottom: 12,
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
  customerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1f9c8b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  customerAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  customerInfo: {
    flex: 1,
  },
  customerInfoText: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  customerId: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
    fontFamily: 'System',
  },
  customerRequestType: {
    fontSize: 13,
    color: '#666',
  },
  // EMPTY STATES
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    marginBottom: 16,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    fontFamily: 'System',
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    fontFamily: 'System',
    lineHeight: 22,
  },
  emptyAppointments: {
    alignItems: "center",
    paddingVertical: 40,
    marginBottom: 16,
  },
  // FOOTER
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 30,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  footerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
    fontFamily: 'System',
  },
  footerSubtext: {
    fontSize: 14,
    color: "#999",
    marginBottom: 8,
    fontFamily: 'System',
  },
  footerCopyright: {
    fontSize: 11,
    color: "#aaa",
    fontFamily: 'System',
  },
  // LOADING
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
  // MODALS
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#0008",
    padding: 20,
  },
  appointmentModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  appointmentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  appointmentModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appointmentModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  appointmentModalIcon: {
    marginRight: 8,
  },
  appointmentCloseButton: {
    padding: 5,
  },
  appointmentModalContent: {
    paddingHorizontal: 20,
  },
  appointmentModalScrollContent: {
    paddingBottom: 30,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    maxHeight: "80%",
    maxWidth: 500,
    alignSelf: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2c3e50",
    fontFamily: 'System',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  modalItemSelected: {
    backgroundColor: "#f0f9f8",
    borderColor: "#1f9c8b",
  },
  modalItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalItemContent: {
    flex: 1,
    marginLeft: 16,
  },
  modalItemLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2c3e50",
    fontFamily: 'System',
  },
  modalItemLabelSelected: {
    color: "#1f9c8b",
    fontWeight: "600",
  },
  modalItemDescription: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
    fontFamily: 'System',
  },
  cancelledBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fdecea",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  cancelledText: {
    fontSize: 12,
    color: "#F44336",
    fontWeight: "600",
    marginLeft: 4,
  },
  editButton: {
    padding: 6,
    borderRadius: 6,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  editModalContent: {
    marginBottom: 20,
  },
  editDetailsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 10,
  },
  editDetailsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  editHelpText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  editModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  editModalContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: '85%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  editModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  editModalIcon: {
    marginRight: 8,
  },
  editModalCloseButton: {
    padding: 5,
  },
  editModalContent: {
    flex: 1,
  },
  editModalScrollContent: {
    paddingBottom: 20,
  },
  editModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  // Modal buttons
  appointmentModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelActionButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelActionButtonText: {
    color: '#495057',
    fontWeight: '500',
  },
  primaryActionButton: {
    backgroundColor: '#1f9c8b',
  },
  primaryActionButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  disabledActionButton: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  loadingModalContent: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 15,
    color: '#666',
    fontSize: 14,
  },  
  // Form styles (reuse existing styles from your create modal)
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
    fontFamily: 'System',
    textAlign: 'left', // Make sure this exists
    alignSelf: 'flex-start', // Add this for left alignment
  },
  requiredStar: {
    color: "#F44336",
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
  },
  inputIcon: {
    marginRight: 10,
  },
  formInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  formTextArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
  },
  formGroup: {
    marginBottom: 16,
    marginHorizontal: 24, // Add this to match CustomerRequestScreen spacing
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  serviceOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  preferencesCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  preferencesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  preferencesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  preferencesContent: {
    gap: 8,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  preferenceText: {
    fontSize: 13,
    color: '#495057',
  },
  readOnlyDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },

  // Technician selection
  noTechniciansContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
    gap: 10,
  },

  noTechniciansText: {
    fontSize: 13,
    color: '#856404',
  },

  techniciansList: {
    marginHorizontal: -5,
  },

  techniciansListContent: {
    paddingHorizontal: 5,
    paddingVertical: 5,
  },

  technicianOption: {
    marginHorizontal: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },

  technicianOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1f9c8b',
  },

  technicianOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  technicianAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },

  technicianAvatarSelected: {
    backgroundColor: '#1f9c8b',
    borderColor: '#1f9c8b',
  },

  technicianName: {
    fontSize: 13,
    color: '#495057',
    maxWidth: 100,
  },

  technicianNameSelected: {
    color: '#1f9c8b',
    fontWeight: '500',
  },

  // Time picker styles (if not already existing)

  timeOptionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },

  selectedTimeContainer: {
    alignItems: 'center',
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },

  selectedTimeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },

  selectedTimeValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f9c8b',
  },

  timeDoneButton: {
    backgroundColor: '#1f9c8b',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  timeDoneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
dateTimeButtonContent: {
  flexDirection: "row",
  alignItems: "center",
  padding: 16,
},
dateTimeTextContainer: {
  flex: 1,
},
dateTimeIcon: {
  width: 40,
  height: 40,
  borderRadius: 10,
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12,
},
timePickerContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginTop: 10,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',  // This centers the picker
    justifyContent: 'center', // This centers the picker
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  datePicker: {
    alignSelf: 'center', // Ensure it's centered within the container
    width: '100%', // Take full width of container
  },
  borderedInputContainer: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 8,
    paddingHorizontal: 12,
    overflow: "hidden",
    marginLeft: 0, // Ensure it starts from left
    alignSelf: 'stretch', 
    width: "100%",// Make it take full width
  },
  customerDropdownButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#fff',
  marginHorizontal: 24,
  marginBottom: 12,
  borderRadius: 12,
  padding: 16,
  borderWidth: 1,
  borderColor: '#e9ecef',
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 3,
},
customerDropdownOptions: {
  backgroundColor: '#fff',
  marginHorizontal: 24,
  marginBottom: 16,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#e9ecef',
  maxHeight: 300,
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 5,
},
customerOption: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
},
customerOptionSelected: {
  backgroundColor: '#f0f9f8',
},
customerOptionContent: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
},
customerOptionAvatar: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#1f9c8b',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 12,
},
customerOptionAvatarText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#fff',
},
customerOptionInfo: {
  flex: 1,
},
customerOptionName: {
  fontSize: 15,
  fontWeight: '500',
  color: '#2c3e50',
  marginBottom: 2,
},
customerOptionId: {
  fontSize: 11,
  color: '#666',
},
customerOptionList: {
  borderRadius: 12,
},
customerOptionEmpty: {
  padding: 20,
  alignItems: 'center',
},
customerOptionEmptyText: {
  fontSize: 14,
  color: '#999',
},
scheduleButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#1f9c8b',
  marginHorizontal: 24,
  marginBottom: 24,
  padding: 16,
  borderRadius: 12,
  gap: 8,
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
scheduleButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#fff',
},
});