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
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    scheduled: 0
  });
  const [complianceValidUntil, setComplianceValidUntil] = useState("");
  const [showCompliancePicker, setShowCompliancePicker] = useState(false);
  const [servicePrice, setServicePrice] = useState("");
  const [appointmentCategory, setAppointmentCategory] = useState("first_time");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const appointmentCategories = [
    { id: "first_time", label: "First-Time Appointment" },
    { id: "follow_up", label: "Follow-Up Visit" },
    { id: "one_time", label: "One-Time Treatment" },
    { id: "installation", label: "Installation Appointment" },
    { id: "inspection", label: "Inspection / Assessment" },
    { id: "emergency", label: "Emergency Call-Out" },
    { id: "contract_service", label: "Contract / Recurring Service" },
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

  // Define special service subtypes
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

  // Update serviceTypes with icons
  const serviceTypes = [
    { id: "myocide", label: "Myocide", description: "Standard bait station service", icon: "pest-control-rodent", color: "#1f9c8b" },
    { id: "disinfection", label: "Disinfection", description: "Disinfection service", icon: "clean-hands", color: "#1f9c8b" },
    { id: "insecticide", label: "Insecticide", description: "Insecticide treatment", icon: "pest-control", color: "#1f9c8b" },
    { id: "special", label: "Special Service", description: "Custom pest control services", icon: "star", color: "#1f9c8b" },
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

  //Temporary
  useEffect(() => {
    console.log("👨‍🔧 Edit Technician ID state:", {
      editTechnicianId,
      techniciansAvailable: technicians.length,
      selectedTechExists: editTechnicianId && technicians.some(t => t.id === editTechnicianId),
      techniciansList: technicians.map(t => ({ id: t.id, name: t.name }))
    });
  }, [editTechnicianId, technicians]);

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

  useEffect(() => {
    console.log("🔍 Technician selection state:", {
      selectedTech,
      techniciansCount: technicians.length,
      technicians: technicians.map(t => ({ id: t.id, name: t.name })),
      isSelectedTechValid: selectedTech && technicians.some(t => t.id === selectedTech)
    });
  }, [selectedTech, technicians]);

  function isUUID(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  async function loadInitialData() {
    setLoading(true);
    try {
      console.log("Loading schedule data...");

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
            email: c.email
          }))
        : [];
      
      setCustomers(formattedCustomers);
      
    } catch (error) {
      console.error("Failed to load initial data:", error);
      Alert.alert("Error", "Failed to load schedule data");
    } finally {
      setLoading(false);
    }
  }

  async function loadTechnicians() {
    try {
      console.log("🔍 Fetching technicians from API...");
      const techResult = await apiService.getTechnicians();
      
      console.log("📊 Raw technicians API response:", {
        type: typeof techResult,
        isArray: Array.isArray(techResult),
        length: Array.isArray(techResult) ? techResult.length : 'N/A',
        data: techResult
      });
      
      let techsList = [];
      if (Array.isArray(techResult)) {
        techsList = techResult.map(tech => {
          console.log("📋 Processing technician item:", tech);
          
          // Handle different ID field names
          const id = tech.id || tech.technicianId || tech.userId;
          const name = `${tech.first_name || tech.firstName || ''} ${tech.last_name || tech.lastName || ''}`.trim() || 
                      tech.name || tech.username || 'Unknown';
          
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
        console.log("📦 Technicians response is an object, checking for data property...");
        
        if (techResult.success !== false && Array.isArray(techResult.technicians)) {
          techsList = techResult.technicians.map(tech => ({
            id: tech.id || tech.technicianId,
            name: `${tech.first_name || tech.firstName || ''} ${tech.last_name || tech.lastName || ''}`.trim() || 
                  tech.username || 'Unknown',
            firstName: tech.first_name || tech.firstName,
            lastName: tech.last_name || tech.lastName,
            username: tech.username
          }));
        } else if (Array.isArray(techResult.data)) {
          techsList = techResult.data.map(tech => ({
            id: tech.id || tech.technicianId,
            name: `${tech.first_name || tech.firstName || ''} ${tech.last_name || tech.lastName || ''}`.trim() || 
                  tech.username || 'Unknown',
            firstName: tech.first_name || tech.firstName,
            lastName: tech.last_name || tech.lastName,
            username: tech.username
          }));
        }
      }
      
      console.log("✅ Processed technicians list:", techsList.map(t => ({
        id: t.id,
        name: t.name,
        type: typeof t.id,
        idLength: t.id?.length
      })));
      
      setTechnicians(techsList);
      
      // Auto-select first technician if none selected
      if (techsList.length > 0 && !selectedTech) {
        setSelectedTech(techsList[0].id);
      }
      
    } catch (error) {
      console.error("❌ Failed to load technicians:", error);
      Alert.alert("Error", "Failed to load technicians");
      setTechnicians([]);
    }
  }

  // Load schedule and calculate stats
  async function loadAppointments() {
    const dateStr = selectedDate.toISOString().split("T")[0];

    console.log("🔍 Loading appointments for:", {
      date: dateStr,
      technician: selectedTech
    });

    try {
      const data = await apiService.getAppointments({
        dateFrom: dateStr,
        dateTo: dateStr,
        technicianId: selectedTech
      });

      console.log("📊 Appointments loaded:", {
        count: data.length,
        data: data.map(d => ({
          id: d.id,
          date: d.date,
          time: d.time,
          status: d.status
        }))
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
      Alert.alert("Error", "Failed to load appointments");
    }
  }

  useEffect(() => {
    if (initialCustomerId) {
      console.log("📌 Preselected customer for scheduling:", initialCustomerId);
    }
  }, [initialCustomerId]);

  async function addCustomerToSchedule(customerId) {
    console.log("➕ Adding customer to schedule:", {
      customerId,
      selectedTech,
      technicians,
      isTechSelected: !!selectedTech
    });

    customerId = String(customerId);

    if (!customerId || customerId === "undefined") {
      console.error("Invalid customerId:", customerId);
      return Alert.alert("Error", "Invalid customer selected");
    }

    if (!selectedTech) {
      console.error("No technician selected:", { selectedTech, technicians });
      Alert.alert("Error", "Please select a technician first");
      return;
    }

    const techExists = technicians.some(t => t.id === selectedTech);
    if (!techExists) {
      console.error("Selected technician not found:", { selectedTech, technicians });
      Alert.alert("Error", "Selected technician not found. Please select a valid technician.");
      return;
    }

    if (!time.trim()) return Alert.alert("Error", "Please enter appointment time");
    
    // 🚨 CRITICAL FIX: Require price for ALL service types
    if (!servicePrice || isNaN(servicePrice) || Number(servicePrice) <= 0) {
      return Alert.alert("Invalid Price", "Please enter a valid service price (greater than 0).");
    }
    
    if (!serviceType) return Alert.alert("Error", "Please select a service type");

    if (serviceType === "myocide" && !complianceValidUntil) {
      Alert.alert(
        "Missing compliance date",
        "Compliance valid-until date is required for Myocide services."
      );
      return;
    }

    // IMPORTANT: For insecticide, we should use the insecticideDetails state
    if (serviceType === "insecticide" && !insecticideDetails.trim()) {
      return Alert.alert("Required", "Please provide details about the insecticide treatment");
    }
    
    if (serviceType === "disinfection" && !disinfectionDetails.trim()) {
      return Alert.alert("Required", "Please provide details about the disinfection treatment");
    }
    
    if (serviceType === "special" && !specialServiceSubtype) {
      return Alert.alert("Required", "Please select a specific service type for Special Service");
    }
    
    if (serviceType === "special" && specialServiceSubtype === "other" && !otherPestName.trim()) {
      return Alert.alert("Required", "Please type the name of the pest for 'Other' service");
    }

    if (!/^\d{2}:\d{2}$/.test(time.trim())) {
      return Alert.alert("Invalid Format", "Please use HH:MM format (e.g., 09:30 or 14:00)");
    }

    const [hours, minutes] = time.trim().split(':').map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return Alert.alert("Invalid Time", "Hours must be 00-23, minutes must be 00-59");
    }

    const dayKey = selectedDate.toISOString().split("T")[0];
    
    const existingAppointment = appointments.find(
      a =>
        a.technicianId === selectedTech &&
        a.date === dayKey &&
        a.time === time
    );

    
    if (existingAppointment) {
      return Alert.alert("Time Slot Unavailable", "This time slot is already booked for the selected technician");
    }

    try {
      const dayKey = selectedDate.toISOString().split("T")[0];

      const isUuidCustomer = isUUID(customerId);

      console.log("🔍 DEBUG 1 - Price check in AdminTechSchedule:", {
        servicePrice: servicePrice,
        priceType: typeof servicePrice,
        isNumber: !isNaN(servicePrice),
        isEmpty: !servicePrice || servicePrice.trim() === ''
      });

      // Prepare the payload
      const payload = {
        technicianId: selectedTech,
        customerId: isUuidCustomer ? customerId : null,
        legacyCustomerKey: !isUuidCustomer ? customerId : null,
        appointmentDate: dayKey,
        appointmentTime: time.trim(),
        serviceType,
        appointmentCategory,
        servicePrice: Number(servicePrice),
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
        payload.otherPestName = "Myocide Service";
      }


      console.log("📤 Creating disinfection appointment with details:", {
        disinfectionDetails: disinfectionDetails.trim(),
        hasDetails: !!disinfectionDetails.trim(),
        payload: payload
      });

      console.log("🔍 DEBUG - Creating appointment with price:", {
        servicePrice: Number(servicePrice),
        servicePriceType: typeof servicePrice,
        servicePriceValue: servicePrice,
        payload: payload
      });

      console.log("🔍 DEBUG 2 - Payload being sent:", JSON.stringify(payload, null, 2));

  
      const res = await apiService.createAppointment(payload);
      
      console.log("🔍 DEBUG 3 - Response from API:", res);

      console.log("🔍 DEBUG - Appointment creation response:", {
        success: res?.success,
        appointmentId: res?.data?.id,
        returnedPrice: res?.data?.service_price
      });

      if (!res?.success) {
        return Alert.alert("Error", res.error || "Failed to create appointment");
      }

      await loadAppointments();
      Alert.alert("Success", "Appointment created");
      
      // Reset all fields
      setTime("");
      setInsecticideDetails("");
      setDisinfectionDetails("");
      setSpecialServiceSubtype(null);
      setOtherPestName("");
      
    } catch (err) {
      console.error("Error creating appointment:", err);
      Alert.alert("Error", err.message || "Failed to create appointment");
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
      
      console.log("🔄 Updating appointment details:", { appointmentId, payload });
      
      const result = await apiService.updateAppointment(appointmentId, payload);
      
      if (result?.success) {
        await loadAppointments();
        Alert.alert("Success", "Treatment details updated");
        return true;
      } else {
        Alert.alert("Error", result?.error || "Failed to update details");
        return false;
      }
    } catch (err) {
      console.error("Update details error:", err);
      Alert.alert("Error", "Failed to update treatment details");
      return false;
    }
  }

  async function removeCustomer(appointmentId) {
    Alert.alert(
      "Remove Appointment",
      "Are you sure you want to remove this appointment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const appointment = appointments.find(a => a.id === appointmentId);
              
              if (appointment && appointment.status === 'completed') {
                Alert.alert(
                  "Cannot Remove",
                  "This appointment has already been completed and cannot be removed."
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
                
                Alert.alert("Success", "Appointment removed successfully");
              } else {
                Alert.alert("Error", result?.error || "Failed to delete appointment");
              }
            } catch (err) {
              console.error("Delete appointment error:", err);
              Alert.alert("Error", "Failed to delete appointment");
            }
          }
        }
      ]
    );
  }

  async function cancelAppointment(appointmentId) {
    Alert.alert(
      "Cancel Appointment",
      "This appointment will be marked as cancelled but kept for records. Continue?",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Appointment",
          style: "destructive",
          onPress: async () => {
            try {
              const appointment = appointments.find(a => a.id === appointmentId);

              if (!appointment) return;

              if (appointment.status === "completed") {
                Alert.alert(
                  "Not Allowed",
                  "Completed appointments cannot be cancelled."
                );
                return;
              }

              const res = await apiService.cancelAppointment(appointmentId);

              if (!res?.success) {
                return Alert.alert("Error", res?.error || "Failed to cancel appointment");
              }

              await loadAppointments();
              
              // 🔥 Call the callback to notify parent/calendar
              if (onAppointmentChanged) {
                onAppointmentChanged();
              }
              
              Alert.alert("Cancelled", "Appointment has been cancelled.");
            } catch (err) {
              console.error("Cancel appointment error:", err);
              Alert.alert("Error", "Failed to cancel appointment");
            }
          }
        }
      ]
    );
  }

  function formatAppointmentTime(timeString) {
    console.log("🔍 formatAppointmentTime called with:", {
      timeString,
      type: typeof timeString,
      isString: typeof timeString === 'string',
      isUndefined: timeString === undefined
    });
    
    if (!timeString || typeof timeString !== 'string') {
      console.warn("⚠️ Invalid time string:", timeString);
      return "No time";
    }
    
    // Extract just HH:MM from formats like "12:10:00" or "12:10:00.000Z"
    const match = timeString.match(/^(\d{1,2}):(\d{2})/);
    
    if (match) {
      const hours = match[1];
      const minutes = match[2];
      const formatted = `${hours}:${minutes}`; // Returns "09:10"
      console.log("✅ Formatted time:", formatted);
      return formatted;
    }
    
    console.warn("⚠️ Could not parse time string:", timeString);
    return timeString;
  }

  function getDayAssignments() {
    console.log("📋 Filtering appointments for technician:", selectedTech);
    console.log("📋 Total appointments available:", appointments.length);
    
    const filtered = appointments
      .filter(a => {
        const matches = a.technicianId === selectedTech;
        console.log(`Appointment ${a.id}: tech=${a.technicianId}, matches=${matches}`);
        return matches;
      })
      .sort((a, b) => a.time.localeCompare(b.time));
      
    console.log("✅ Found", filtered.length, "appointments for selected tech");
    return filtered;
  }

  function getServiceTypeLabel(typeId, subtypeId = null, otherPest = null) {
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
  }

  function handleEditAppointment(appointment) {
    console.log("🔍 Editing appointment - FULL OBJECT:", JSON.stringify(appointment, null, 2));
    
    setEditingAppointment(appointment);
    
    // Populate all fields from the appointment
    setEditServiceType(appointment.serviceType || 'myocide');
    setEditSpecialServiceSubtype(appointment.specialServiceSubtype || appointment.special_service_subtype || null);
    setEditOtherPestName(appointment.otherPestName || appointment.other_pest_name || '');
    setEditInsecticideDetails(appointment.insecticideDetails || appointment.insecticide_details || '');
    setEditDisinfectionDetails(appointment.disinfection_details || '');
    setEditServicePrice(appointment.servicePrice?.toString() || appointment.service_price?.toString() || '');
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
      console.log("✅ Found technicianId from appointment.technicianId:", technicianId);
    } else if (appointment.technician_id) {
      technicianId = appointment.technician_id;
      console.log("✅ Found technicianId from appointment.technician_id:", technicianId);
    } else if (appointment.technician) {
      technicianId = appointment.technician;
      console.log("✅ Found technicianId from appointment.technician:", technicianId);
    } else if (appointment.technician_id) {
      technicianId = appointment.technician_id;
      console.log("✅ Found technicianId from appointment.technician_id:", technicianId);
    }
    
    // If still null, try to find it from the appointments array
    if (!technicianId && appointments.length > 0) {
      const fullAppointment = appointments.find(a => a.id === appointment.id);
      if (fullAppointment) {
        if (fullAppointment.technicianId) technicianId = fullAppointment.technicianId;
        else if (fullAppointment.technician_id) technicianId = fullAppointment.technician_id;
        else if (fullAppointment.technician) technicianId = fullAppointment.technician;
        
        if (technicianId) {
          console.log("✅ Found technicianId from appointments array:", technicianId);
        }
      }
    }
    
    console.log("👨‍🔧 Final technician ID to set:", technicianId);
    setEditTechnicianId(technicianId);
    
    setShowEditModal(true);
  }

  async function saveEditedDetails() {
    if (!editingAppointment || processing) return;
    
    setProcessing(true);
    
    const appointmentIdToUpdate = editingAppointment?.id;
    
    if (!appointmentIdToUpdate) {
      console.error("❌ ERROR: No appointment ID to update!");
      Alert.alert("Error", "Cannot update: Appointment ID is missing");
      setProcessing(false);
      return;
    }
    
    try {
      // Validate required fields
      if (!editServicePrice || isNaN(editServicePrice) || Number(editServicePrice) <= 0) {
        Alert.alert("Invalid Price", "Please enter a valid service price (greater than 0).");
        setProcessing(false);
        return;
      }
      
      if (!editTime.trim()) {
        Alert.alert("Error", "Please select appointment time");
        setProcessing(false);
        return;
      }
      
      if (!editTechnicianId) {
        Alert.alert("Error", "Please select a technician");
        setProcessing(false);
        return;
      }
      
      if (editServiceType === "myocide" && !editComplianceValidUntil) {
        Alert.alert("Missing compliance date", "Compliance valid-until date is required for Myocide services.");
        setProcessing(false);
        return;
      }
      
      if (editServiceType === "special" && !editSpecialServiceSubtype) {
        Alert.alert("Required", "Please select a specific service type for Special Service");
        setProcessing(false);
        return;
      }
      
      if (editServiceType === "special" && editSpecialServiceSubtype === "other" && !editOtherPestName.trim()) {
        Alert.alert("Required", "Please type the name of the pest for 'Other' service");
        setProcessing(false);
        return;
      }
      
      // Build the update payload
      const payload = {
        servicePrice: Number(editServicePrice),
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
        payload.otherPestName = "Myocide Service";
      }
      
      // DEBUG: Detailed log of what's being sent
      console.log("📤 SENDING UPDATE PAYLOAD:", {
        appointmentId: appointmentIdToUpdate,
        payload: payload,
        originalAppointment: {
          id: editingAppointment.id,
          technicianId: editingAppointment.technicianId,
          technician_id: editingAppointment.technician_id
        },
        newTechnicianId: editTechnicianId,
        technicians: technicians.map(t => ({ id: t.id, name: t.name }))
      });
      
      const result = await apiService.updateAppointment(appointmentIdToUpdate, payload);
      
      console.log("📥 UPDATE RESPONSE:", result);
      
      if (result?.success) {
        await loadAppointments();
        
        // Verify the change was applied
        const updatedAppointments = await apiService.getAppointments({
          dateFrom: selectedDate.toISOString().split("T")[0],
          dateTo: selectedDate.toISOString().split("T")[0],
          technicianId: selectedTech
        });
        
        const updatedAppointment = updatedAppointments.find(a => a.id === appointmentIdToUpdate);
        console.log("✅ VERIFICATION - Updated appointment:", {
          id: updatedAppointment?.id,
          technicianId: updatedAppointment?.technicianId,
          technician_id: updatedAppointment?.technician_id,
          expectedTechnicianId: editTechnicianId,
          match: updatedAppointment?.technicianId === editTechnicianId || updatedAppointment?.technician_id === editTechnicianId
        });
        
        Alert.alert("Success", "Appointment updated successfully");
        closeEditModal();
      } else {
        console.error("❌ Update failed:", result?.error);
        Alert.alert("Error", result?.error || "Failed to update appointment");
      }
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", "Failed to save changes");
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
    
    console.log("🕒 Formatted time:", formattedTime, "from:", selectedTime);
    
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
  const selectedTechnicianName = technicians.find(t => t.id === selectedTech)?.name || "Select Technician";

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f9c8b" />
          <Text style={styles.loadingText}>Loading Schedule...</Text>
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
                <Text style={styles.adminBadgeText}>SCHEDULE</Text>
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
            <Text style={styles.welcomeText}>Schedule Management</Text>
            <Text style={styles.title}>Plan Technician Visits</Text>
            <Text style={styles.subtitle}>
              Assign and manage daily appointments for technicians
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
            <Text style={styles.statLabel}>Total Visits</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialIcons name="check-circle" size={18} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialIcons name="pending" size={18} color="#1f9c8b" />
            </View>
            <Text style={styles.statNumber}>{stats.scheduled}</Text>
            <Text style={styles.statLabel}>Scheduled</Text>
          </View>
        </View>

        {/* TECHNICIAN SELECTION */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="engineering" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>Select Technician</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadInitialData}
            activeOpacity={0.7}
          >
            <MaterialIcons name="refresh" size={18} color="#1f9c8b" />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {technicians.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="person-off" size={60} color="#ddd" />
            </View>
            <Text style={styles.emptyStateTitle}>No Technicians</Text>
            <Text style={styles.emptyStateText}>
              Add technicians first from the Admin Dashboard
            </Text>
          </View>
        ) : (
          <View style={styles.techGrid}>
            {technicians.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.techCard,
                  selectedTech === item.id && styles.techCardSelected
                ]}
                onPress={() => setSelectedTech(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.techCardHeader}>
                  <View style={[
                    styles.techAvatar,
                    selectedTech === item.id && styles.techAvatarSelected
                  ]}>
                    <MaterialIcons name="person" size={22} color="#fff" />
                  </View>
                  {selectedTech === item.id && (
                    <View style={styles.techSelectedBadge}>
                      <MaterialIcons name="check-circle" size={14} color="#fff" />
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.techName,
                  selectedTech === item.id && styles.techNameSelected
                ]}>
                  {item.name}
                </Text>
                <Text style={styles.techUsername}>@{item.username}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}  

        {/* COMPLIANCE VALIDITY DATE */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MaterialIcons name="verified" size={20} color="#2c3e50" />
              <Text style={styles.sectionTitle}>Compliance Validity</Text>
            </View>
            {complianceValidUntil ? (
              <Text style={styles.selectedDateText}>
                {complianceValidUntil}
              </Text>
            ) : (
              <Text style={[styles.selectedDateText, { opacity: 0.5 }]}>
                Required for Myocide
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
                <Text style={styles.dateTimeLabel}>Valid Until</Text>
                <Text style={styles.dateTimeValue}>
                  {complianceValidUntil || "Select compliance date"}
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
            <Text style={styles.sectionTitle}>Date & Time</Text>
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
                <Text style={styles.dateTimeLabel}>Selected Date</Text>
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
                <Text style={styles.dateTimeLabel}>Appointment Time</Text>
                <Text style={styles.dateTimeValue}>
                  {time ? formatTime(time) : 'Select time'}
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
            <Text style={styles.sectionTitle}>Service Type</Text>
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
                    : "Select specific service type"}
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
                <Text style={styles.otherPestLabel}>Specify Pest Name</Text>
                <TextInput
                  style={styles.otherPestInput}
                  placeholder="e.g., Ants, Spiders, Cockroaches, etc."
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
            <Text style={styles.detailsLabel}>Treatment Details</Text>
            <TextInput
              style={styles.detailsInput}
              placeholder="Describe the insecticide requirements..."
              placeholderTextColor="#999"
              value={insecticideDetails}
              onChangeText={setInsecticideDetails}
            />
          </View>
        )}

        {serviceType === "disinfection" && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsLabel}>Treatment Details</Text>
            <TextInput
              style={styles.detailsInput}
              placeholder="Describe the disinfection requirements..."
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
            <Text style={styles.sectionTitle}>Appointment Category</Text>
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
              Defines billing and visit purpose
            </Text>
          </View>
          <MaterialIcons name="expand-more" size={24} color="#666" />
        </TouchableOpacity>

        {/* SERVICE PRICE */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="euro" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>Service Price</Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <TextInput
            style={styles.detailsInput}
            placeholder="Enter service price in Euro (e.g. 80)"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={servicePrice}
            onChangeText={setServicePrice}
          />
        </View>

        {/* TODAY'S APPOINTMENTS */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="schedule" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>
              Appointments for {selectedDate.toISOString().split("T")[0]}
            </Text>
          </View>
          <Text style={styles.appointmentCount}>
            {getDayAssignments().length} scheduled
          </Text>
        </View>

        {getDayAssignments().length === 0 ? (
          <View style={styles.emptyAppointments}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="event-busy" size={60} color="#ddd" />
            </View>
            <Text style={styles.emptyStateTitle}>No Appointments</Text>
            <Text style={styles.emptyStateText}>
              Add customers below to create appointments
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
                      {!isCompletedOrCancelled && (item.serviceType === 'insecticide' || item.serviceType === 'disinfection' || item.serviceType === 'special' || item.serviceType === 'myocide') && (
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
                    (item.legacyCustomerKey ? `Customer ${item.legacyCustomerKey}` : 
                      item.customerId ? `Customer ID: ${item.customerId}` : 
                      'Unknown Customer')}
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
                      <Text style={styles.completedText}>Completed</Text>
                    </View>
                  )}
                  {item.status === "cancelled" && (
                    <View style={styles.cancelledBadge}>
                      <MaterialIcons name="cancel" size={12} color="#F44336" />
                      <Text style={styles.cancelledText}>Cancelled</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ADD CUSTOMER */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="person-add" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>Add Customer Appointment</Text>
          </View>
          <Text style={styles.customersCount}>
            {customers.length} available
          </Text>
        </View>

        {customers.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="people-outline" size={60} color="#ddd" />
            </View>
            <Text style={styles.emptyStateTitle}>No Customers</Text>
            <Text style={styles.emptyStateText}>
              Add customers first from the Admin Dashboard
            </Text>
          </View>
        ) : (
          <View style={styles.customersGrid}>
            {customers.slice(0, 6).map((item) => (
              <TouchableOpacity
                key={item.customerId} 
                style={styles.customerCard}
                onPress={() => addCustomerToSchedule(item.customerId)}
                activeOpacity={0.7}
              >
                <View style={styles.customerAvatar}>
                  <Text style={styles.customerAvatarText}>
                    {item.customerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName} numberOfLines={1}>
                    {item.customerName}
                  </Text>
                  <Text style={styles.customerId}>ID: {item.customerId}</Text> 
                </View>
                <MaterialIcons name="add-circle" size={24} color="#1f9c8b" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Technician's Schedule Management System</Text>
          <Text style={styles.footerSubtext}>
              Version 1.0 • Last updated: {new Date().toLocaleDateString()}
          </Text>
          <Text style={styles.footerCopyright}>
              © {new Date().getFullYear()} Pest-Free. All rights reserved.
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
              <Text style={styles.modalTitle}>Select Service Type</Text>
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
              <Text style={styles.modalTitle}>Select Service Type</Text>
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
              <Text style={styles.modalTitle}>Select Appointment Category</Text>
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
                  Edit Appointment
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
                        return customer?.customerName || editingAppointment.customer_name || 'Unknown Customer';
                      })()}
                    </Text>
                    <Text style={styles.customerRequestType}>
                      Editing existing appointment
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
                      value={editServicePrice}
                      onChangeText={setEditServicePrice}
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
                    onPress={() => setShowEditCategoryDropdown(!showEditCategoryDropdown)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dropdownContent}>
                      <MaterialIcons name="category" size={20} color="#666" />
                      <Text style={styles.dropdownText}>
                        {appointmentCategories.find(c => c.id === editAppointmentCategory)?.label || 'Select Category'}
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

                {/* COMPLIANCE - Required for Myocide, Optional for others */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Compliance Valid Until {editServiceType === 'myocide' && <Text style={styles.requiredStar}>*</Text>}
                  </Text>
                  <View style={styles.inputWithIcon}>
                    <MaterialIcons name="verified" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.formInput}
                      placeholder={editServiceType === 'myocide' ? "YYYY-MM-DD (Required)" : "YYYY-MM-DD (Optional)"}
                      value={editComplianceValidUntil}
                      onChangeText={setEditComplianceValidUntil}
                      placeholderTextColor="#999"
                    />
                  </View>
                  <Text style={styles.helpText}>
                    {editServiceType === 'myocide' 
                      ? 'Required for Myocide service compliance certificate' 
                      : 'Optional: Only needed if this service affects compliance'}
                  </Text>
                </View>

                {/* TIME SELECTION - In Edit Appointment Modal */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Time <Text style={styles.requiredStar}>*</Text>
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
                        <Text style={styles.dateTimeLabel}>Appointment Time</Text>
                        <Text style={styles.dateTimeValue}>
                          {editTime ? formatTime(editTime) : 'Select time'}
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
                    Technician <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  {technicians.length === 0 ? (
                    <View style={styles.noTechniciansContainer}>
                      <MaterialIcons name="warning" size={20} color="#F44336" />
                      <Text style={styles.noTechniciansText}>
                        No technicians available.
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
                        const techName = `${tech.firstName || tech.first_name || ''} ${tech.lastName || tech.last_name || ''}`.trim() || tech.username || 'Unknown';
                        
                        // Debug log for each technician
                        console.log("👨‍🔧 Tech option:", {
                          index,
                          techId,
                          techName,
                          editTechnicianId,
                          matches: editTechnicianId === techId
                        });
                        
                        return (
                          <TouchableOpacity
                            key={techId || tech.username || `tech-${index}`}
                            style={[
                              styles.technicianOption,
                              editTechnicianId === techId && 
                              styles.technicianOptionSelected
                            ]}
                            onPress={() => {
                              console.log("👨‍🔧 Selecting technician:", { techId, techName });
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
                  <Text style={styles.formLabel}>Service Type</Text>
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
                        {serviceTypes.find(s => s.id === editServiceType)?.description || 'Service type cannot be changed'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* SPECIAL SERVICE SUBTYPE */}
                {editServiceType === 'special' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Specific Service Type <Text style={styles.requiredStar}>*</Text></Text>
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
                            : 'Select specific service type'}
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
                        <Text style={styles.formLabel}>Specify Pest Name <Text style={styles.requiredStar}>*</Text></Text>
                        <View style={styles.borderedInputContainer}>
                          <TextInput
                            style={styles.formInput}
                            placeholder="e.g., Ants, Spiders, Cockroaches, etc."
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
                    <Text style={styles.formLabel}>Treatment Details <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                      style={styles.formTextArea}
                      placeholder="Describe the insecticide requirements..."
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
                    <Text style={styles.formLabel}>Treatment Details <Text style={styles.requiredStar}>*</Text></Text>
                    <TextInput
                      style={styles.formTextArea}
                      placeholder="Describe the disinfection requirements..."
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
                    <Text style={styles.preferencesTitle}>Current Appointment Details</Text>
                  </View>
                  <View style={styles.preferencesContent}>
                    <View style={styles.preferenceItem}>
                      <MaterialIcons name="event" size={16} color="#666" />
                      <Text style={styles.preferenceText}>
                        Date: {editingAppointment.date || editingAppointment.appointment_date}
                      </Text>
                    </View>
                    <View style={styles.preferenceItem}>
                      <MaterialIcons name="schedule" size={16} color="#666" />
                      <Text style={styles.preferenceText}>
                        Time: {formatAppointmentTime(editingAppointment.time || editingAppointment.appointment_time)}
                      </Text>
                    </View>
                    <View style={styles.preferenceItem}>
                      <MaterialIcons name="engineering" size={16} color="#666" />
                      <Text style={styles.preferenceText}>
                        Technician: {selectedTechnicianName}
                      </Text>
                    </View>
                  </View>
                </View>

              </ScrollView>
            ) : (
              <View style={styles.loadingModalContent}>
                <ActivityIndicator size="large" color="#1f9c8b" />
                <Text style={styles.loadingText}>Loading appointment details...</Text>
              </View>
            )}
            
            <View style={styles.appointmentModalFooter}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.cancelActionButton]}
                onPress={closeEditModal}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelActionButtonText}>Cancel</Text>
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
                    <Text style={styles.primaryActionButtonText}>Save Changes</Text>
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
});