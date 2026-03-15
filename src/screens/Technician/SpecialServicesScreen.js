// SpecialServicesScreen.js - PROFESSIONAL STYLING
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Swipeable } from 'react-native-gesture-handler';
import apiService from '../../services/apiService';
import ChemicalsDropdown from '../../components/ChemicalsDropdown';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Image } from "react-native";
import i18n from "../../services/i18n";
import * as ImagePicker from "expo-image-picker";

export default function SpecialServicesScreen({ 
  technician, 
  customer, 
  session, 
  onBack, 
  onNavigate,
  onGenerateReport 
}) {
  /* =========================
     CORE STATE
  ========================= */
  
  const [loading, setLoading] = useState(true);
  const [logId, setLogId] = useState(null);
  const [visitId, setVisitId] = useState(null);
  const [serviceStarted, setServiceStarted] = useState(false);
  const [serviceCompleted, setServiceCompleted] = useState(false);
  const [serviceType, setServiceType] = useState(null);
  const [specialSubtype, setSpecialSubtype] = useState(null);
  const [otherPestName, setOtherPestName] = useState('');
  const [storedDuration, setStoredDuration] = useState(null);
  const [serviceStartTime, setServiceStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  const [pendingImageAction, setPendingImageAction] = useState(null);
  const [selectedChemicals, setSelectedChemicals] = useState([]);
  const [notes, setNotes] = useState('');
  const [reportImages, setReportImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  /* =========================
     TREATED AREAS STATE
  ========================= */
  const [treatedAreas, setTreatedAreas] = useState([]);
  const [areaNameInput, setAreaNameInput] = useState('');

  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [activeAreaId, setActiveAreaId] = useState(null);
  const [areaNotes, setAreaNotes] = useState('');
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);

  /* =========================
     SERVICE TYPES
  ========================= */
  const mainServiceTypes = [
    { id: "myocide", label: i18n.t("serviceTypes.myocide") },
    { id: "insecticide", label: i18n.t("serviceTypes.insecticide") },
    { id: "disinfection", label: i18n.t("serviceTypes.disinfection") },
    { id: "special", label: i18n.t("serviceTypes.special") },
  ];

  const specialServiceSubtypes = [
    { id: "grass_cutworm", label: i18n.t("customer.specialSubtypes.grass_cutworm") },
    { id: "fumigation", label: i18n.t("customer.specialSubtypes.fumigation") },
    { id: "termites", label: i18n.t("customer.specialSubtypes.termites") },
    { id: "exclusion", label: i18n.t("customer.specialSubtypes.exclusion") },
    { id: "snake_repulsion", label: i18n.t("customer.specialSubtypes.snake_repulsion") },
    { id: "bird_control", label: i18n.t("customer.specialSubtypes.bird_control") },
    { id: "bed_bugs", label: i18n.t("customer.specialSubtypes.bed_bugs") },
    { id: "fleas", label: i18n.t("customer.specialSubtypes.fleas") },
    { id: "plant_protection", label: i18n.t("customer.specialSubtypes.plant_protection") },
    { id: "palm_weevil", label: i18n.t("customer.specialSubtypes.palm_weevil") },
    { id: "other", label: i18n.t("customer.specialSubtypes.other") },
  ];

  /* =========================
     HELPERS
  ========================= */
  const getStableLogId = () => {
    if (session?.visitId) return `visit_${session.visitId}`;
    const d = session?.appointmentDate || 'NA';
    const t = session?.appointmentTime || 'NA';
    const c = customer?.customerId || 'NA';
    const service = serviceType || 'special';
    return `${service}_${d}_${t}_${c}`;
  };

  const getServiceDisplayLabel = () => {
    if (!serviceType) return i18n.t("serviceTypes.special");
    
    const mainService = mainServiceTypes.find(s => s.id === serviceType);
    
    if (serviceType !== "special") {
      return mainService ? mainService.label : serviceType;
    }
    
    // For special services
    if (specialSubtype) {
      if (specialSubtype === "other") {
        // When it's "other", check if we have a custom pest name
        if (otherPestName && otherPestName.trim() !== "") {
          return `${i18n.t("serviceTypes.special")} - ${otherPestName.trim()}`;
        } else {
          return `${i18n.t("serviceTypes.special")} - ${i18n.t("customer.specialSubtypes.other")}`;
        }
      }
      
      const subtype = specialServiceSubtypes.find(s => s.id === specialSubtype);
      if (subtype) {
        return `${i18n.t("serviceTypes.special")} - ${subtype.label}`;
      } else {
        return `${i18n.t("serviceTypes.special")} - ${specialSubtype}`;
      }
    } else {
      // No subtype specified
      return i18n.t("serviceTypes.special");
    }
  };

  const getSimpleServiceLabel = () => {
    if (!serviceType) return i18n.t("technician.common.notSpecified") || "Not specified";
    
    if (serviceType === "special" && specialSubtype) {
      if (specialSubtype === "other") {
        // For simple label, return the pest name if available
        return otherPestName || i18n.t("customer.specialSubtypes.other");
      }
      
      const subtype = specialServiceSubtypes.find(s => s.id === specialSubtype);
      return subtype ? subtype.label : specialSubtype;
    }
    
    const mainService = mainServiceTypes.find(s => s.id === serviceType);
    return mainService ? mainService.label : serviceType;
  };

  const formatTime = (ms) => {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h) return `${h}${i18n.t("technician.common.hours")} ${m}${i18n.t("technician.common.minutes")} ${s}${i18n.t("technician.common.seconds")}`;
    if (m) return `${m}${i18n.t("technician.common.minutes")} ${s}${i18n.t("technician.common.seconds")}`;
    return `${s}${i18n.t("technician.common.seconds")}`;
  };

  /* =========================
     LOAD EXISTING SERVICE (EDIT MODE)
  ========================= */
  useEffect(() => {
    const load = async () => {

      try {
        // First, set service type from session
        if (session?.serviceType) {
          setServiceType(session.serviceType);
          
          // For special services, load the subtype and pest name
          if (session.serviceType === "special") {
            
            // Check all possible sources for special service data
            let foundSubtype = null;
            let foundOtherPest = null;
            
            // Priority 1: Check session object directly
            if (session.specialServiceSubtype) {
              foundSubtype = session.specialServiceSubtype;
            }
            
            if (session.otherPestName) {
              foundOtherPest = session.otherPestName;
            }
            
            // Priority 2: Check session.appointment object
            if (!foundSubtype && session.appointment?.specialServiceSubtype) {
              foundSubtype = session.appointment.specialServiceSubtype;
            }
            
            if (!foundOtherPest && session.appointment?.otherPestName) {
              foundOtherPest = session.appointment.otherPestName;
            }
            
            // Priority 3: Check session.rawAppointment - IMPORTANT: Use camelCase
            if (!foundSubtype && session.rawAppointment?.specialServiceSubtype) {
              foundSubtype = session.rawAppointment.specialServiceSubtype;
            }
            
            if (!foundOtherPest && session.rawAppointment?.otherPestName) {
              foundOtherPest = session.rawAppointment.otherPestName;
            }
            
            // Also check snake_case as fallback (though unlikely)
            if (!foundSubtype && session.rawAppointment?.special_service_subtype) {
              foundSubtype = session.rawAppointment.special_service_subtype;
            }
            
            if (!foundOtherPest && session.rawAppointment?.other_pest_name) {
              foundOtherPest = session.rawAppointment.other_pest_name;
            }
            
            // Set state with found values
            if (foundSubtype) {
              setSpecialSubtype(foundSubtype);

              if (foundSubtype === "other" && foundOtherPest) {
                // Clean up the otherPestName if needed
                const cleanedPestName = foundOtherPest.trim();
                setOtherPestName(cleanedPestName);
              } else if (foundSubtype !== "other") {
                // Clear otherPestName if not "other" subtype
                setOtherPestName('');
              }
            } else {
              // Try to fetch from database
              await fetchSpecialServiceDetailsFromDatabase();
            }
          }
        }

        // If we have a visitId, load the complete service log for EDIT MODE
        if (session?.visitId) {
          
          try {
            const res = await apiService.getServiceLogByVisitId(session.visitId);

            if (res?.success) {
              const log = res.log || res.report;
              
              if (log) {
                // Extract service subtype from the log if not already set
                // Check both snake_case and camelCase versions
                const logSubtype = log.service_subtype || log.serviceSubtype;
                if (serviceType === "special" && !specialSubtype && logSubtype) {
                  setSpecialSubtype(logSubtype);
                }
                
                // Extract other pest name from the log if not already set
                // Check both snake_case and camelCase versions
                const logOtherPest = log.other_pest_name || log.otherPestName;
                if (serviceType === "special" && specialSubtype === "other" && !otherPestName && logOtherPest) {
                  setOtherPestName(logOtherPest.trim());
                }
                
                // Extract logId from multiple sources
                const extractedLogId = 
                  log.log_id || 
                  log.logId || 
                  log.visitId || 
                  session.visitId || 
                  getStableLogId();
                
                
                setLogId(extractedLogId);
                setVisitId(extractedLogId);
                // LOAD EXISTING IMAGES
                if (log?.images && Array.isArray(log.images)) {
                  
                  // Clean and normalize image filenames
                  const cleaned = log.images
                    .map(img => {
                      if (!img) return null;
                      // Convert to string and clean
                      let v = String(img).split("?")[0].trim();
                      // Extract just the filename if it's a full URL
                      if (v.includes("/")) v = v.substring(v.lastIndexOf("/") + 1);
                      return v;
                    })
                    .filter(Boolean);
                  
                  setExistingImages(cleaned);
                }
                
                // Normalize chemicals
                const chemicalsFromLog = log.chemicalsUsed || log.chemicals_used || [];
                const normalizedChemicals = chemicalsFromLog.map(c => {
                  if (typeof c === "string") return { name: c };
                  return {
                    ...c,
                    name: c.name || c.chemicalName || c.chemical || "",
                  };
                }).filter(c => c?.name);
                
                setSelectedChemicals(normalizedChemicals);
                setNotes(log.notes || "");
                
                // Get treated areas
                const areasFromLog = log.treatedAreas || log.treated_areas || [];
                setTreatedAreas(areasFromLog);
                
                // Set service as started and completed for edit mode
                setServiceStarted(true);
                setServiceCompleted(true);
                
                // Get service start time
                const startTime = 
                  log.serviceStartTime || 
                  log.service_start_time || 
                  (log.serviceStartTime ? new Date(log.serviceStartTime).getTime() : null);
                
                setServiceStartTime(startTime);
                setElapsedTime(log.duration || 0);
                         
              } 
            }
          } catch (logError) {
            console.error("❌ Failed to load service log:", logError);
            // Don't fail the whole load if service log fails
          }
        } else if (session?.status === "completed" && !session?.visitId) {
          // Try to sync completed appointment from database
          await syncCompletedAppointmentFromDatabase();
        }

      } catch (error) {
        console.error("❌ Failed to load initial service data:", error);
        Alert.alert(
          i18n.t("technician.common.error"), 
          i18n.t("technician.specialServices.errors.saveFailed") || "Failed to load service details. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };
    
    load();
  }, [session]);

  useEffect(() => {
    if (!session?.appointmentId) return;

    let cancelled = false;

    (async () => {
      try {
        // Use getAppointments instead of getSchedule
        const appointments = await apiService.getAppointments({
          dateFrom: session?.appointmentDate,
          dateTo: session?.appointmentDate
        });
        
        if (!appointments || cancelled) return;

        // Find the matching appointment
        const appt = appointments.find(a => 
          a.id === session.appointmentId || 
          (a.customer_id === customer?.customerId &&
          a.appointment_date === session?.appointmentDate &&
          a.appointment_time === session?.appointmentTime)
        );

        if (!appt || cancelled) return;

        if (appt.status === "completed" && appt.visitId) {

          setServiceStarted(true);
          setServiceCompleted(true);
          setVisitId(appt.visitId);
          setHasGeneratedReport(false);

          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      } catch (e) {
        console.error("Failed to sync appointment from database", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.appointmentId, session?.appointmentDate, session?.appointmentTime, customer?.customerId]);

  const fetchAppointmentFromSchedule = async () => {
    try {
      // Fetch appointments directly from PostgreSQL
      const appointments = await apiService.getAppointments({
        dateFrom: session?.appointmentDate,
        dateTo: session?.appointmentDate
      });
      
      // Find the matching appointment
      const matchingAppointment = appointments.find(appt => 
        appt.customer_id === customer?.customerId &&
        appt.appointment_date === session?.appointmentDate &&
        appt.appointment_time === session?.appointmentTime &&
        appt.service_type === 'special'
      );

      if (matchingAppointment) {
        // Get special service subtype and other pest name from the database
        if (matchingAppointment.special_service_subtype) {
          setSpecialSubtype(matchingAppointment.special_service_subtype);
        }
        
        if (matchingAppointment.special_service_subtype === "other" && matchingAppointment.other_pest_name) {
          setOtherPestName(matchingAppointment.other_pest_name);
        }
      }
    } catch (error) {
      console.error("Failed to fetch appointment details:", error);
    }
  };

  const fetchSpecialServiceDetailsFromDatabase = async () => {
    try {
      if (!session?.appointmentId || !customer?.customerId) {
        return;
      }
      // Fetch appointments for this customer/date
      const appointments = await apiService.getAppointments({
        dateFrom: session?.appointmentDate,
        dateTo: session?.appointmentDate,
        technicianId: technician?.id
      });

      // Find the matching appointment - use the exact appointmentId
      const matchingAppointment = appointments.find(appt => 
        appt.id === session.appointmentId
      );
      
      if (matchingAppointment) {
        
        if (matchingAppointment.special_service_subtype) {
          setSpecialSubtype(matchingAppointment.special_service_subtype);
          
          // Make sure to set otherPestName if it exists
          if (matchingAppointment.special_service_subtype === "other" && 
              matchingAppointment.other_pest_name) {
            setOtherPestName(matchingAppointment.other_pest_name.trim());
          } else {
            // Clear it if not "other" subtype
            setOtherPestName('');
          }
        } else {
          setSpecialSubtype(null);
          setOtherPestName('');
        }
      } else {
        // Try alternative matching if needed
        const altMatch = appointments.find(appt => 
          appt.customer_id === customer?.customerId &&
          appt.appointment_date === session?.appointmentDate &&
          appt.appointment_time === session?.appointmentTime
        );
        
        if (altMatch) {
          
          if (altMatch.special_service_subtype) {
            setSpecialSubtype(altMatch.special_service_subtype);
            if (altMatch.special_service_subtype === "other" && altMatch.other_pest_name) {
              setOtherPestName(altMatch.other_pest_name.trim());
            }
          }
        }
      }
      
    } catch (error) {
      console.error("Failed to fetch special service details from database:", error);
    }
  };

  const showStartServiceAlert = () => {
    Alert.alert(
      i18n.t("technician.specialServices.alerts.startServiceRequired"),
      i18n.t("technician.specialServices.alerts.startServiceMessage"),
      [{ text: i18n.t("technician.common.ok") }]
    );
  };

  /* =========================
     TIMER
  ========================= */
  useEffect(() => {
    if (serviceStarted && !serviceCompleted && storedDuration === null) {
      timerRef.current = setInterval(() => {
        if (serviceStartTime) {
          setElapsedTime(Date.now() - serviceStartTime);
        }
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [serviceStarted, serviceCompleted, serviceStartTime, storedDuration]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!pendingImageAction) return;

    const launch = async () => {
      try {
        if (pendingImageAction === "camera") {
          const permission = await ImagePicker.requestCameraPermissionsAsync();

          if (permission.status !== "granted") {
            Alert.alert("Permission required", "Camera permission is required.");
            setPendingImageAction(null);
            return;
          }

          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.7,
          });

          if (!result.canceled) {
            setReportImages(prev => [...prev, ...result.assets]);
          }
        }

        if (pendingImageAction === "gallery") {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

          if (permission.status !== "granted") {
            Alert.alert("Permission required", "Gallery permission is required.");
            setPendingImageAction(null);
            return;
          }

          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.7,
          });

          if (!result.canceled) {
            setReportImages(prev => [...prev, ...result.assets]);
          }
        }
      } catch (err) {
        console.error("Image picker error:", err);
      } finally {
        setPendingImageAction(null);
      }
    };

    launch();
  }, [pendingImageAction]);

  /* =========================
     ACTIONS
  ========================= */
  const startService = () => {
    if (session?.status === "completed" && session?.visitId) {
      Alert.alert(
        i18n.t("technician.specialServices.alerts.editMode"),
        i18n.t("technician.specialServices.alerts.editModeMessage"),
        [
          { 
            text: i18n.t("common.cancel"), 
            style: "cancel" 
          },
          { 
            text: i18n.t("technician.specialServices.actionButtons.updateService"), 
            style: "default",
            onPress: () => {
              setServiceStarted(true);
              setServiceCompleted(true);
              
              if (!serviceStartTime) {
                setServiceStartTime(Date.now() - 3600000);
              }
              
              Alert.alert(
                i18n.t("technician.specialServices.alerts.editMode"),
                i18n.t("technician.specialServices.alerts.editModeMessage")
              );
            }
          }
        ]
      );
      return;
    }

    // Validate for special services
    if (serviceType === "special" && !specialSubtype) {
      Alert.alert(
        i18n.t("technician.common.warning") || "Service Type Incomplete",
        i18n.t("technician.specialServices.warning.noServiceType"),
        [
          { text: i18n.t("common.cancel"), style: "cancel" },
          { 
            text: i18n.t("technician.common.continue") || "Continue Anyway", 
            onPress: () => {
              proceedWithServiceStart();
            }
          }
        ]
      );
      return;
    }

    proceedWithServiceStart();
  };

  const openImageChooser = () => {
    Alert.alert(
      i18n.t("technician.specialServices.photoUpload.add") || "Add Photo",
      i18n.t("common.chooseOption") || "Choose image source",
      [
        {
          text: i18n.t("components.chemicalsDropdown.camera") || "Camera",
          onPress: () => setPendingImageAction("camera"),
        },
        {
          text: i18n.t("components.chemicalsDropdown.gallery") || "Gallery",
          onPress: () => setPendingImageAction("gallery"),
        },
        { text: i18n.t("common.cancel"), style: "cancel" },
      ]
    );
  };

  const buildImageUrl = (img) => {
    if (!img) return null;

    let value = String(img).trim().replace(/[{}"]/g, "");

    // remove query strings
    value = value.split("?")[0];

    // if contains full URL keep only filename
    if (value.includes("/")) {
      value = value.substring(value.lastIndexOf("/") + 1);
    }

    const base = apiService.API_BASE_URL.replace("/api", "");

    return `${base}/uploads/${value}`;
  };

  const proceedWithServiceStart = () => {
    const start = Date.now();
    setServiceStartTime(start);
    setServiceStarted(true);
    setServiceCompleted(false);
    setHasGeneratedReport(false);
    
    Alert.alert(
      i18n.t("technician.specialServices.alerts.serviceStarted"),
      i18n.t("technician.specialServices.alerts.serviceStartedMessage", { 
        type: getSimpleServiceLabel(), 
        name: customer?.customerName || i18n.t("technician.common.customer") 
      })
    );
  };

  const markAppointmentCompleted = async (appointmentId, visitId, appointment) => {
      if (!appointmentId) return;
  
      try {
        const result = await apiService.updateAppointment({
          id: appointmentId,
          status: "completed",
          visitId,
          // 🚨 Remove this line - technicians don't handle prices
          // servicePrice: appointment?.service_price ?? null
        });
  
        if (!result?.success) {
          console.error("❌ Failed to update appointment:", result?.error);
          
          // Check if it's a price error
          if (result?.error?.includes('Service price must be set')) {
            Alert.alert(
              i18n.t("technician.specialServices.alerts.priceNotSet"),
              i18n.t("technician.specialServices.alerts.priceNotSetMessage"),
              [{ text: i18n.t("technician.common.ok") }]
            );
          }
        }
      } catch (err) {
        console.error("❌ Failed to mark appointment completed", err);
      }
    };

  const completeService = async () => {
    try {
      if (!customer?.customerId || !technician?.id) {
        throw new Error(i18n.t("technician.specialServices.errors.missingInfo"));
      }

      // Format chemicals
      const formattedChemicals = selectedChemicals.map(chem => {
        if (typeof chem === 'string') {
          return { name: chem, concentration: '', volume: '' };
        }
        return {
          name: chem.name || chem.chemicalName || '',
          concentration: chem.concentration || chem.concentrationPercent || '',
          volume: chem.volume || chem.volumeMl || ''
        };
      }).filter(chem => chem.name);
      
      // Format treated areas
      const formattedTreatedAreas = treatedAreas.map(area => ({
        id: area.id || `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: area.name || '',
        chemicals: Array.isArray(area.chemicals) ? area.chemicals.map(chem => ({
          name: chem.name || chem.chemicalName || '',
          concentration: chem.concentration && !chem.concentration.includes('%') 
            ? `${chem.concentration}%` 
            : chem.concentration || '',
          volume: chem.volume && !chem.volume.includes('ml')
            ? `${chem.volume}ml`
            : chem.volume || ''
        })) : [],
        concentrationPercent: area.concentrationPercent || '',
        volumeMl: area.volumeMl || '',
        areaNotes: area.areaNotes || ''
      }));

      const stableVisitId =
        session?.visitId ||
        logId ||
        getStableLogId();

      const finalLogId = logId || stableVisitId;
      
      // Calculate duration with fallbacks
      let durationSeconds = 0;
      
      if (serviceStartTime) {
        const now = Date.now();
        const startTime = serviceStartTime;
        const diffMs = now - startTime;
        durationSeconds = Math.floor(diffMs / 1000);
      } else {
        durationSeconds = 3600; // Default to 1 hour
      }
      
      if (isNaN(durationSeconds) || durationSeconds <= 0) {
        durationSeconds = 3600;
      }

      // 🔥 CRITICAL: Use snake_case for chemicals_used and treated_areas
      const payload = {
        logId: finalLogId,
        visitId: stableVisitId,
        customerId: customer.customerId,
        customerName: customer.customerName,
        technicianId: technician.id,
        technicianName: `${technician.firstName} ${technician.lastName}`,
        serviceType: serviceType,
        serviceSubtype: serviceType === 'special' ? specialSubtype : null,
        otherPestName: serviceType === 'special' && specialSubtype === 'other' ? otherPestName : null,
        
        // Send service details in all formats
        otherPestName: serviceType === 'special' && specialSubtype === 'other' ? otherPestName : null,
        other_pest_name: serviceType === 'special' && specialSubtype === 'other' ? otherPestName : null,
        details: serviceType === 'special' ? 
          (specialSubtype === 'other' ? otherPestName : specialSubtype) : null,
        
        serviceStartTime: serviceStartTime ? new Date(serviceStartTime).toISOString() : new Date().toISOString(),
        serviceEndTime: new Date().toISOString(),
        duration: durationSeconds,
        
        // 🔥 CHANGE: Use snake_case
        chemicals_used: formattedChemicals,
        treated_areas: formattedTreatedAreas,
        
        notes: notes || '',
        completedAt: new Date().toISOString(),
      };

      const formData = new FormData();

      // 🔥 FIX: Properly stringify arrays/objects
      Object.keys(payload).forEach(key => {
        const value = payload[key];
        if (value === undefined) return;

        if (key === 'chemicals_used' || key === 'treated_areas') {
          formData.append(key, JSON.stringify(value));
        } else if (typeof value === "object" && value !== null) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });

      // append images
      reportImages.forEach((img, index) => {
        const fileName = img.fileName || `photo_${Date.now()}_${index}.jpg`;

        formData.append("images", {
          uri: img.uri,
          name: fileName,
          type: "image/jpeg",
        });
      });
      
      if (existingImages.length > 0) {
        formData.append("existingImages", JSON.stringify(existingImages));
      }

      const res = await apiService.submitServiceLog(formData);

      if (!res?.success) throw new Error(i18n.t("technician.specialServices.errors.saveFailed"));

      // Mark appointment as completed
      if (session?.appointmentId) {
        await markAppointmentCompleted(session.appointmentId, payload.visitId);
      }

      setLogId(finalLogId);
      setVisitId(stableVisitId);
      setServiceCompleted(true);
      setHasGeneratedReport(false);
      
      Alert.alert(
        i18n.t("technician.specialServices.alerts.serviceCompleted"),
        i18n.t("technician.specialServices.alerts.serviceCompletedMessage"),
        [{ text: i18n.t("technician.common.ok") }]
      );
      
    } catch (e) {
      console.error("❌ Complete service error:", e);
      Alert.alert(
        i18n.t("technician.common.error"), 
        e.message || i18n.t("technician.specialServices.errors.saveFailed")
      );
    }
  };

  const updateService = async () => {
    try {
      
      if (!customer?.customerId || !technician?.id) {
        throw new Error(i18n.t("technician.specialServices.errors.missingInfo"));
      }
      
      const stableLogId = logId || visitId || session?.visitId || getStableLogId();
      
      if (!stableLogId) {
        Alert.alert(
          i18n.t("technician.common.error"), 
          i18n.t("technician.specialServices.errors.missingServiceId") || "Missing service ID. Cannot update."
        );
        return;
      }
      
      const formattedChemicals = selectedChemicals.map(chem => {
        if (typeof chem === 'string') {
          return { name: chem, concentration: '', volume: '' };
        }
        return {
          name: chem.name || chem.chemicalName || '',
          concentration: chem.concentration || chem.concentrationPercent || '',
          volume: chem.volume || chem.volumeMl || ''
        };
      }).filter(chem => chem.name);
    
      const formattedTreatedAreas = treatedAreas.map(area => ({
        id: area.id || `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: area.name || '',
        chemicals: Array.isArray(area.chemicals) ? area.chemicals.map(chem => ({
          name: chem.name || '',
          concentration: chem.concentration || '',
          volume: chem.volume || ''
        })) : [],
        concentrationPercent: area.concentrationPercent || '',
        volumeMl: area.volumeMl || '',
        areaNotes: area.areaNotes || ''
      }));
      
      const effectiveStartTime = serviceStartTime || Date.now() - 3600000;
      const stableVisitId = visitId || session?.visitId || stableLogId;
      
      // Calculate duration with fallbacks
      let durationSeconds = 0;
      
      if (storedDuration && !isNaN(storedDuration) && storedDuration > 0) {
        durationSeconds = Number(storedDuration);
      } else if (serviceStartTime) {
        const now = Date.now();
        const startTimeMs = typeof serviceStartTime === 'number' 
          ? serviceStartTime 
          : new Date(serviceStartTime).getTime();
        
        if (!isNaN(startTimeMs) && startTimeMs > 0) {
          const diffMs = now - startTimeMs;
          durationSeconds = Math.floor(diffMs / 1000);
        }
      }
      
      if (!durationSeconds || isNaN(durationSeconds) || durationSeconds <= 0) {
        durationSeconds = 3600;
      }
      
      durationSeconds = Number(durationSeconds);
      
      // 🔥 CRITICAL: Use snake_case for chemicals_used and treated_areas
      const payload = {
        logId: stableLogId,
        visitId: stableVisitId,
        customerId: customer.customerId,
        customerName: customer.customerName,
        technicianId: technician.id,
        technicianName: `${technician.firstName} ${technician.lastName}`,

        serviceType: serviceType,
        serviceSubtype: serviceType === 'special' ? specialSubtype : null,
        otherPestName: serviceType === 'special' && specialSubtype === 'other' ? otherPestName : null,
        other_pest_name: serviceType === 'special' && specialSubtype === 'other' ? otherPestName : null,
        
        serviceStartTime: new Date(effectiveStartTime).toISOString(),
        serviceEndTime: new Date().toISOString(),
        duration: durationSeconds,
        
        // 🔥 CHANGE: Use snake_case
        chemicals_used: formattedChemicals,
        treated_areas: formattedTreatedAreas,
        
        notes: notes || '',
        updatedAt: new Date().toISOString(),
      };
      
      const formData = new FormData();

      // 🔥 FIX: Properly stringify arrays/objects
      Object.keys(payload).forEach(key => {
        const value = payload[key];
        if (value === undefined) return;

        if (key === 'chemicals_used' || key === 'treated_areas') {
          formData.append(key, JSON.stringify(value));
        } else if (key === 'duration') {
          formData.append(key, String(value));
        } else if (typeof value === "object" && value !== null) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });

      // append images
      reportImages.forEach((img, index) => {
        const fileName = img.fileName || `photo_${Date.now()}_${index}.jpg`;

        formData.append("images", {
          uri: img.uri,
          name: fileName,
          type: "image/jpeg",
        });
      });
      
      if (existingImages.length > 0) {
        formData.append("existingImages", JSON.stringify(existingImages));
      }

      const res = await apiService.submitServiceLog(formData);
      
      if (!res?.success) {
        throw new Error(res?.error || i18n.t("technician.specialServices.errors.updateFailed"));
      }
      
      setServiceCompleted(true);
      setHasGeneratedReport(false);
      
      if (session?.appointmentId) {
        await markAppointmentCompleted(session.appointmentId, payload.visitId);
      }
      
      if (!logId && res.logId) {
        setLogId(res.logId);
      }
      
      Alert.alert(
        i18n.t("technician.specialServices.alerts.serviceUpdated"),
        i18n.t("technician.specialServices.alerts.serviceUpdatedMessage"),
        [
          { 
            text: i18n.t("technician.common.ok"), 
            onPress: () => {
              const updatedContext = buildReportContext(stableVisitId);
              onGenerateReport({
                ...updatedContext,
                visitId: stableVisitId,
                _refreshKey: Date.now()
              });
            }
          }
        ]
      );
      
    } catch (e) {
      console.error("❌ Update service error:", e);
      Alert.alert(
        i18n.t("technician.common.error"), 
        e.message || i18n.t("technician.specialServices.errors.updateFailed")
      );
    }
  };

  const buildReportContext = (visitIdOverride) => {
    const date = new Date();
    const effectiveVisitId = visitIdOverride || visitId || session?.visitId;
    
    if (!effectiveVisitId) {
      console.warn("⚠️ No visitId available for report context");
    }
    
    // Get service details
    const serviceDetails = serviceType === 'special' ? 
      (specialSubtype === 'other' ? otherPestName : specialSubtype) : null;
    
    return {
      date: date.toLocaleDateString(),
      duration: formatTime(
        storedDuration !== null ? storedDuration * 1000 : elapsedTime
      ),
      customerName: customer?.customerName || i18n.t("technician.common.unknown") || 'Unknown Customer',
      technicianName: technician ? `${technician.firstName} ${technician.lastName}` : i18n.t("technician.common.unknown") || 'Unknown Technician',
      serviceType: serviceType,
      serviceTypeName: getServiceDisplayLabel(),
      serviceSubtype: serviceType === 'special' ? specialSubtype : null,
      otherPestName: serviceType === 'special' && specialSubtype === 'other' ? otherPestName : null,
      other_pest_name: serviceType === 'special' && specialSubtype === 'other' ? otherPestName : null,
      details: serviceDetails,
      visitId: effectiveVisitId,
      
      // 🔥 CHANGE: Use snake_case
      chemicals_used: selectedChemicals,
      treated_areas: treatedAreas,
      
      notes: notes,
      serviceStartTime: serviceStartTime ? new Date(serviceStartTime).toISOString() : null,
      serviceEndTime: new Date().toISOString(),
      _debug: {
        timestamp: date.toISOString(),
        chemicalsCount: selectedChemicals.length,
        areasCount: treatedAreas.length,
        hasVisitId: !!effectiveVisitId,
      }
    };
  };

  const cancelWork = () => {
    Alert.alert(
      i18n.t("technician.specialServices.alerts.cancelServiceConfirm"),
      i18n.t("technician.specialServices.alerts.unsavedChangesMessage"),
      [
        { 
          text: i18n.t("technician.specialServices.alerts.continueService"), 
          style: "cancel" 
        },
        { 
          text: i18n.t("technician.specialServices.alerts.cancelServiceConfirm"), 
          style: "destructive",
          onPress: () => {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            
            setServiceStarted(false);
            setServiceCompleted(false);
            setServiceStartTime(null);
            setElapsedTime(0);
            setSelectedChemicals([]);
            setTreatedAreas([]);
            setNotes('');
            setHasGeneratedReport(false);
            
            onBack();
          }
        }
      ]
    );
  };

  /* =========================
     RENDER CONTENT - PROFESSIONAL DESIGN
  ========================= */
  const renderContent = () => (
    <>
      {/* HEADER - Professional Design */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (serviceCompleted) {
                onBack();
              } else if (serviceStarted) {
                Alert.alert(
                  i18n.t("technician.specialServices.alerts.unsavedChanges"),
                  i18n.t("technician.specialServices.alerts.unsavedChangesMessage"),
                  [
                    { text: i18n.t("technician.specialServices.alerts.continueService"), style: "cancel" },
                    { 
                      text: i18n.t("technician.specialServices.alerts.cancelServiceConfirm"), 
                      style: "destructive",
                      onPress: () => {
                        cancelWork();
                        onBack();
                      }
                    }
                  ]
                );
              } else {
                onBack();
              }
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backText}>{i18n.t("technician.common.back")}</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {getServiceDisplayLabel()}
            </Text>
            <Text style={styles.headerSubtitle}>
              {serviceStarted 
                ? i18n.t("technician.specialServices.serviceInProgress")
                : i18n.t("technician.specialServices.serviceSetup")}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.navigateButton}
            onPress={onNavigate}
          >
            <MaterialIcons name="navigation" size={20} color="#fff" />
            <Text style={styles.navigateText}>{i18n.t("technician.common.navigate")}</Text>
          </TouchableOpacity>
        </View>

        {/* EDIT MODE LOAD DATA BUTTON - ADDED HERE */}
        {serviceCompleted && !selectedChemicals.length && !treatedAreas.length && !notes && (
          <TouchableOpacity 
            style={[styles.secondaryButton, { backgroundColor: '#1f9c8b' }]} 
            onPress={async () => {
              try {
                setLoading(true);
                const visitIdToLoad = visitId || session?.visitId;
                
                if (!visitIdToLoad) {
                  Alert.alert(
                    i18n.t("technician.common.error"), 
                    i18n.t("technician.specialServices.errors.noVisitId")
                  );
                  return;
                }
                
                const res = await apiService.getServiceLogByVisitId(visitIdToLoad);
                
                if (res?.success && res.log) {
                  const log = res.log;

                  setReportImages([]);

                  // LOAD EXISTING IMAGES
                  if (log?.images && Array.isArray(log.images)) {
                    const cleaned = log.images
                      .map(img => {
                        if (!img) return null;

                        let v = String(img).split("?")[0].trim();

                        if (v.includes("/")) {
                          v = v.substring(v.lastIndexOf("/") + 1);
                        }

                        return v;
                      })
                      .filter(Boolean);

                    setExistingImages(cleaned);
                  }
                  
                  // Load chemicals
                  const chemicalsFromLog = log.chemicalsUsed || log.chemicals_used || [];
                  const normalizedChemicals = chemicalsFromLog.map(c => {
                    if (typeof c === "string") return { name: c };
                    return {
                      ...c,
                      name: c.name || c.chemicalName || c.chemical || "",
                    };
                  }).filter(c => c?.name);
                  setSelectedChemicals(normalizedChemicals);
                  
                  // Load notes
                  setNotes(log.notes || "");
                  
                  // Load treated areas
                  const areasFromLog = log.treatedAreas || log.treated_areas || [];
                  setTreatedAreas(areasFromLog);
                  
                  Alert.alert(
                    i18n.t("technician.common.success"), 
                    i18n.t("technician.specialServices.alerts.serviceUpdated") || "Service data loaded successfully"
                  );
                } else {
                  Alert.alert(
                    i18n.t("technician.common.error"), 
                    i18n.t("technician.specialServices.errors.noDataFound")
                  );
                }
              } catch (error) {
                console.error("Failed to load data:", error);
                Alert.alert(
                  i18n.t("technician.common.error"), 
                  i18n.t("technician.specialServices.errors.noDataFound")
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            <MaterialIcons name="cloud-download" size={20} color="#fff" />
            <Text style={styles.secondaryButtonText}>{i18n.t("technician.specialServices.actionButtons.loadData") || "Load Service Data"}</Text>
          </TouchableOpacity>
        )}

        {/* Timer Display */}
        {serviceStarted && !serviceCompleted && (
          <View style={styles.timerContainer}>
            <MaterialIcons name="access-time" size={20} color="#fff" />
            <Text style={styles.timerText}>⏱ {formatTime(elapsedTime)}</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* CUSTOMER INFO CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="person" size={20} color="#1f9c8b" />
            <Text style={styles.cardTitle}>{i18n.t("technician.specialServices.customerInfo")}</Text>
          </View>
          
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customer?.customerName || '—'}</Text>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="schedule" size={16} color="#666" />
              <Text style={styles.infoText}>
                {i18n.t("technician.specialServices.appointment", { time: session?.appointmentTime || 'N/A' })}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="person-pin" size={16} color="#666" />
              <Text style={styles.infoText}>
                {i18n.t("technician.specialServices.technician", { 
                  firstName: technician?.firstName, 
                  lastName: technician?.lastName 
                })}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={16} color="#666" />
              <Text style={styles.infoText}>
                {customer?.address || i18n.t("technician.common.noAddress") || 'No address available'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="medical-services" size={16} color="#666" />
              <Text style={styles.serviceTypeText}>
                {i18n.t("technician.specialServices.service")} <Text style={styles.serviceTypeValue}>{getServiceDisplayLabel()}</Text>
              </Text>
            </View>
          </View>

          {/* Warning message if special service type not specified */}
          {serviceType === "special" && !specialSubtype && (
            <View style={styles.warningCard}>
              <MaterialIcons name="warning" size={20} color="#ff9800" />
              <Text style={styles.warningText}>
                {i18n.t("technician.specialServices.warning.noServiceType")}
              </Text>
            </View>
          )}
        </View>

        {/* SERVICE STATUS INDICATOR */}
        {serviceStarted && (
          <View style={styles.statusCard}>
            <Text style={styles.sectionTitle}>{i18n.t("technician.specialServices.serviceProgress")}</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressStep}>
                <View style={[
                  styles.progressIndicator,
                  serviceStarted && styles.progressActive
                ]}>
                  {serviceStarted && (
                    <MaterialIcons name="check" size={16} color="#fff" />
                  )}
                </View>
                <Text style={[
                  styles.progressLabel,
                  serviceStarted && styles.progressLabelActive
                ]}>{i18n.t("technician.specialServices.progress.started")}</Text>
              </View>
              
              <View style={[
                styles.progressLine,
                serviceCompleted && styles.progressLineActive
              ]} />
              
              <View style={styles.progressStep}>
                <View style={[
                  styles.progressIndicator,
                  serviceCompleted && styles.progressActive
                ]}>
                  {serviceCompleted && (
                    <MaterialIcons name="check" size={16} color="#fff" />
                  )}
                </View>
                <Text style={[
                  styles.progressLabel,
                  serviceCompleted && styles.progressLabelActive
                ]}>{i18n.t("technician.specialServices.progress.completed")}</Text>
              </View>
            </View>
          </View>
        )}

        {/* CHEMICALS SECTION */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="science" size={20} color="#1f9c8b" />
            <Text style={styles.sectionTitle}>{i18n.t("technician.specialServices.chemicalsUsed")}</Text>
          </View>
          
          <View style={[
            styles.card, 
            !serviceStarted && styles.disabledCard
          ]}>
            <ChemicalsDropdown
              selectedChemicals={selectedChemicals}
              onChemicalsChange={(newChemicals) => {
                if (!serviceStarted) {
                  Alert.alert(
                    i18n.t("technician.specialServices.alerts.startServiceRequired"),
                    i18n.t("technician.specialServices.alerts.startServiceMessage")
                  );
                  return;
                }
                setSelectedChemicals(newChemicals);
              }}
              disabled={!serviceStarted}
              editable={serviceStarted}
            />
            {!serviceStarted && (
              <Text style={styles.disabledHint}>{i18n.t("technician.specialServices.startHint")}</Text>
            )}
          </View>
        </View>

        {/* TREATED AREAS SECTION */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="layers" size={20} color="#1f9c8b" />
            <Text style={styles.sectionTitle}>{i18n.t("technician.specialServices.treatedAreas")}</Text>
          </View>

          {/* Add Area Input */}
          <View style={styles.addAreaContainer}>
            <TextInput
              style={[
                styles.areaInput,
                !serviceStarted && styles.disabledInput
              ]}
              placeholder={i18n.t("technician.specialServices.areaPlaceholder")}
              placeholderTextColor="#999"
              value={areaNameInput}
              onChangeText={setAreaNameInput}
              editable={serviceStarted}
            />
            <TouchableOpacity
              style={[
                styles.addAreaButton,
                !serviceStarted && styles.disabledButton
              ]}
              onPress={() => {
                if (!serviceStarted) {
                  showStartServiceAlert();
                  return;
                }
                if (!areaNameInput.trim()) return;
                
                const newArea = {
                  id: Date.now().toString(),
                  name: areaNameInput.trim(),
                  chemicals: [],
                  areaNotes: '',
                };
                
                setTreatedAreas((p) => [newArea, ...p]);
                setAreaNameInput('');
              }}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addAreaButtonText}>{i18n.t("technician.specialServices.add")}</Text>
            </TouchableOpacity>
          </View>

          {/* Areas List */}
          {treatedAreas.map((a) => (
            <Swipeable
              key={a.id}
              renderRightActions={() => (
                <TouchableOpacity
                  style={[
                    styles.areaActionButton,
                    !serviceStarted && styles.disabledButton
                  ]}
                  onPress={() => {
                    if (!serviceStarted) {
                      showStartServiceAlert();
                      return;
                    }
                    setActiveAreaId(a.id);
                    setAreaNotes(a.areaNotes || '');
                    setAreaModalVisible(true);
                  }}
                >
                  <MaterialIcons name="info-outline" size={20} color="#fff" />
                  <Text style={styles.areaActionText}>{i18n.t("technician.specialServices.areaDetails.title")}</Text>
                </TouchableOpacity>
              )}
            >
              <View style={[
                styles.areaCard,
                !serviceStarted && styles.disabledCard
              ]}>
                <View style={styles.areaCardContent}>
                  <View style={styles.areaCardHeader}>
                    <MaterialIcons name="location-on" size={18} color="#1f9c8b" />
                    <Text style={styles.areaName}>{a.name}</Text>
                  </View>
                  
                  {a.chemicals && a.chemicals.length > 0 ? (
                    <View style={styles.areaChemicalsPreview}>
                      <Text style={styles.areaChemicalsCount}>
                        {a.chemicals.length} {i18n.t("technician.specialServices.chemicalsInArea")} {a.chemicals.length > 1 ? 's' : ''}
                      </Text>
                      <Text style={styles.areaChemicalsList}>
                        {a.chemicals.slice(0, 2).map(c => c.name).join(', ')}
                        {a.chemicals.length > 2 ? '...' : ''}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.noChemicalsText}>
                      {i18n.t("technician.specialServices.noChemicals")}
                    </Text>
                  )}
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#ccc" />
              </View>
            </Swipeable>
          ))}
        </View>

        {/* PHOTO UPLOAD */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="add-a-photo" size={20} color="#1f9c8b" />
            <Text style={styles.sectionTitle}>{i18n.t("technician.specialServices.treatmentPhotos")}</Text>
          </View>

          <TouchableOpacity
            style={{ marginBottom: 20, marginTop: 20,alignItems: "flex-start" }}
            onPress={() => {
              if (!serviceStarted && !serviceCompleted) {
                showStartServiceAlert();
                return;
              }
              openImageChooser();
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="add-a-photo"
              size={30}
              color={(serviceStarted || serviceCompleted) ? "#1f9c8b" : "#ccc"}
            />
            <Text
              style={{
                marginTop: 6,
                fontSize: 14,
                fontWeight: "600",
                color: (serviceStarted || serviceCompleted) ? "#1f9c8b" : "#999",
              }}
            >
              {reportImages.length > 0 
                ? i18n.t("technician.specialServices.photoUpload.addMore")
                : i18n.t("technician.specialServices.photoUpload.add")}
            </Text>
          </TouchableOpacity>

          {(existingImages.length > 0 || reportImages.length > 0) && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {/* EXISTING IMAGES - FIXED */}
            {existingImages.map((img, index) => {
              // Build the full URL for the image
              const imageUrl = buildImageUrl(img);
              
              return (
                <View key={`existing-${index}`} style={{ marginRight: 10, position: "relative" }}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={{ width: 120, height: 120, borderRadius: 10 }}
                    resizeMode="cover"
                    onError={(e) => console.log(`❌ Image load error for ${img}:`, e.nativeEvent.error)}
                  />

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
                      const updated = existingImages.filter((_, i) => i !== index);
                      setExistingImages(updated);
                    }}
                  >
                    <MaterialIcons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* NEW IMAGES */}
            {reportImages.map((img, index) => (
              <View key={`new-${index}`} style={{ marginRight: 10, position: "relative" }}>
                <Image
                  source={{ uri: img.uri }}
                  style={{ width: 120, height: 120, borderRadius: 10 }}
                  resizeMode="cover"
                />

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
                    const updated = reportImages.filter((_, i) => i !== index);
                    setReportImages(updated);
                  }}
                >
                  <MaterialIcons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

          </ScrollView>
          )}
        </View>

        {/* SERVICE NOTES SECTION */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="notes" size={20} color="#1f9c8b" />
            <Text style={styles.sectionTitle}>{i18n.t("technician.specialServices.serviceNotes")}</Text>
          </View>
          
          <TextInput
            style={[
              styles.notesInput,
              !serviceStarted && styles.disabledInput
            ]}
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={(text) => {
              if (!serviceStarted) {
                showStartServiceAlert();
                return;
              }
              setNotes(text);
            }}
            placeholder={i18n.t("technician.specialServices.notesPlaceholder")}
            placeholderTextColor="#999"
            editable={serviceStarted}
          />
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionsContainer}>
          {!serviceStarted && (
            <TouchableOpacity 
              style={[
                styles.primaryButton,
                (serviceType === "special" && !specialSubtype) && styles.warningButton
              ]} 
              onPress={startService}
            >
              <MaterialIcons name="play-arrow" size={22} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {(serviceType === "special" && !specialSubtype) 
                  ? i18n.t("technician.specialServices.actionButtons.startNoType")
                  : i18n.t("technician.specialServices.actionButtons.startService", { type: getSimpleServiceLabel() })}
              </Text>
            </TouchableOpacity>
          )}

          {serviceStarted && !serviceCompleted && (
            <>
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={completeService}
              >
                <MaterialIcons name="check-circle" size={22} color="#fff" />
                <Text style={styles.primaryButtonText}>{i18n.t("technician.specialServices.actionButtons.completeService")}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={cancelWork}
              >
                <MaterialIcons name="cancel" size={20} color="#fff" />
                <Text style={styles.cancelButtonText}>{i18n.t("technician.specialServices.actionButtons.cancelService")}</Text>
              </TouchableOpacity>
            </>
          )}

          {serviceCompleted && (
            <>
              <TouchableOpacity 
                style={styles.updateButton} 
                onPress={updateService}
              >
                <MaterialIcons name="edit" size={20} color="#fff" />
                <Text style={styles.updateButtonText}>{i18n.t("technician.specialServices.actionButtons.updateService")}</Text>
              </TouchableOpacity>

              {!hasGeneratedReport && (
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    (!visitId && !logId) && styles.disabledButton
                  ]}
                  onPress={() => {
                    if (!visitId && !logId) {
                      Alert.alert(
                        i18n.t("technician.specialServices.alerts.dataNotReady"),
                        i18n.t("technician.specialServices.alerts.dataNotReadyMessage"),
                        [{ text: i18n.t("technician.common.ok") }]
                      );
                      return;
                    }
                    
                    setHasGeneratedReport(true);
                    const reportContext = buildReportContext(visitId || logId);
                    onGenerateReport(reportContext);
                  }}
                  disabled={!visitId && !logId}
                >
                  <MaterialIcons name="description" size={20} color="#fff" />
                  <Text style={styles.secondaryButtonText}>{i18n.t("technician.specialServices.actionButtons.generateReport")}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {i18n.t("technician.specialServices.footer") || "Pest - Free Technician Portal • Special Services Module"}
          </Text>
          <Text style={styles.footerCopyright}>
             {i18n.t("technician.home.footer.copyright", { year: new Date().getFullYear() })}
          </Text>
        </View>
      </ScrollView>

      {/* AREA DETAILS MODAL - Professional Design */}
      <Modal visible={areaModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContainer}
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setAreaModalVisible(false)}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {i18n.t("technician.specialServices.areaDetails.title")}
                </Text>
                <View style={{ width: 40 }} />
              </View>
              
              <ScrollView
                contentContainerStyle={styles.modalContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.areaHeaderCard}>
                  <MaterialIcons name="location-on" size={24} color="#1f9c8b" />
                  <Text style={styles.areaModalName}>
                    {treatedAreas.find(a => a.id === activeAreaId)?.name || i18n.t("technician.common.unknown") || 'Untitled Area'}
                  </Text>
                </View>

                {/* Chemicals Reference */}
                {selectedChemicals.length > 0 && (
                  <View style={styles.referenceSection}>
                    <View style={styles.referenceHeader}>
                      <MaterialIcons name="science" size={18} color="#1f9c8b" />
                      <Text style={styles.referenceTitle}>{i18n.t("technician.specialServices.areaDetails.availableChemicals")}</Text>
                    </View>
                    <Text style={styles.referenceSubtitle}>
                      {i18n.t("technician.specialServices.areaDetails.tapToAdd")}
                    </Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.chemicalsScrollView}
                    >
                      {selectedChemicals.map((chem, index) => {
                        const chemName = typeof chem === 'string' ? chem : chem.name || chem.chemicalName;
                        return (
                          <TouchableOpacity
                            key={`ref-${index}`}
                            style={styles.chemicalChip}
                            onPress={() => {
                              const currentArea = treatedAreas.find(a => a.id === activeAreaId);
                              const currentChemicals = currentArea?.chemicals || [];
                              
                              const alreadyAdded = currentChemicals.some(c => 
                                (typeof c === 'string' ? c : c.name) === chemName
                              );
                              
                              if (!alreadyAdded) {
                                const newChemical = typeof chem === 'string' ? {
                                  name: chem,
                                  concentration: '',
                                  volume: ''
                                } : {
                                  name: chem.name || chem.chemicalName || '',
                                  concentration: chem.concentration || chem.concentrationPercent || '',
                                  volume: chem.volume || chem.volumeMl || ''
                                };
                                
                                if (currentArea) {
                                  currentArea.chemicals = [...currentChemicals, newChemical];
                                  const updatedAreas = treatedAreas.map(a => 
                                    a.id === activeAreaId ? currentArea : a
                                  );
                                  setTreatedAreas(updatedAreas);
                                }
                              }
                            }}
                          >
                            <Text style={styles.chemicalChipText}>{chemName}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Area Chemicals List */}
                <View style={styles.areaChemicalsSection}>
                  <View style={styles.sectionTitleContainer}>
                    <MaterialIcons name="format-list-bulleted" size={18} color="#1f9c8b" />
                    <Text style={styles.sectionTitle}>{i18n.t("technician.specialServices.chemicalsInArea")}</Text>
                  </View>
                  
                  {(() => {
                    const currentArea = treatedAreas.find(a => a.id === activeAreaId);
                    const areaChemicals = currentArea?.chemicals || [];
                    
                    if (areaChemicals.length === 0) {
                      return (
                        <View style={styles.emptyState}>
                          <MaterialIcons name="science" size={40} color="#e0e0e0" />
                          <Text style={styles.emptyStateText}>
                            {i18n.t("technician.specialServices.noChemicals")}
                          </Text>
                          <Text style={styles.emptyStateSubtext}>
                            {i18n.t("technician.specialServices.areaDetails.tapToAdd")}
                          </Text>
                        </View>
                      );
                    }
                    
                    return areaChemicals.map((chemical, chemIndex) => (
                      <View key={`area-chem-${chemIndex}`} style={styles.chemicalItemCard}>
                        <View style={styles.chemicalItemHeader}>
                          <View style={styles.chemicalNameContainer}>
                            <MaterialIcons name="water-drop" size={16} color="#1f9c8b" />
                            <Text style={styles.chemicalItemName}>
                              {chemical.name || `${i18n.t("technician.specialServices.chemicalsUsed")} ${chemIndex + 1}`}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => {
                              const currentArea = treatedAreas.find(a => a.id === activeAreaId);
                              if (currentArea && currentArea.chemicals) {
                                const updatedChemicals = currentArea.chemicals.filter((_, i) => i !== chemIndex);
                                currentArea.chemicals = updatedChemicals;
                                const updatedAreas = treatedAreas.map(a => 
                                  a.id === activeAreaId ? currentArea : a
                                );
                                setTreatedAreas(updatedAreas);
                              }
                            }}
                            style={styles.removeButton}
                          >
                            <MaterialIcons name="delete-outline" size={20} color="#dc3545" />
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.chemicalInputsRow}>
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{i18n.t("components.chemicalsDropdown.concentration")}</Text>
                            <View style={styles.inputContainer}>
                              <TextInput
                                style={styles.chemicalInput}
                                placeholder={i18n.t("components.chemicalsDropdown.concentrationPlaceholder")}
                                value={chemical.concentration?.replace('%', '') || ''}
                                onChangeText={(text) => {
                                  const currentArea = treatedAreas.find(a => a.id === activeAreaId);
                                  if (currentArea && currentArea.chemicals) {
                                    const updatedChemicals = [...currentArea.chemicals];
                                    updatedChemicals[chemIndex] = {
                                      ...updatedChemicals[chemIndex],
                                      concentration: text
                                    };
                                    currentArea.chemicals = updatedChemicals;
                                    const updatedAreas = treatedAreas.map(a => 
                                      a.id === activeAreaId ? currentArea : a
                                    );
                                    setTreatedAreas(updatedAreas);
                                  }
                                }}
                                keyboardType="numeric"
                              />
                              <Text style={styles.inputUnit}>%</Text>
                            </View>
                          </View>
                          
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{i18n.t("components.chemicalsDropdown.volume")}</Text>
                            <View style={styles.inputContainer}>
                              <TextInput
                                style={styles.chemicalInput}
                                placeholder={i18n.t("components.chemicalsDropdown.volumePlaceholder")}
                                value={chemical.volume?.replace('ml', '') || ''}
                                onChangeText={(text) => {
                                  const currentArea = treatedAreas.find(a => a.id === activeAreaId);
                                  if (currentArea && currentArea.chemicals) {
                                    const updatedChemicals = [...currentArea.chemicals];
                                    updatedChemicals[chemIndex] = {
                                      ...updatedChemicals[chemIndex],
                                      volume: text
                                    };
                                    currentArea.chemicals = updatedChemicals;
                                    const updatedAreas = treatedAreas.map(a => 
                                      a.id === activeAreaId ? currentArea : a
                                    );
                                    setTreatedAreas(updatedAreas);
                                  }
                                }}
                                keyboardType="numeric"
                              />
                              <Text style={styles.inputUnit}>ml</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    ));
                  })()}
                </View>

                {/* Area Notes */}
                <View style={styles.notesSection}>
                  <View style={styles.sectionTitleContainer}>
                    <MaterialIcons name="notes" size={18} color="#1f9c8b" />
                    <Text style={styles.sectionTitle}>{i18n.t("technician.specialServices.areaDetails.areaNotes")}</Text>
                  </View>
                  <TextInput
                    style={styles.areaNotesInput}
                    placeholder={i18n.t("technician.specialServices.areaDetails.notesPlaceholder")}
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    value={areaNotes}
                    onChangeText={setAreaNotes}
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setAreaModalVisible(false)}
                  >
                    <Text style={styles.modalCancelButtonText}>{i18n.t("technician.specialServices.areaDetails.cancel")}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.modalSaveButton}
                    onPress={() => {
                      const currentArea = treatedAreas.find(a => a.id === activeAreaId);
                      if (currentArea) {
                        const formattedChemicals = (currentArea.chemicals || []).map(chem => ({
                          ...chem,
                          concentration: chem.concentration && !chem.concentration.includes('%') 
                            ? `${chem.concentration}%` 
                            : chem.concentration,
                          volume: chem.volume && !chem.volume.includes('ml')
                            ? `${chem.volume}ml`
                            : chem.volume
                        }));

                        setTreatedAreas(prev => 
                          prev.map(area => 
                            area.id === activeAreaId 
                              ? {
                                  ...area,
                                  chemicals: formattedChemicals,
                                  areaNotes,
                                  ...(formattedChemicals.length > 0 ? {
                                    concentrationPercent: formattedChemicals[0].concentration,
                                    volumeMl: formattedChemicals[0].volume
                                  } : {})
                                }
                              : area
                          )
                        );
                      }
                      setAreaModalVisible(false);
                    }}
                  >
                    <MaterialIcons name="save" size={20} color="#fff" />
                    <Text style={styles.modalSaveButtonText}>{i18n.t("technician.specialServices.areaDetails.save")}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f9c8b" />
          <Text style={styles.loadingText}>{i18n.t("technician.specialServices.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {renderContent()}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
}

/* =========================
   PROFESSIONAL STYLES
========================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'System',
  },

  /* HEADER STYLES */
  header: {
    backgroundColor: '#1f9c8b',
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 4,
    fontWeight: '500',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'System',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'System',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  navigateText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  timerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: 'System',
  },

  /* CONTENT STYLES */
  content: {
    padding: 20,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
    fontFamily: 'System',
  },

  /* CARD STYLES */
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
    fontFamily: 'System',
  },
  customerInfo: {
    marginTop: 8,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
    fontFamily: 'System',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    fontFamily: 'System',
  },
  serviceTypeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontFamily: 'System',
  },
  serviceTypeValue: {
    color: '#1f9c8b',
    fontWeight: '600',
  },
  warningCard: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
    fontFamily: 'System',
  },

  /* STATUS CARD */
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressActive: {
    backgroundColor: '#1f9c8b',
    borderColor: '#1f9c8b',
  },
  progressLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    fontFamily: 'System',
  },
  progressLabelActive: {
    color: '#1f9c8b',
    fontWeight: '600',
  },
  progressLine: {
    width: 80,
    height: 2,
    backgroundColor: '#e9ecef',
    marginHorizontal: 10,
  },
  progressLineActive: {
    backgroundColor: '#1f9c8b',
  },

  /* AREAS SECTION */
  addAreaContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  areaInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    fontFamily: 'System',
  },
  addAreaButton: {
    marginLeft: 12,
    backgroundColor: '#1f9c8b',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  addAreaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: 'System',
  },
  areaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  areaCardContent: {
    flex: 1,
  },
  areaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  areaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
    fontFamily: 'System',
  },
  areaChemicalsPreview: {
    marginLeft: 26,
  },
  areaChemicalsCount: {
    fontSize: 13,
    color: '#1f9c8b',
    fontWeight: '500',
    fontFamily: 'System',
  },
  areaChemicalsList: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: 'System',
  },
  noChemicalsText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginLeft: 26,
    fontFamily: 'System',
  },
  areaActionButton: {
    backgroundColor: '#1f9c8b',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginLeft: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  areaActionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
    fontFamily: 'System',
  },

  /* NOTES SECTION */
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
    fontFamily: 'System',
  },

  /* ACTION BUTTONS */
  actionsContainer: {
    marginTop: 8,
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#1f9c8b',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#1f9c8b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'System',
  },
  warningButton: {
    backgroundColor: '#ff9800',
    shadowColor: '#ff9800',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'System',
  },
  updateButton: {
    backgroundColor: '#0f6a61',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#0f6a61',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'System',
  },
  secondaryButton: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2c3e50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'System',
  },

  /* DISABLED STATES */
  disabledCard: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
    opacity: 0.7,
  },
  disabledInput: {
    backgroundColor: '#f8f9fa',
    color: '#999',
    borderColor: '#e9ecef',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    shadowColor: '#cccccc',
  },
  disabledHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'System',
  },

  /* FOOTER */
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'System',
  },
  footerCopyright: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'System',
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    fontFamily: 'System',
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  areaHeaderCard: {
    backgroundColor: '#f0f9f8',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  areaModalName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f9c8b',
    marginLeft: 12,
    fontFamily: 'System',
  },
  referenceSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  referenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  referenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
    fontFamily: 'System',
  },
  referenceSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontFamily: 'System',
  },
  chemicalsScrollView: {
    marginHorizontal: -4,
  },
  chemicalChip: {
    backgroundColor: '#e9f7f6',
    borderWidth: 1,
    borderColor: '#1f9c8b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  chemicalChipText: {
    color: '#1f9c8b',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
  },
  areaChemicalsSection: {
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    fontWeight: '500',
    fontFamily: 'System',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
    fontFamily: 'System',
  },
  chemicalItemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  chemicalItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chemicalNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chemicalItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
    fontFamily: 'System',
  },
  removeButton: {
    padding: 4,
  },
  chemicalInputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
    fontFamily: 'System',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  chemicalInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    fontFamily: 'System',
  },
  inputUnit: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
    fontFamily: 'System',
  },
  notesSection: {
    marginBottom: 20,
  },
  areaNotesInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
    fontFamily: 'System',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    fontFamily: 'System',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#1f9c8b',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1f9c8b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'System',
  },
});