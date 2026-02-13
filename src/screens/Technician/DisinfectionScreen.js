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
  const [serviceTypeLabel, setServiceTypeLabel] = useState('Disinfection');

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
    console.log("🔍 DISINFECTION DETAILS CHECK - FULL DEBUG:", {
      // Check our state
      stateDisinfectionDetails: disinfectionDetails,
      hasStateDetails: !!disinfectionDetails,
      
      // Check session directly
      sessionDisinfectionDetails: session?.disinfectionDetails,
      
      // Check appointment
      appointmentDisinfectionDetails: session?.appointment?.disinfectionDetails,
      
      // Check raw appointment - THIS IS CRITICAL
      rawAppointment: session?.rawAppointment,
      rawDisinfectionDetails: session?.rawAppointment?.disinfectionDetails,
      rawDisinfection_details: session?.rawAppointment?.disinfection_details, // with underscore
      
      // Check other possible fields
      rawOtherPestName: session?.rawAppointment?.otherPestName,
      rawOther_pest_name: session?.rawAppointment?.other_pest_name,
      
      // Check the actual appointment object from API
      hasAppointmentId: !!session?.appointmentId,
      appointmentDate: session?.appointmentDate,
      appointmentTime: session?.appointmentTime
    });

  // First check our state
    if (disinfectionDetails && disinfectionDetails.trim()) {
      console.log("✅ Using state disinfection details:", disinfectionDetails);
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
    
    console.log("🔍 Extracted disinfection details:", details || "(empty)");
    
    return details;
  };

  const formatTime = (ms) => {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h) return `${h}h ${m}m ${s}s`;
    if (m) return `${m}m ${s}s`;
    return `${s}s`;
  };

  /* =========================
    LOAD EXISTING SERVICE (EDIT MODE) - SAME AS INSECTICIDESCREEN
  ========================= */
  useEffect(() => {
    const load = async () => {
      console.log("🧠 DisinfectionScreen session:", session);

      try {
        // Set loading first
        setLoading(true);
        
        // First, try to load disinfection details from session
        const disinfectionDetailsFromSession = getDisinfectionDetailsLabel();
        if (disinfectionDetailsFromSession) {
          setDisinfectionDetails(disinfectionDetailsFromSession);
          setServiceTypeLabel(`Disinfection - ${disinfectionDetailsFromSession}`);
        }

        // Check if we have a completed appointment with visitId
        const hasVisitId = session?.visitId || session?.rawAppointment?.visitId;
        const isCompleted = session?.status === "completed" || 
                          session?.rawAppointment?.status === "completed";
        
        console.log("🔍 Edit mode check:", {
          hasVisitId,
          isCompleted,
          sessionStatus: session?.status,
          rawStatus: session?.rawAppointment?.status
        });

        // If we have a visitId, try to load the service log
        if (hasVisitId) {
          const visitIdToUse = session.visitId || session.rawAppointment?.visitId;
          
          console.log("🔍 Loading service log for visitId:", visitIdToUse);
          
          try {
            const res = await apiService.getServiceLogByVisitId(visitIdToUse);
            
            console.log("🔍 Service log API response:", {
              success: res?.success,
              hasLog: !!res?.log,
              hasReport: !!res?.report
            });

            if (res?.success) {
              // Handle both response formats
              const log = res.log || res.report;
              
              if (log) {
                console.log("✅ Found existing service log:", {
                  logId: log.logId || log.visitId,
                  hasChemicals: !!log.chemicalsUsed,
                  hasAreas: !!log.treatedAreas,
                  hasNotes: !!log.notes
                });

                // Extract logId from multiple sources
                const extractedLogId = 
                  log.log_id || 
                  log.logId || 
                  log.visitId || 
                  visitIdToUse;
                
                setLogId(extractedLogId);
                setVisitId(log.visit_id || visitIdToUse);
                
                // Normalize chemicals from either format
                const chemicalsFromLog = log.chemicalsUsed || log.chemicals_used || [];
                const normalizedChemicals = chemicalsFromLog.map(c => {
                  if (typeof c === "string") return { name: c };
                  return {
                    ...c,
                    name: c.name || c.chemicalName || c.chemical || "",
                  };
                }).filter(c => c?.name);
                
                console.log("📋 Loading chemicals:", normalizedChemicals);
                setSelectedChemicals(normalizedChemicals);
                
                // Get notes from either format
                const notesFromLog = log.notes || "";
                console.log("📋 Loading notes:", notesFromLog);
                setNotes(notesFromLog);
                
                // Get treated areas from either format
                const areasFromLog = log.treatedAreas || log.treated_areas || [];
                console.log("📋 Loading treated areas:", areasFromLog.length);
                setTreatedAreas(areasFromLog);
                
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
                  setElapsedTime(log.duration);
                } else if (startTime) {
                  setElapsedTime(Date.now() - new Date(startTime).getTime());
                }
                
                // Also load disinfection details from log if available
                const logDisinfectionDetails = 
                  log.disinfectionDetails ||
                  log.disinfection_details ||
                  log.otherPestName ||
                  log.other_pest_name;
                  
                if (logDisinfectionDetails && !disinfectionDetailsFromSession) {
                  setDisinfectionDetails(logDisinfectionDetails);
                  setServiceTypeLabel(`Disinfection - ${logDisinfectionDetails}`);
                }
                
                console.log("✅ Service loaded in edit mode");
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
            console.log("✏️ Restoring completed disinfection visit from database", appt);

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
        console.log("🔍 Loading chemicals for dropdown...");
        
        // Method 1: Use getChemicals()
        const chemicals = await apiService.getChemicals();
        console.log("🔍 Raw chemicals from API:", chemicals);
        
        // Extract just the names
        const chemicalNames = chemicals
          .map(chem => {
            if (!chem) return '';
            if (typeof chem === 'string') return chem;
            if (chem && typeof chem === 'object') return chem.name || '';
            return '';
          })
          .filter(name => name);
        
        console.log("✅ Chemical names for dropdown:", chemicalNames);
        setAvailableChemicals(chemicalNames);
        
      } catch (error) {
        console.error("❌ Failed to load chemicals:", error);
        setAvailableChemicals([]);
      }
    };
    
    loadChemicalsForDropdown();
  }, []);

  useEffect(() => {
    console.log("=== CHEMICALS DATA FLOW ===");
    console.log("1. selectedChemicals (raw):", selectedChemicals);
    console.log("2. selectedChemicals transformed to strings:", 
      selectedChemicals.map(chem => {
        if (typeof chem === 'string') return chem;
        if (chem && typeof chem === 'object') return chem.name || '';
        return '';
      }).filter(name => name)
    );
    console.log("3. availableChemicals:", availableChemicals);
  }, [selectedChemicals, availableChemicals]);

  const showStartServiceAlert = () => {
    Alert.alert(
      "Start Service Required",
      "Please start the service before entering data.",
      [{ text: "OK" }]
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
      
      console.log("🔍 FETCHING DISINFECTION DETAILS FROM SCHEDULE:", {
        customerId: customer?.customerId,
        date: session?.appointmentDate,
        time: session?.appointmentTime,
        appointmentsCount: appointments?.length,
        rawAppointments: appointments
      });

      if (!appointments || !Array.isArray(appointments)) {
        console.log("⚠️ No appointments returned");
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
        
        console.log("📅 Appointment match check:", {
          apptCustomerId,
          expectedCustomer: customer?.customerId,
          customerMatch,
          apptDate,
          expectedDate: session?.appointmentDate,
          dateMatch,
          apptTime,
          expectedTime: session?.appointmentTime,
          timeMatch,
          serviceType: apptServiceType,
          isDisinfection,
          matchesAll: customerMatch && dateMatch && timeMatch && isDisinfection
        });
        
        return customerMatch && dateMatch && timeMatch && isDisinfection;
      });

      console.log("✅ Found matching disinfection appointment:", matchingAppointment);

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
        
        console.log("🔍 EXTRACTED DISINFECTION DETAILS:", {
          details,
          hasDetails: !!details,
          disinfectionDetails: matchingAppointment.disinfectionDetails,
          disinfection_details: matchingAppointment.disinfection_details, // THIS IS KEY
          treatment_details: matchingAppointment.treatment_details,
          treatmentDetails: matchingAppointment.treatmentDetails,
          otherPestName: matchingAppointment.otherPestName,
          other_pest_name: matchingAppointment.other_pest_name,
          notes: matchingAppointment.notes,
          details: matchingAppointment.details,
          fullAppointment: matchingAppointment
        });
        
        if (details && details.trim()) {
          setDisinfectionDetails(details);
          setServiceTypeLabel(`Disinfection - ${details}`);
          console.log("✅ SET DISINFECTION DETAILS FROM DATABASE:", details);
          return;
        } else {
          console.log("⚠️ No disinfection details found in database appointment");
          
          // Also check appointment data if it exists
          if (matchingAppointment.appointment) {
            const appointmentDetails = 
              matchingAppointment.appointment.disinfectionDetails ||
              matchingAppointment.appointment.disinfection_details ||
              matchingAppointment.appointment.treatment_details ||
              matchingAppointment.appointment.otherPestName ||
              matchingAppointment.appointment.notes;
            
            if (appointmentDetails) {
              console.log("✅ Found details in nested appointment object:", appointmentDetails);
              setDisinfectionDetails(appointmentDetails);
              setServiceTypeLabel(`Disinfection - ${appointmentDetails}`);
              return;
            }
          }
          
          // If still no details, check if there's insecticide details (admin might have used wrong field)
          const insecticideDetails = 
            matchingAppointment.insecticideDetails ||
            matchingAppointment.insecticide_details;
          
          if (insecticideDetails) {
            console.log("🔄 Found insecticide details (admin might have used wrong field):", insecticideDetails);
            setDisinfectionDetails(insecticideDetails);
            setServiceTypeLabel(`Disinfection - ${insecticideDetails}`);
            return;
          }
        }
      } else {
        console.log("❌ No matching disinfection appointment found in database");
      }
      
      // If we get here, no details were found
      console.log("❌ Setting empty disinfection details");
      setDisinfectionDetails('');
      setServiceTypeLabel('Disinfection');
      
    } catch (error) {
      console.error("❌ Failed to fetch disinfection details:", error);
      setDisinfectionDetails('');
      setServiceTypeLabel('Disinfection');
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
      console.log("✏️ Entering edit mode with existing data:", {
        chemicals: selectedChemicals.length,
        areas: treatedAreas.length,
        hasNotes: !!notes
      });
      
      Alert.alert(
        "Edit Service",
        "You are entering edit mode. All existing data will be preserved.",
        [
          { 
            text: "Cancel", 
            style: "cancel" 
          },
          { 
            text: "Edit Service", 
            style: "default",
            onPress: () => {
              setServiceStarted(true);
              setServiceCompleted(true);
              setShowGenerateReport(true);
              
              // Don't reset timer for edit mode
              if (!serviceStartTime) {
                setServiceStartTime(Date.now() - 3600000); // 1 hour ago
              }
              
              Alert.alert('Edit Mode', 
                'You can now edit the service data.'
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
        "Load Completed Service",
        "This service has already been completed. Would you like to load the existing data for editing?",
        [
          { 
            text: "Cancel", 
            style: "cancel" 
          },
          { 
            text: "Load & Edit", 
            style: "default",
            onPress: async () => {
              try {
                setLoading(true);
                const visitIdToLoad = session.visitId || session.rawAppointment?.visitId;
                const res = await apiService.getServiceLogByVisitId(visitIdToLoad);
                
                if (res?.success && res.log) {
                  const log = res.log;
                  
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
                  
                  // Set service states
                  setServiceStarted(true);
                  setServiceCompleted(true);
                  setShowGenerateReport(true);
                  
                  Alert.alert('Edit Mode', 
                    'Service data loaded. You can now edit.'
                  );
                } else {
                  Alert.alert('Error', 
                    'Could not load existing service data. Starting new service instead.'
                  );
                  // Start fresh if loading fails
                  const start = Date.now();
                  setServiceStartTime(start);
                  setServiceStarted(true);
                  setServiceCompleted(false);
                }
              } catch (error) {
                console.error("Failed to load service data:", error);
                Alert.alert('Error', 'Failed to load service data');
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
    
    Alert.alert('Service Started', 
      `${getDisinfectionDetailsLabel() ? `Disinfection - ${getDisinfectionDetailsLabel()}` : 'Disinfection'} service started for ${customer?.customerName || 'customer'}`
    );
};

  const markAppointmentCompleted = async (appointmentId, visitId, appointment) => {
    if (!appointmentId) return;

    console.log("💾 Marking appointment completed:", {
      appointmentId,
      visitId,
      // 🚨 Don't send servicePrice - technicians can't see/set it
      // servicePrice: appointment?.service_price
    });

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
            "Price Not Set",
            "Admin has not set the service price yet. Please contact admin to set the price before completing this appointment.",
            [{ text: "OK" }]
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
        throw new Error("Missing customer or technician information");
      }

      // Format chemicals properly before sending
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
      
      // Format treated areas before sending
      const formattedTreatedAreas = treatedAreas.map(area => ({
        ...area,
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
        concentrationPercent: area.concentrationPercent && !area.concentrationPercent.includes('%') 
          ? `${area.concentrationPercent}%` 
          : area.concentrationPercent || '',
        volumeMl: area.volumeMl && !area.volumeMl.includes('ml')
          ? `${area.volumeMl}ml`
          : area.volumeMl || '',
        areaNotes: area.areaNotes || ''
      }));

      // Create stableVisitId BEFORE using it
      const stableVisitId =
        session?.visitId ||
        logId ||
        getStableLogId();

      const finalLogId = logId || stableVisitId;
      
      // Use finalLogId instead of stableLogId
      console.log("✅ Using logId for completion:", finalLogId);

      const payload = {
        logId: finalLogId, // Use finalLogId here
        visitId: stableVisitId,
        customerId: customer.customerId,
        customerName: customer.customerName,
        technicianId: technician.id,
        technicianName: `${technician.firstName} ${technician.lastName}`,
        serviceType: 'disinfection',
        disinfectionDetails: getDisinfectionDetailsLabel() || 
                     session?.rawAppointment?.otherPestName || 
                     session?.rawAppointment?.disinfectionDetails || 
                     session?.rawAppointment?.other_pest_name || 
                     '',
        serviceStartTime: new Date(serviceStartTime).toISOString(),
        serviceEndTime: new Date().toISOString(),
        duration: Date.now() - serviceStartTime,
        chemicalsUsed: formattedChemicals,
        treatedAreas: formattedTreatedAreas,
        notes: notes || '',
        completedAt: new Date().toISOString(),
      };

      console.log("📤 Completing service with payload:", {
        customerId: payload.customerId,
        technicianId: payload.technicianId,
        chemicalsCount: payload.chemicalsUsed.length,
        areasCount: payload.treatedAreas.length,
        logId: payload.logId,
        visitId: payload.visitId,
        disinfectionDetails: payload.disinfectionDetails
      });

      const res = await apiService.logService(payload);
      if (!res?.success) throw new Error('Save failed');

      // MARK APPOINTMENT AS COMPLETED
      if (session?.appointmentId) {
        await markAppointmentCompleted(
          session.appointmentId,
          payload.visitId,
          session.rawAppointment || session.appointment
        );
      }

      // Update state
      setLogId(finalLogId); // Save the logId to state
      setVisitId(stableVisitId);
      setServiceCompleted(true);
      setShowGenerateReport(true);
      setHasGeneratedReport(false);
      
      Alert.alert(
        'Service Completed', 
        'Data saved successfully.\n\nYou can now generate a report.',
        [
          { 
            text: "OK",
            onPress: () => {
              // User can now generate report
            }
          }
        ]
      );
      
    } catch (e) {
      console.error("❌ Complete service error:", e);
      Alert.alert('Error', e.message || 'Failed to complete service');
    }
  };

  const updateService = async () => {
    try {
      console.log("🔄 Updating disinfection service...");
      
      // Validate required fields
      if (!customer?.customerId || !technician?.id) {
        throw new Error("Missing customer or technician information");
      }
      
      // Use logId, visitId, or create a new stable ID
      const stableLogId = logId || visitId || session?.visitId || getStableLogId();
      
      if (!stableLogId) {
        Alert.alert("Error", "Missing service ID. Cannot update.");
        return;
      }
      
      console.log("✅ Using logId for update:", stableLogId);
      
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
        ...area,
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
        concentrationPercent: area.concentrationPercent && !area.concentrationPercent.includes('%') 
          ? `${area.concentrationPercent}%` 
          : area.concentrationPercent || '',
        volumeMl: area.volumeMl && !area.volumeMl.includes('ml')
          ? `${area.volumeMl}ml`
          : area.volumeMl || '',
        areaNotes: area.areaNotes || ''
      }));
      
      const effectiveStartTime = serviceStartTime || Date.now() - 3600000;
      const stableVisitId = visitId || session?.visitId || stableLogId;
      
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
          session?.rawAppointment?.other_pest_name ||
          '',
        serviceStartTime: new Date(effectiveStartTime).toISOString(),
        chemicalsUsed: formattedChemicals,
        treatedAreas: formattedTreatedAreas,
        notes: notes || '',
        updatedAt: new Date().toISOString(),
      }; 

      console.log("📤 Updating service with payload:", {
        customerId: payload.customerId,
        technicianId: payload.technicianId,
        serviceType: payload.serviceType,
        visitId: payload.visitId,
        logId: payload.logId,
        chemicalsCount: payload.chemicalsUsed.length,
        areasCount: payload.treatedAreas.length,
        disinfectionDetails: payload.disinfectionDetails
      });
      
      const res = await apiService.logService(payload);
      
      if (!res?.success) {
        throw new Error(res?.error || 'Update failed');
      }
      
      console.log("✅ Service update successful");
      
      setServiceCompleted(true);
      setHasGeneratedReport(false);
      
      if (session?.appointmentId) {
        await markAppointmentCompleted(session.appointmentId, payload.visitId);
      }
      
      if (!logId && res.logId) {
        setLogId(res.logId);
      }
      
      Alert.alert(
        'Service Updated', 
        'Data saved successfully!\n\n' +
        'You will be navigated to Report Screen automatically.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              onGenerateReport({
                ...buildDisinfectionReportContext(stableVisitId),
                duration: formatTime(
                  storedDuration !== null ? storedDuration : elapsedTime
                ),
                visitId: stableVisitId,
                _refreshKey: Date.now()
              });
            }
          }
        ]
      );
      
    } catch (e) {
      console.error("❌ Update service error:", e);
      Alert.alert('Error', e.message || 'Failed to update service');
    }
  };

  const buildDisinfectionReportContext = (visitIdOverride) => {
    const date = new Date();
    const effectiveVisitId = visitIdOverride || visitId || session?.visitId;
    
    if (!effectiveVisitId) {
      console.warn("⚠️ No visitId available for report context");
    }
    
    return {
      date: date.toLocaleDateString(),
      duration: formatTime(
        storedDuration !== null ? storedDuration : elapsedTime
      ),
      customerName: customer?.customerName || 'Unknown Customer',
      technicianName: technician ? `${technician.firstName} ${technician.lastName}` : 'Unknown Technician',
      serviceType: 'disinfection',
      serviceTypeName: getDisinfectionDetailsLabel() 
        ? `Disinfection - ${getDisinfectionDetailsLabel()}`
        : 'Disinfection Service',
      visitId: effectiveVisitId,
      chemicalsUsed: selectedChemicals,
      treatedAreas: treatedAreas,
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
      "Cancel Service",
      "Are you sure you want to cancel this service? All unsaved data will be lost.",
      [
        { 
          text: "No, Continue", 
          style: "cancel" 
        },
        { 
          text: "Yes, Cancel", 
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
            
            Alert.alert(
              "Service Cancelled", 
              "Service cancelled. No data was saved.",
              [{ text: "OK" }]
            );
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
                  "Unsaved Changes",
                  "You have an active service. Do you want to cancel it?",
                  [
                    { text: "Continue Service", style: "cancel" },
                    { 
                      text: "Cancel Service", 
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
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {getDisinfectionDetailsLabel() 
                ? `Disinfection - ${getDisinfectionDetailsLabel()}`
                : 'Disinfection Service'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {serviceStarted ? 'Service in Progress' : 'Service Setup'}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.navigateButton}
            onPress={onNavigate}
          >
            <MaterialIcons name="navigation" size={20} color="#fff" />
            <Text style={styles.navigateText}>Navigate</Text>
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
                  Alert.alert('Error', 'No visit ID found to load data');
                  return;
                }
                
                const res = await apiService.getServiceLogByVisitId(visitIdToLoad);
                
                if (res?.success && res.log) {
                  const log = res.log;
                  
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
                  
                  Alert.alert('Success', 'Service data loaded successfully');
                } else {
                  Alert.alert('Error', 'No data found for this service');
                }
              } catch (error) {
                console.error("Failed to load data:", error);
                Alert.alert('Error', 'Failed to load service data');
              } finally {
                setLoading(false);
              }
            }}
          >
            <MaterialIcons name="cloud-download" size={20} color="#fff" />
            <Text style={styles.secondaryButtonText}>Load Service Data</Text>
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
            <Text style={styles.cardTitle}>Customer Information</Text>
          </View>
          
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customer?.customerName || '—'}</Text>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="schedule" size={16} color="#666" />
              <Text style={styles.infoText}>
                Appointment: {session?.appointmentTime || 'N/A'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="person-pin" size={16} color="#666" />
              <Text style={styles.infoText}>
                Technician: {technician?.firstName} {technician?.lastName}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={16} color="#666" />
              <Text style={styles.infoText}>
                {customer?.address || 'No address available'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialIcons name="medical-services" size={16} color="#666" />
              <Text style={styles.serviceTypeText}>
                Service: <Text style={styles.serviceTypeValue}>{serviceTypeLabel}</Text>
              </Text>
            </View>
          </View>

          {/* Warning message if no disinfection details specified */}
          {(!getDisinfectionDetailsLabel() || getDisinfectionDetailsLabel().trim() === '') && (
            <View style={styles.warningCard}>
              <MaterialIcons name="info" size={20} color="#ff9800" />
              <Text style={styles.warningText}>
                This disinfection appointment doesn't have specific details. 
                Please contact admin or specify the treatment in your notes below.
              </Text>
            </View>
          )}
        </View>

        {/* SERVICE STATUS INDICATOR */}
        {serviceStarted && (
          <View style={styles.statusCard}>
            <Text style={styles.sectionTitle}>Service Progress</Text>
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
                ]}>Started</Text>
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
                ]}>Completed</Text>
              </View>
            </View>
          </View>
        )}

        {/* CHEMICALS SECTION */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="science" size={20} color="#1f9c8b" />
            <Text style={styles.sectionTitle}>Chemicals Used</Text>
          </View>
          
          <View style={[
            styles.card, 
            !serviceStarted && styles.disabledCard
          ]}>
            <ChemicalsDropdown
              selectedChemicals={selectedChemicals}
              onChemicalsChange={(newChemicals) => {
                if (!serviceStarted) {
                  Alert.alert("Start Service Required", "Please start the service before selecting chemicals.");
                  return;
                }
                setSelectedChemicals(newChemicals);
              }}
              disabled={!serviceStarted}
              editable={serviceStarted}
            />
            {!serviceStarted && !serviceCompleted && (
              <Text style={styles.disabledHint}>Start service to enable</Text>
            )}
            {serviceCompleted && selectedChemicals.length === 0 && (
              <Text style={styles.disabledHint}>Update service to edit chemicals</Text>
            )}
          </View>
        </View>

        {/* TREATED AREAS SECTION */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="layers" size={20} color="#1f9c8b" />
            <Text style={styles.sectionTitle}>Treated Areas</Text>
          </View>

          {/* Add Area Input */}
          <View style={styles.addAreaContainer}>
            <TextInput
              style={[
                styles.areaInput,
                !serviceStarted && styles.disabledInput
              ]}
              placeholder="Enter area name (e.g. Bathroom)"
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
              <Text style={styles.addAreaButtonText}>Add</Text>
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
                  <Text style={styles.areaActionText}>Details</Text>
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
                        {a.chemicals.length} chemical{a.chemicals.length > 1 ? 's' : ''} used
                      </Text>
                      <Text style={styles.areaChemicalsList}>
                        {a.chemicals.slice(0, 2).map(c => c.name).join(', ')}
                        {a.chemicals.length > 2 ? '...' : ''}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.noChemicalsText}>
                      No chemicals added yet
                    </Text>
                  )}
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#ccc" />
              </View>
            </Swipeable>
          ))}
        </View>

        {/* SERVICE NOTES SECTION */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="notes" size={20} color="#1f9c8b" />
            <Text style={styles.sectionTitle}>Service Notes</Text>
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
            placeholder="Enter service notes, observations, or special instructions..."
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
                  ? 'Start Service (No Details)'
                  : `Start ${serviceTypeLabel}`}
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
                <Text style={styles.primaryButtonText}>Complete Service</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={cancelWork}
              >
                <MaterialIcons name="cancel" size={20} color="#fff" />
                <Text style={styles.cancelButtonText}>Cancel Service</Text>
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
                <Text style={styles.updateButtonText}>Update Service</Text>
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
                        "Data Not Ready",
                        "Please wait a moment for the service data to be saved, or tap 'Update Service' first.",
                        [{ text: "OK" }]
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
                  <Text style={styles.secondaryButtonText}>Generate Report</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pest - Free Technician Portal • Disinfection Module
          </Text>
          <Text style={styles.footerCopyright}>
            © {new Date().getFullYear()} All data is securely recorded
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
                  Area Details
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
                    {treatedAreas.find(a => a.id === activeAreaId)?.name || 'Untitled Area'}
                  </Text>
                </View>

                {/* Chemicals Reference */}
                {selectedChemicals.length > 0 && (
                  <View style={styles.referenceSection}>
                    <View style={styles.referenceHeader}>
                      <MaterialIcons name="science" size={18} color="#1f9c8b" />
                      <Text style={styles.referenceTitle}>Available Chemicals</Text>
                    </View>
                    <Text style={styles.referenceSubtitle}>
                      Tap to add to this area:
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
                    <Text style={styles.sectionTitle}>Chemicals in this Area</Text>
                  </View>
                  
                  {(() => {
                    const currentArea = treatedAreas.find(a => a.id === activeAreaId);
                    const areaChemicals = currentArea?.chemicals || [];
                    
                    if (areaChemicals.length === 0) {
                      return (
                        <View style={styles.emptyState}>
                          <MaterialIcons name="science" size={40} color="#e0e0e0" />
                          <Text style={styles.emptyStateText}>
                            No chemicals added yet
                          </Text>
                          <Text style={styles.emptyStateSubtext}>
                            Tap on a chemical above to add it
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
                              {chemical.name || `Chemical ${chemIndex + 1}`}
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
                            <Text style={styles.inputLabel}>Concentration (%)</Text>
                            <View style={styles.inputContainer}>
                              <TextInput
                                style={styles.chemicalInput}
                                placeholder="e.g., 10"
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
                            <Text style={styles.inputLabel}>Volume (ml)</Text>
                            <View style={styles.inputContainer}>
                              <TextInput
                                style={styles.chemicalInput}
                                placeholder="e.g., 500"
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
                    <Text style={styles.sectionTitle}>Area Notes</Text>
                  </View>
                  <TextInput
                    style={styles.areaNotesInput}
                    placeholder="Enter area-specific notes, observations, or special instructions..."
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
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
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
                    <Text style={styles.modalSaveButtonText}>Save Area</Text>
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
          <Text style={styles.loadingText}>Loading service details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!areaModalVisible ? (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            {renderContent()}
          </View>
        </TouchableWithoutFeedback>
      ) : (
        <View style={{ flex: 1 }}>
          {renderContent()}
        </View>
      )}
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