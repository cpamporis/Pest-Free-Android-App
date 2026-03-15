// DisinfectionScreen.js - PROFESSIONAL STYLING ONLY
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
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import i18n from "../../services/i18n";

/**
 * DisinfectionScreen
 * FULL IMPLEMENTATION WITH PROFESSIONAL STYLING
 * EXACT SAME OPERATIONS AS INSECTICIDESCREEN
 */
export default function DisinfectionScreen({
  technician,
  customer,
  session,
  onBack,
  onNavigate,
  onGenerateReport,
}) {
  /* =========================
     CORE STATE - SAME AS INSECTICIDESCREEN
  ========================= */
  
  const [loading, setLoading] = useState(true);
  const [logId, setLogId] = useState(null);
  const [visitId, setVisitId] = useState(null);
  const [serviceStarted, setServiceStarted] = useState(false);
  const [serviceCompleted, setServiceCompleted] = useState(false);
  const [availableChemicals, setAvailableChemicals] = useState([]);
  const [serviceStartTime, setServiceStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  const [storedDuration, setStoredDuration] = useState(null);
  const [selectedChemicals, setSelectedChemicals] = useState([]);
  const [notes, setNotes] = useState('');
  const [reportImages, setReportImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);


  /* =========================
     TREATED AREAS STATE - SAME AS INSECTICIDESCREEN
  ========================= */
  const [treatedAreas, setTreatedAreas] = useState([]);
  const [areaNameInput, setAreaNameInput] = useState('');

  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [activeAreaId, setActiveAreaId] = useState(null);
  const [areaConcentration, setAreaConcentration] = useState('');
  const [areaVolume, setAreaVolume] = useState('');
  const [areaNotes, setAreaNotes] = useState('');
  const [showGenerateReport, setShowGenerateReport] = useState(false);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);
  

  /* =========================
     DISINFECTION DETAILS FROM ADMIN - SAME STRUCTURE
  ========================= */
  const [disinfectionDetails, setDisinfectionDetails] = useState('');
  const [serviceTypeLabel, setServiceTypeLabel] = useState(i18n.t("serviceTypes.disinfection"));
  const pickImagesFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert("Permission required", "Gallery permission is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7
    });

    if (!result.canceled) {
      setReportImages(prev => [...prev, ...result.assets]);
    }
  };

  const captureImages = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert("Permission required", "Camera permission is required.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7
    });

    if (!result.canceled) {
      setReportImages(prev => [...prev, ...result.assets]);
    }
  };

  const openImageChooser = () => {
    Alert.alert(
      i18n.t("technician.specialServices.photoUpload.add") || "Add Photo",
      i18n.t("common.chooseOption") || "Choose an option",
      [
        { text: i18n.t("components.chemicalsDropdown.camera") || "Camera", onPress: captureImages },
        { text: i18n.t("components.chemicalsDropdown.gallery") || "Gallery", onPress: pickImagesFromGallery },
        { text: i18n.t("common.cancel"), style: "cancel" },
      ]
    );
  };

  /* =========================
     HELPERS - SAME AS INSECTICIDESCREEN
  ========================= */
  const getStableLogId = () => {
    if (session?.visitId) return `visit_${session.visitId}`;
    const d = session?.appointmentDate || 'NA';
    const t = session?.appointmentTime || 'NA';
    const c = customer?.customerId || 'NA';
    return `disinfection_${d}_${t}_${c}`;
  };

  const getDisinfectionDetailsLabel = () => {

  // First check our state
    if (disinfectionDetails && disinfectionDetails.trim()) {
      return disinfectionDetails;
    }
    
    // Check all possible sources
    const details = 
      session?.disinfectionDetails ||
      session?.appointment?.disinfectionDetails ||
      session?.rawAppointment?.disinfectionDetails ||
      session?.rawAppointment?.disinfection_details ||  // ← This is where AdminTechSchedule saves it
      session?.rawAppointment?.otherPestName ||
      session?.rawAppointment?.other_pest_name ||
      session?.rawAppointment?.specialServiceSubtype ||
      session?.rawAppointment?.special_service_subtype ||
      session?.rawAppointment?.treatment_details ||
      session?.rawAppointment?.notes ||
      '';
    return details;
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => String(n).padStart(2, "0");

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  /* =========================
    LOAD EXISTING SERVICE (EDIT MODE) - SAME AS INSECTICIDESCREEN
  ========================= */
  useEffect(() => {
    const load = async () => {
      try {
        // Set loading first
        setLoading(true);
        
        // First, try to load disinfection details from session
        const disinfectionDetailsFromSession = getDisinfectionDetailsLabel();
        if (disinfectionDetailsFromSession) {
          setDisinfectionDetails(disinfectionDetailsFromSession);
          setServiceTypeLabel(`${i18n.t("serviceTypes.disinfection")} - ${disinfectionDetailsFromSession}`);
        }

        // Check if we have a completed appointment with visitId
        const hasVisitId = session?.visitId || session?.rawAppointment?.visitId;
        const isCompleted = session?.status === "completed" || 
                          session?.rawAppointment?.status === "completed";

        // If we have a visitId, try to load the service log
        if (hasVisitId) {
          const visitIdToUse = session.visitId || session.rawAppointment?.visitId;
         
          try {
            const res = await apiService.getServiceLogByVisitId(visitIdToUse);
            if (res?.success) {
              // Handle both response formats
              const log = res.log || res.report;
              
              if (log) {

                // Extract logId from multiple sources
                const extractedLogId = 
                  log.log_id || 
                  log.logId || 
                  log.visitId || 
                  visitIdToUse;
                
                setLogId(extractedLogId);
                setVisitId(log.visit_id || visitIdToUse);

                // LOAD EXISTING IMAGES
                if (log?.images && Array.isArray(log.images)) {
                  const cleaned = log.images
                    .map(img => {
                      if (!img) return null;
                      let v = String(img).split("?")[0].trim();
                      if (v.includes("/")) v = v.substring(v.lastIndexOf("/") + 1);
                      return v;
                    })
                    .filter(Boolean);

                  setExistingImages(cleaned);
                }
                
                // CRITICAL FIX: Load chemicals from chemicals_used
                const chemicalsFromLog = log.chemicals_used || log.chemicalsUsed || [];

                const normalizedChemicals = chemicalsFromLog.map(c => {
                  if (typeof c === "string") return { name: c, concentration: '', volume: '' };
                  return {
                    name: c.name || c.chemicalName || c.chemical || "",
                    concentration: c.concentration || c.concentrationPercent || "",
                    volume: c.volume || c.volumeMl || ""
                  };
                }).filter(c => c?.name);
                
                setSelectedChemicals(normalizedChemicals);
                
                // CRITICAL FIX: Load treated areas from treated_areas
                const areasFromLog = log.treated_areas || log.treatedAreas || [];

                // Ensure areas have the right structure
                const normalizedAreas = areasFromLog.map(area => ({
                  id: area.id || `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: area.name || '',
                  chemicals: Array.isArray(area.chemicals) ? area.chemicals.map(chem => ({
                    name: chem.name || chem.chemicalName || '',
                    concentration: chem.concentration || '',
                    volume: chem.volume || ''
                  })) : [],
                  concentrationPercent: area.concentrationPercent || '',
                  volumeMl: area.volumeMl || '',
                  areaNotes: area.areaNotes || ''
                }));
                setTreatedAreas(normalizedAreas);
                
                // Get notes
                const notesFromLog = log.notes || "";
                setNotes(notesFromLog);
                
                // Set service as started and completed for edit mode
                setServiceStarted(true);
                setServiceCompleted(true);
                setShowGenerateReport(true);
                
                // Get service start time
                const startTime = 
                  log.serviceStartTime || 
                  log.service_start_time || 
                  (log.serviceStartTime ? new Date(log.serviceStartTime).getTime() : null);
                
                setServiceStartTime(startTime);
                
                // Calculate elapsed time
                if (log.duration) {
                  setStoredDuration(log.duration);
                  setElapsedTime(log.duration * 1000); // Convert seconds to ms for display
                } else if (startTime) {
                  setElapsedTime(Date.now() - new Date(startTime).getTime());
                }
                
                // Also load disinfection details from log if available
                const logDisinfectionDetails = 
                  log.disinfectionDetails ||
                  log.disinfection_details ||
                  log.otherPestName ||
                  log.other_pest_name;
                  
                if (logDisinfectionDetails) {
                  setDisinfectionDetails(logDisinfectionDetails);
                  setServiceTypeLabel(`${i18n.t("serviceTypes.disinfection")} - ${logDisinfectionDetails}`);
                }
              }
            }
          } catch (logError) {
            console.warn("⚠️ Could not load service log:", logError.message);
            // Don't fail if log doesn't exist yet
          }
        }
        
        // If we don't have disinfection details yet, try to fetch from schedule
        if (!disinfectionDetailsFromSession) {
          await fetchDisinfectionDetailsFromSchedule();
        }

      } catch (error) {
        console.error("Failed to load service data:", error);
        // Don't show error if it's just that report doesn't exist
        if (!error.message?.includes("Property 'report' doesn't exist")) {
          console.error("Failed to load service data:", error);
        }
      } finally {
        setLoading(false);
      }
    };
    
    load();
  }, [session]);

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


  useEffect(() => {
      if (!session?.appointmentId) return;

      let cancelled = false;

      (async () => {
        try {
          const appointments = await apiService.getAppointments({
            dateFrom: session?.appointmentDate,
            dateTo: session?.appointmentDate
          });
          
          if (!appointments || cancelled) return;

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

  useEffect(() => {
    const loadChemicalsForDropdown = async () => {
      try {
        // Method 1: Use getChemicals()
        const chemicals = await apiService.getChemicals();
        // Extract just the names
        const chemicalNames = chemicals
          .map(chem => {
            if (!chem) return '';
            if (typeof chem === 'string') return chem;
            if (chem && typeof chem === 'object') return chem.name || '';
            return '';
          })
          .filter(name => name);
      
        setAvailableChemicals(chemicalNames);
        
      } catch (error) {
        console.error("❌ Failed to load chemicals:", error);
        setAvailableChemicals([]);
      }
    };
    
    loadChemicalsForDropdown();
  }, []);

  const showStartServiceAlert = () => {
    Alert.alert(
      i18n.t("technician.specialServices.alerts.startServiceRequired"),
      i18n.t("technician.specialServices.alerts.startServiceMessage"),
      [{ text: i18n.t("technician.common.ok") }]
    );
  };

  /* =========================
     FETCH DISINFECTION DETAILS FROM SCHEDULE - SAME PATTERN
  ========================= */
  const fetchDisinfectionDetailsFromSchedule = async () => {
    try {
      const appointments = await apiService.getAppointments({
        dateFrom: session?.appointmentDate,
        dateTo: session?.appointmentDate
      });

      if (!appointments || !Array.isArray(appointments)) {
        return;
      }

      // Look for the matching appointment
      const matchingAppointment = appointments.find(appt => {
        // Extract customer ID from various possible fields
        const apptCustomerId = appt.customer_id || appt.customerId || appt.customer?.customerId;
        
        // Extract date
        let apptDate;
        if (appt.appointment_date) {
          if (appt.appointment_date.includes('T')) {
            const dateObj = new Date(appt.appointment_date);
            apptDate = dateObj.toISOString().split('T')[0];
          } else {
            apptDate = appt.appointment_date;
          }
        } else if (appt.date) {
          apptDate = appt.date;
        } else if (appt.appointmentDate) {
          apptDate = appt.appointmentDate;
        }
        
        // Extract time
        const apptTime = appt.appointment_time || appt.time || appt.appointmentTime;
        
        // Check service type
        const apptServiceType = appt.service_type || appt.serviceType;
        const isDisinfection = apptServiceType === 'disinfection';
        
        const customerMatch = apptCustomerId === customer?.customerId;
        const dateMatch = apptDate === session?.appointmentDate;
        const timeMatch = apptTime === session?.appointmentTime;
        
        return customerMatch && dateMatch && timeMatch && isDisinfection;
      });
      if (matchingAppointment) {
        // Check ALL possible fields - including different naming conventions
        const details = 
          matchingAppointment.disinfectionDetails ||          // camelCase
          matchingAppointment.disinfection_details ||        // underscore
          matchingAppointment.treatment_details ||           // alternative
          matchingAppointment.treatmentDetails ||            // alternative camelCase
          matchingAppointment.otherPestName ||              // from other service types
          matchingAppointment.other_pest_name ||            // underscore version
          matchingAppointment.notes ||                      // generic notes
          matchingAppointment.details ||                    // generic details
          '';
        if (details && details.trim()) {
          setDisinfectionDetails(details);
          setServiceTypeLabel(`${i18n.t("serviceTypes.disinfection")} - ${details}`);
          return;
        } else {
          
          // Also check appointment data if it exists
          if (matchingAppointment.appointment) {
            const appointmentDetails = 
              matchingAppointment.appointment.disinfectionDetails ||
              matchingAppointment.appointment.disinfection_details ||
              matchingAppointment.appointment.treatment_details ||
              matchingAppointment.appointment.otherPestName ||
              matchingAppointment.appointment.notes;
            
            if (appointmentDetails) {             
              setDisinfectionDetails(appointmentDetails);
              setServiceTypeLabel(`${i18n.t("serviceTypes.disinfection")} - ${appointmentDetails}`);
              return;
            }
          }
          
          // If still no details, check if there's insecticide details (admin might have used wrong field)
          const insecticideDetails = 
            matchingAppointment.insecticideDetails ||
            matchingAppointment.insecticide_details;
          
          if (insecticideDetails) {
            setDisinfectionDetails(insecticideDetails);
            setServiceTypeLabel(`${i18n.t("serviceTypes.disinfection")} - ${insecticideDetails}`);
            return;
          }
        }
      } 
      // If we get here, no details were found
      setDisinfectionDetails('');
      setServiceTypeLabel(i18n.t("serviceTypes.disinfection"));
      
    } catch (error) {
      console.error("❌ Failed to fetch disinfection details:", error);
      setDisinfectionDetails('');
      setServiceTypeLabel(i18n.t("serviceTypes.disinfection"));
    }
  };

  /* =========================
     TIMER - SAME AS INSECTICIDESCREEN
  ========================= */
  useEffect(() => {
    if (serviceStarted && !serviceCompleted) {
      timerRef.current = setInterval(() => {
        if (serviceStartTime) {
          setElapsedTime(Date.now() - serviceStartTime);
        }
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [serviceStarted, serviceCompleted, serviceStartTime]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  /* =========================
     ACTIONS - SAME AS INSECTICIDESCREEN
  ========================= */
  const startService = () => {
    // If we already have data loaded (edit mode), just enable editing
    if (selectedChemicals.length > 0 || treatedAreas.length > 0 || notes) {
      
      Alert.alert(
        i18n.t("technician.specialServices.alerts.editMode") || "Edit Service",
        i18n.t("technician.specialServices.alerts.editModeMessage") || "You are entering edit mode. All existing data will be preserved.",
        [
          { 
            text: i18n.t("common.cancel"), 
            style: "cancel" 
          },
          { 
            text: i18n.t("technician.specialServices.actionButtons.updateService") || "Edit Service", 
            style: "default",
            onPress: () => {
              setServiceStarted(true);
              setServiceCompleted(true);
              setShowGenerateReport(true);
              
              // Don't reset timer for edit mode
              if (!serviceStartTime) {
                setServiceStartTime(Date.now() - 3600000); // 1 hour ago
              }
              
              Alert.alert(
                i18n.t("technician.specialServices.alerts.editMode") || 'Edit Mode', 
                i18n.t("technician.specialServices.alerts.editModeMessage") || 'You can now edit the service data.'
              );
            }
          }
        ]
      );
      return;
    }

    // If we have a completed appointment but no data loaded yet
    if ((session?.status === "completed" && session?.visitId) || 
        (session?.rawAppointment?.status === "completed" && session?.rawAppointment?.visitId)) {
      
      Alert.alert(
        i18n.t("technician.common.info") || "Load Completed Service",
        i18n.t("technician.specialServices.alerts.dataNotReadyMessage") || "This service has already been completed. Would you like to load the existing data for editing?",
        [
          { 
            text: i18n.t("common.cancel"), 
            style: "cancel" 
          },
          { 
            text: i18n.t("technician.specialServices.actionButtons.loadData") || "Load & Edit", 
            style: "default",
            onPress: async () => {
              try {
                setLoading(true);
                const visitIdToLoad = session.visitId || session.rawAppointment?.visitId;
                const res = await apiService.getServiceLogByVisitId(visitIdToLoad);
                
                if (res?.success && res.log) {
                  const log = res.log;
                  
                  // Load chemicals
                  const chemicalsFromLog = log.chemicals_used || log.chemicalsUsed || [];
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
                  const areasFromLog = log.treated_areas || log.treatedAreas || [];
                  setTreatedAreas(areasFromLog);
                  
                  // Set service states
                  setServiceStarted(true);
                  setServiceCompleted(true);
                  setShowGenerateReport(true);
                  
                  Alert.alert(
                    i18n.t("technician.specialServices.alerts.editMode") || 'Edit Mode', 
                    i18n.t("technician.specialServices.alerts.dataNotReady") || 'Service data loaded. You can now edit.'
                  );
                } else {
                  Alert.alert(
                    i18n.t("common.error"), 
                    i18n.t("technician.specialServices.errors.noDataFound") || 'Could not load existing service data. Starting new service instead.'
                  );
                  // Start fresh if loading fails
                  const start = Date.now();
                  setServiceStartTime(start);
                  setServiceStarted(true);
                  setServiceCompleted(false);
                }
              } catch (error) {
                console.error("Failed to load service data:", error);
                Alert.alert(
                  i18n.t("common.error"), 
                  i18n.t("technician.specialServices.errors.noDataFound") || 'Failed to load service data'
                );
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
      return;
    }

    // Normal start for new appointments
    const start = Date.now();
    setServiceStartTime(start);
    setServiceStarted(true);
    setServiceCompleted(false);
    setHasGeneratedReport(false);
    
    Alert.alert(
      i18n.t("technician.specialServices.alerts.serviceStarted") || 'Service Started', 
      `${getDisinfectionDetailsLabel() ? `${i18n.t("serviceTypes.disinfection")} - ${getDisinfectionDetailsLabel()}` : i18n.t("serviceTypes.disinfection")} ${i18n.t("technician.specialServices.alerts.serviceStartedMessage", { 
        name: customer?.customerName || i18n.t("technician.common.customer") 
      })}`
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
    // Validate required fields
    if (!customer?.customerId || !technician?.id) {
      throw new Error(i18n.t("technician.specialServices.errors.missingInfo") || "Missing customer or technician information");
    }

    // Format chemicals properly
    const formattedChemicals = selectedChemicals.map(chem => {
      if (typeof chem === 'string') {
        return { 
          name: chem, 
          concentration: '', 
          volume: '' 
        };
      }
      return {
        name: chem.name || chem.chemicalName || '',
        concentration: chem.concentration || chem.concentrationPercent || '',
        volume: chem.volume || chem.volumeMl || ''
      };
    }).filter(chem => chem.name);
    // Format treated areas
    const formattedTreatedAreas = treatedAreas.map(area => {
      const areaChemicals = Array.isArray(area.chemicals) 
        ? area.chemicals.map(chem => {
            if (typeof chem === 'string') {
              return { name: chem, concentration: '', volume: '' };
            }
            return {
              name: chem.name || chem.chemicalName || '',
              concentration: chem.concentration || chem.concentrationPercent || '',
              volume: chem.volume || chem.volumeMl || ''
            };
          }).filter(chem => chem.name)
        : [];

      return {
        id: area.id || `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: area.name || '',
        chemicals: areaChemicals,
        concentrationPercent: area.concentrationPercent || '',
        volumeMl: area.volumeMl || '',
        areaNotes: area.areaNotes || ''
      };
    });

    // Create stableVisitId
    const stableVisitId =
      session?.visitId ||
      logId ||
      getStableLogId();

    const finalLogId = logId || stableVisitId;

    // Calculate duration with multiple fallbacks
    let durationSeconds = 0;

    // Try 1: Use storedDuration if available and valid
    if (storedDuration !== null && storedDuration !== undefined) {
      const parsed = Number(storedDuration);
      if (!isNaN(parsed) && parsed > 0) {
        durationSeconds = parsed;
      }
    }

    // Try 2: Calculate from serviceStartTime if storedDuration didn't work
    if (durationSeconds === 0 && serviceStartTime) {
      const startTimeNum = Number(serviceStartTime);
      if (!isNaN(startTimeNum) && startTimeNum > 0) {
        const now = Date.now();
        const diffMs = now - startTimeNum;
        const diffSeconds = Math.floor(diffMs / 1000);
        
        if (!isNaN(diffSeconds) && diffSeconds > 0 && diffSeconds < 86400) { // Less than 24 hours
          durationSeconds = diffSeconds;
        }
      } else {
        // Try to parse serviceStartTime as ISO string
        try {
          const startDate = new Date(serviceStartTime);
          if (!isNaN(startDate.getTime())) {
            const now = Date.now();
            const diffMs = now - startDate.getTime();
            const diffSeconds = Math.floor(diffMs / 1000);
            
            if (!isNaN(diffSeconds) && diffSeconds > 0 && diffSeconds < 86400) {
              durationSeconds = diffSeconds;
            }
          }
        } catch (e) {
          console.warn("⚠️ Could not parse serviceStartTime as date:", e);
        }
      }
    }

    // Try 3: Use elapsedTime if available
    if (durationSeconds === 0 && elapsedTime) {
      const elapsedSeconds = Math.floor(elapsedTime / 1000);
      if (!isNaN(elapsedSeconds) && elapsedSeconds > 0) {
        durationSeconds = elapsedSeconds;
      }
    }

    // Final fallback
    if (durationSeconds === 0 || isNaN(durationSeconds)) {
      console.warn("⚠️ No valid duration found, using default 3600 seconds");
      durationSeconds = 3600; // 1 hour default
    }

    // Now create the payload with this validated duration
    const payload = {
      logId: finalLogId,
      visitId: stableVisitId,
      customerId: customer.customerId,
      customerName: customer.customerName,
      technicianId: technician.id,
      technicianName: `${technician.firstName} ${technician.lastName}`,
      serviceType: 'disinfection',
      disinfectionDetails: getDisinfectionDetailsLabel() ||
        session?.rawAppointment?.otherPestName ||
        session?.rawAppointment?.disinfectionDetails ||
        session?.rawAppointment?.disinfection_details ||
        session?.rawAppointment?.other_pest_name ||
        '',
      serviceStartTime: serviceStartTime ? new Date(serviceStartTime).toISOString() : new Date().toISOString(),
      serviceEndTime: new Date().toISOString(),
      duration: durationSeconds, // Now this is guaranteed to be a valid number
      chemicals_used: formattedChemicals,
      treated_areas: formattedTreatedAreas,
      notes: notes || '',
      updatedAt: new Date().toISOString(),
    };
    // Create FormData
    const formData = new FormData();

    // Add all payload fields - stringify arrays/objects
    Object.keys(payload).forEach(key => {
      const value = payload[key];

      if (key === 'chemicals_used' || key === 'treated_areas') {
        formData.append(key, JSON.stringify(value));
      } else if (typeof value === 'object' && value !== null) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value)); // Convert to string
      }
    });

    // Add images
    reportImages.forEach((img, index) => {
      formData.append("images", {
        uri: img.uri,
        name: img.fileName || `photo_${Date.now()}_${index}.jpg`,
        type: "image/jpeg"
      });
    });
    
    if (existingImages.length > 0) {
      formData.append("existingImages", JSON.stringify(existingImages));
    }

    const res = await apiService.submitServiceLog(formData);

    if (!res?.success) throw new Error(i18n.t("technician.specialServices.errors.saveFailed") || 'Save failed');

    if (session?.appointmentId) {
      await markAppointmentCompleted(
        session.appointmentId,
        payload.visitId,
        session.rawAppointment || session.appointment
      );
    }

    setLogId(finalLogId);
    setVisitId(stableVisitId);
    setServiceCompleted(true);
    setShowGenerateReport(true);
    setHasGeneratedReport(false);
    
    // FIX: Store finalLogId in a variable that's accessible in the callback
    const reportId = finalLogId;
    
    Alert.alert(
      i18n.t("technician.specialServices.alerts.serviceCompleted") || 'Service Completed', 
      i18n.t("technician.specialServices.alerts.serviceCompletedMessage") || 'Data saved successfully.\n\nYou can now generate a report.',
      [
        { 
          text: i18n.t("technician.common.ok"),
          onPress: () => {
            onGenerateReport({
              ...buildDisinfectionReportContext(reportId),
              duration: formatTime(durationSeconds * 1000),
              visitId: reportId,
              _refreshKey: Date.now()
            });
          }
        }
      ]
    );
    
  } catch (e) {
    console.error("❌ Complete service error:", e);
    Alert.alert(
      i18n.t("common.error"), 
      e.message || i18n.t("technician.specialServices.errors.saveFailed") || 'Failed to complete service'
    );
  }
};

  const updateService = async () => {
    try {
      // Validate required fields
      if (!customer?.customerId || !technician?.id) {
        throw new Error(i18n.t("technician.specialServices.errors.missingInfo") || "Missing customer or technician information");
      }
      
      // Use logId, visitId, or create a new stable ID
      const stableLogId = logId || visitId || session?.visitId || getStableLogId();
      
      if (!stableLogId) {
        Alert.alert(
          i18n.t("common.error"), 
          i18n.t("technician.specialServices.errors.missingServiceId") || "Missing service ID. Cannot update."
        );
        return;
      }

      // Format chemicals properly
      const formattedChemicals = selectedChemicals.map(chem => {
        if (typeof chem === 'string') {
          return { 
            name: chem, 
            concentration: '', 
            volume: '' 
          };
        }
        return {
          name: chem.name || chem.chemicalName || '',
          concentration: chem.concentration || chem.concentrationPercent || '',
          volume: chem.volume || chem.volumeMl || ''
        };
      }).filter(chem => chem.name);
    
      // Format treated areas
      const formattedTreatedAreas = treatedAreas.map(area => {
        const areaChemicals = Array.isArray(area.chemicals) 
          ? area.chemicals.map(chem => {
              if (typeof chem === 'string') {
                return { name: chem, concentration: '', volume: '' };
              }
              return {
                name: chem.name || chem.chemicalName || '',
                concentration: chem.concentration || chem.concentrationPercent || '',
                volume: chem.volume || chem.volumeMl || ''
              };
            }).filter(chem => chem.name)
          : [];

        return {
          id: area.id || `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: area.name || '',
          chemicals: areaChemicals,
          concentrationPercent: area.concentrationPercent || '',
          volumeMl: area.volumeMl || '',
          areaNotes: area.areaNotes || ''
        };
      });
      
      const effectiveStartTime = serviceStartTime || Date.now() - 3600000;
      const stableVisitId = visitId || session?.visitId || stableLogId;
      
      // CRITICAL FIX: Calculate duration properly and ensure it's a number
      let durationSeconds = 0;
      
      // Try to get duration from storedDuration or calculate from serviceStartTime
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
      
      // Ensure duration is a valid positive number
      if (!durationSeconds || isNaN(durationSeconds) || durationSeconds <= 0) {
        console.warn("⚠️ Invalid duration, using default 3600 seconds");
        durationSeconds = 3600; // Default to 1 hour
      }
      
      // Make sure it's a number, not a string
      durationSeconds = Number(durationSeconds);
      
      const payload = {
        logId: stableLogId,
        visitId: stableVisitId,
        customerId: customer.customerId,
        customerName: customer.customerName,
        technicianId: technician.id,
        technicianName: `${technician.firstName} ${technician.lastName}`,
        serviceType: 'disinfection',
        disinfectionDetails: getDisinfectionDetailsLabel() ||
          session?.rawAppointment?.otherPestName ||
          session?.rawAppointment?.disinfectionDetails ||
          session?.rawAppointment?.disinfection_details ||
          session?.rawAppointment?.other_pest_name ||
          '',
        serviceStartTime: new Date(effectiveStartTime).toISOString(),
        serviceEndTime: new Date().toISOString(),
        duration: durationSeconds, // This is now a number
        chemicals_used: formattedChemicals,
        treated_areas: formattedTreatedAreas,
        notes: notes || '',
        updatedAt: new Date().toISOString(),
      }; 

      const formData = new FormData();

      // Stringify ALL array/object fields before appending
      Object.keys(payload).forEach(key => {
        const value = payload[key];

        if (key === 'chemicals_used' || key === 'treated_areas') {
          // These MUST be stringified JSON
          formData.append(key, JSON.stringify(value));
        } else if (key === 'duration') {
          // CRITICAL: Duration must be a number, not a string
          // When using FormData, we need to append it as a string, but ensure it's a valid number string
          const durationValue = String(value);
          formData.append(key, durationValue);
        } else if (typeof value === 'object' && value !== null) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });

      // Add images
      if (reportImages.length > 0) {
        reportImages.forEach((img, index) => {
          formData.append("images", {
            uri: img.uri,
            name: img.fileName || `photo_${Date.now()}_${index}.jpg`,
            type: "image/jpeg"
          });
        });
      }
      
      // Add existing images
      if (existingImages.length > 0) {
        formData.append("existingImages", JSON.stringify(existingImages));
      }

      // Log the actual duration value in FormData
      // @ts-ignore
      const durationPart = formData._parts?.find(part => part[0] === 'duration');

      const res = await apiService.submitServiceLog(formData);
      
      if (!res?.success) {
        throw new Error(res?.error || i18n.t("technician.specialServices.errors.updateFailed") || 'Update failed');
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
        i18n.t("technician.specialServices.alerts.serviceUpdated") || 'Service Updated', 
        i18n.t("technician.specialServices.alerts.serviceUpdatedMessage") || 'Data saved successfully!\n\nYou will be navigated to Report Screen automatically.',
        [
          { 
            text: i18n.t("technician.common.ok"), 
            onPress: () => {
              onGenerateReport({
                ...buildDisinfectionReportContext(stableVisitId),
                duration: formatTime(durationSeconds),
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
        i18n.t("common.error"), 
        e.message || i18n.t("technician.specialServices.errors.updateFailed") || 'Failed to update service'
      );
    }
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

  const buildDisinfectionReportContext = (visitIdOverride) => {
    const date = new Date();
    const effectiveVisitId = visitIdOverride || visitId || session?.visitId;
    
    if (!effectiveVisitId) {
      console.warn("⚠️ No visitId available for report context");
    }
    
    const detailsText = getDisinfectionDetailsLabel() || '';
    
    return {
      date: date.toLocaleDateString(),
      duration: formatTime(
        storedDuration !== null ? storedDuration : elapsedTime
      ),
      customerName: customer?.customerName || i18n.t("technician.common.unknown") || 'Unknown Customer',
      technicianName: technician ? `${technician.firstName} ${technician.lastName}` : i18n.t("technician.common.unknown") || 'Unknown Technician',
      serviceType: 'disinfection',
      serviceTypeName: detailsText 
        ? `${i18n.t("serviceTypes.disinfection")} - ${detailsText}`
        : i18n.t("technician.disinfection.title") || 'Disinfection Service',
      visitId: effectiveVisitId,
      disinfection_details: detailsText,  // snake_case
      disinfectionDetails: detailsText,   // camelCase
      details: detailsText,                // generic details field
      otherPestName: detailsText,          // fallback
      other_pest_name: detailsText, 
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
      i18n.t("technician.specialServices.alerts.cancelServiceConfirm") || "Cancel Service",
      i18n.t("technician.specialServices.alerts.unsavedChangesMessage") || "Are you sure you want to cancel this service? All unsaved data will be lost.",
      [
        { 
          text: i18n.t("technician.specialServices.alerts.continueService") || "No, Continue", 
          style: "cancel" 
        },
        { 
          text: i18n.t("technician.specialServices.alerts.cancelServiceConfirm") || "Yes, Cancel", 
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
     RENDER CONTENT - PROFESSIONAL DESIGN - SAME AS INSECTICIDESCREEN
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
                  i18n.t("technician.specialServices.alerts.unsavedChanges") || "Unsaved Changes",
                  i18n.t("technician.specialServices.alerts.unsavedChangesMessage") || "You have an active service. Do you want to cancel it?",
                  [
                    { text: i18n.t("technician.specialServices.alerts.continueService") || "Continue Service", style: "cancel" },
                    { 
                      text: i18n.t("technician.specialServices.alerts.cancelServiceConfirm") || "Cancel Service", 
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
              {getDisinfectionDetailsLabel() 
                ? `${i18n.t("serviceTypes.disinfection")} - ${getDisinfectionDetailsLabel()}`
                : i18n.t("technician.disinfection.title") || 'Disinfection Service'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {serviceStarted 
                ? i18n.t("technician.specialServices.serviceInProgress") || 'Service in Progress'
                : i18n.t("technician.specialServices.serviceSetup") || 'Service Setup'}
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

        {/* EDIT MODE LOAD DATA BUTTON */}
        {serviceCompleted && !selectedChemicals.length && !treatedAreas.length && !notes && (
          <TouchableOpacity 
            style={[styles.secondaryButton, { backgroundColor: '#1f9c8b' }]} 
            onPress={async () => {
              try {
                setLoading(true);
                const visitIdToLoad = visitId || session?.visitId;
                
                if (!visitIdToLoad) {
                  Alert.alert(
                    i18n.t("common.error"), 
                    i18n.t("technician.specialServices.errors.noVisitId") || 'No visit ID found to load data'
                  );
                  return;
                }
                
                const res = await apiService.getServiceLogByVisitId(visitIdToLoad);
                
                if (res?.success && res.log) {
                  const log = res.log;
                  
                  // Load chemicals
                  const chemicalsFromLog = log.chemicals_used || log.chemicalsUsed || [];
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
                  const areasFromLog = log.treated_areas || log.treatedAreas || [];
                  setTreatedAreas(areasFromLog);
                  
                  Alert.alert(
                    i18n.t("technician.common.success"), 
                    i18n.t("technician.specialServices.alerts.serviceUpdated") || 'Service data loaded successfully'
                  );
                } else {
                  Alert.alert(
                    i18n.t("common.error"), 
                    i18n.t("technician.specialServices.errors.noDataFound") || 'No data found for this service'
                  );
                }
              } catch (error) {
                console.error("Failed to load data:", error);
                Alert.alert(
                  i18n.t("common.error"), 
                  i18n.t("technician.specialServices.errors.noDataFound") || 'Failed to load service data'
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            <MaterialIcons name="cloud-download" size={20} color="#fff" />
            <Text style={styles.secondaryButtonText}>{i18n.t("technician.specialServices.actionButtons.loadData") || 'Load Service Data'}</Text>
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
        nestedScrollEnabled={true}
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
                {i18n.t("technician.specialServices.service")} <Text style={styles.serviceTypeValue}>
                  {getDisinfectionDetailsLabel() 
                    ? `${i18n.t("serviceTypes.disinfection")} - ${getDisinfectionDetailsLabel()}`
                    : i18n.t("serviceTypes.disinfection")}
                </Text>
              </Text>
            </View>
          </View>

          {/* Warning message if no disinfection details specified */}
          {(!getDisinfectionDetailsLabel() || getDisinfectionDetailsLabel().trim() === '') && (
            <View style={styles.warningCard}>
              <MaterialIcons name="info" size={20} color="#ff9800" />
              <Text style={styles.warningText}>
                {i18n.t("technician.disinfection.warning.noDetails") || 
                  "This disinfection appointment doesn't have specific details. Please contact admin or specify the treatment in your notes below."}
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
            {!serviceStarted && !serviceCompleted && (
              <Text style={styles.disabledHint}>{i18n.t("technician.specialServices.startHint")}</Text>
            )}
            {serviceCompleted && selectedChemicals.length === 0 && (
              <Text style={styles.disabledHint}>{i18n.t("technician.specialServices.updateHint") || "Update service to edit chemicals"}</Text>
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
                
                // Create new area with empty chemicals array
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
                        {a.chemicals.length} {i18n.t("technician.specialServices.chemicalsInArea")}
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
        <View style={{ marginTop: 20 }}>

          {/* Title row aligned like other section headers */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <MaterialIcons name="add-a-photo" size={20} color="#1f9c8b" />
            <Text style={{ marginLeft: 6, fontSize: 16, fontWeight: "600", color: "#333" }}>
              {i18n.t("technician.specialServices.treatmentPhotos")}
            </Text>
          </View>

          {/* Upload Button */}
          <TouchableOpacity
            style={{ marginBottom: 40, marginTop: 20,alignItems: "flex-start" }}
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

          {/* Image Preview */}
          {(existingImages.length > 0 || reportImages.length > 0) && (
            <View style={{ marginTop: 15 }} >
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>

                {/* EXISTING IMAGES */}
                {existingImages.map((img, index) => (
                  <View key={`existing-${index}`} style={{ marginRight: 10, position: "relative" }}>
                    <Image
                      source={{ uri: buildImageUrl(img) }}
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
                        const updated = existingImages.filter((_, i) => i !== index);
                        setExistingImages(updated);
                      }}
                    >
                      <MaterialIcons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}

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
            </View>
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
                !getDisinfectionDetailsLabel() && styles.warningButton
              ]} 
              onPress={startService}
            >
              <MaterialIcons name="play-arrow" size={22} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {!getDisinfectionDetailsLabel() 
                  ? i18n.t("technician.disinfection.actionButtons.startNoDetails") || 'Start Service (No Details)'
                  : i18n.t("technician.disinfection.actionButtons.startService") || `Start ${serviceTypeLabel}`}
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
                    const reportContext = buildDisinfectionReportContext(visitId || logId);
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
            {i18n.t("technician.disinfection.footer") || "Pestify Technician Portal • Disinfection Module"}
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
          <Text style={styles.loadingText}>{i18n.t("technician.common.loading")} {i18n.t("serviceTypes.disinfection").toLowerCase()}...</Text>
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
   PROFESSIONAL STYLES - EXACTLY LIKE INSECTICIDESCREEN
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