// MyocideScreen.js - Updated with properly positioned status indicators
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { PanGestureHandler, PinchGestureHandler } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { formatTime } from "../../utils/timeUtils";
import apiService, { API_BASE_URL } from "../../services/apiService";
import BaitStationForm from "../../components/BaitStationForm";
import { Dimensions } from "react-native";
import AtoxicStationForm from "../../components/AtoxicStationForm";
import LightTrapForm from "../../components/LTForm";

// Real code after imports
const { width: deviceWidth } = Dimensions.get("window");

// ---- Station label helper ----
const getStationLabel = (stationType) => {
  switch (stationType) {
    case "RM":
      return "Multicatch";
    case "ST":
      return "Snap Trap";
    case "LT":
      return "Light Trap";
    case "BS":
    default:
      return "Bait Station";
  }
};

const getStationColor = (type, isCompleted) => {
  if (isCompleted) return "#bdbdbd"; // completed = faded

  switch (type) {
    case "BS":
      return "#1f9c8b"; 
    case "RM":
      return "#5a5a5a"; 
    case "ST":
      return "#0c6b5e"; 
    case "LT":
      return "#6d7e87"; 
    default:
      return "#1f9c8b";
  }
};

// ---- Marker label layout helpers ----
const getMarkerLabel = (st) => `${st.type || "BS"}${st.id}`;

const getMarkerSize = (label) => {
  return label.length >= 4 ? 34 : 28;
};

const markAppointmentCompleted = async (appointmentId, visitId, sessionRef) => {
  if (!appointmentId) return;
  
  console.log("💾 Marking appointment completed with visitId:", {
    appointmentId,
    visitId
  });

  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appointmentId);
    
    if (isUUID && visitId) { // Make sure visitId exists
      console.log("✅ Updating appointment with visit_id:", visitId);
      
      const updateResult = await apiService.updateAppointment({
        id: appointmentId,
        status: "completed",
        visitId: visitId // This will set the visit_id column
      });
      
      console.log("💾 Appointment update result:", updateResult);
      
      // ✅ ADD THIS: Handle price errors like Disinfection screen does
      if (!updateResult?.success) {
        console.error("❌ Failed to update appointment:", updateResult?.error);
        
        // Check if it's a price error
        if (updateResult?.error?.includes('Service price must be set')) {
          Alert.alert(
            "Price Not Set",
            "Admin has not set the service price yet. Please contact admin to set the price before completing this appointment.",
            [{ text: "OK" }]
          );
          return; // Stop here if price error
        }
      }
    } else {
      console.log("ℹ️ Skipping appointment update - not a UUID:", appointmentId);
    }

    // Always update the session object
    if (sessionRef && typeof sessionRef === 'object') {
      console.log("🔄 Updating session object status to 'completed'");
      sessionRef.status = "completed";
      sessionRef.visitId = visitId || sessionRef.visitId;
      
      // Also update the raw appointment
      if (sessionRef.rawAppointment) {
        sessionRef.rawAppointment.status = "completed";
        sessionRef.rawAppointment.visit_id = visitId || sessionRef.rawAppointment.visit_id;
      }
    }

  } catch (err) {
    console.error("❌ Failed to mark appointment completed:", err);
    // Don't throw - we don't want to break the flow if this fails
  }
};


// ------------------ MAP SCREEN WITH TIMER ------------------

function MapScreen({ customer, onBack, session, technician, onGenerateReport }) {

  const [sessionVisitId, setSessionVisitId] = useState(
    session?.visitId ?? null
  );

  console.log("=== 🚨 MyocideScreen DEBUG ===");
  console.log("📱 Received props:", {
    customerExists: !!customer,
    customerName: customer?.customerName,
    customerId: customer?.customerId,
    sessionExists: !!session,
    session: {
      appointmentId: session?.appointmentId,
      status: session?.status,
      visitId: sessionVisitId,
      fromAppointment: session?.fromAppointment,
      serviceType: session?.serviceType
    },
    technicianExists: !!technician,
    technicianName: technician?.name
  });
  
  // Log the session object in detail
  if (session) {
    console.log("📋 Full session object:", JSON.stringify(session, null, 2));
  }

    // Add this near the top of your MapScreen function
  console.log("🔍 SESSION DATA FOR REPORT:", {
    sessionVisitId: sessionVisitId,
    hasSession: !!session,
    sessionType: session?.fromAppointment ? "appointment" : "manual",
    appointmentId: session?.appointmentId
  });
  
  const [selectedMap, setSelectedMap] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null); 
  const [showMapDropdown, setShowMapDropdown] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [addingStation, setAddingStation] = useState(false);
  const [removingStation, setRemovingStation] = useState(false);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loggedStations, setLoggedStations] = useState([]);
  const [editStationType, setEditStationType] = useState("BS"); // BS | RM | ST
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const isCompletedAppointment = session?.status === "completed";
  const canEditCompletedVisit = Boolean(
    sessionVisitId && session?.status === "completed"  
  );
  const [isEditCompletedVisit, setIsEditCompletedVisit] = useState(canEditCompletedVisit);
  const [hasViewedReport, setHasViewedReport] = useState(false);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);
  const [notes, setNotes] = useState('');
  const [customerWithMaps, setCustomerWithMaps] = useState(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const customerMaps = useMemo(() => {
    if (customerWithMaps && Array.isArray(customerWithMaps.maps)) {
      return customerWithMaps.maps;
    }
    if (normalizedCustomer && Array.isArray(normalizedCustomer.maps)) {
      return normalizedCustomer.maps;
    }
    return [];
  }, [customerWithMaps, normalizedCustomer]);





  
  // TIMER STATES
  const [timerActive, setTimerActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  const [showSaveCancel, setShowSaveCancel] = useState(false);
  const [workStarted, setWorkStarted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState('');
  
  // STATUS STATES
  const [serviceStarted, setServiceStarted] = useState(false);
  const [serviceCompleted, setServiceCompleted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const SERVER_BASE_URL = API_BASE_URL.replace("/api", ""); // http://192.168.1.71:3000
  const isAppointmentSession =
    Boolean(session?.fromAppointment) &&
    session?.serviceType === "myocide" &&
    session?.status !== "completed";

  console.log("📊 Edit flags:", {
    isCompletedAppointment,
    canEditCompletedVisit,
    sessionVisitId: sessionVisitId,
    isEditCompletedVisit
  });

  console.log("⚡ Calculated flags:", {
    isCompletedAppointment,
    canEditCompletedVisit,
    hasVisitId: !!sessionVisitId
  });

  const normalizedCustomer = useMemo(() => {
    if (!customer) return null;

    return {
      customerId: customer.customerId ?? customer.id ?? null,
      customerName: customer.customerName ?? customer.name ?? "",
      address: customer.address ?? "",
      email: customer.email ?? "",
      maps: Array.isArray(customer.maps) ? customer.maps : []
    };
  }, [customer]);

  const effectiveCustomer = customerWithMaps ?? normalizedCustomer;
  
  // Log the first map details
  if (Array.isArray(customerMaps) && customerMaps.length > 0) {
    const firstMap = customerMaps[0];

    console.log("🔍 FIRST MAP DETAILS:", {
      name: firstMap?.name,
      image: firstMap?.image,
      imageType: typeof firstMap?.image,
      mapId: firstMap?.mapId,
      hasStations: Array.isArray(firstMap?.stations),
      stationCount: firstMap?.stations?.length || 0
    });
  }

  // In your useEffect that checks for completed visits, make sure it always runs:
  useEffect(() => {
    // 🔒 Never downgrade a completed service
    if (serviceCompleted) {
      return;
    }

    const shouldEditCompletedVisit =
      session?.status === "completed" ||  // Check session status
      (sessionVisitId && session?.status === "completed") ||  // Check session visitId
      (isEditCompletedVisit && session?.status === "completed");  // Already in edit mode

    if (shouldEditCompletedVisit) {
      console.log("✅ Setting edit mode for completed visit");
      setIsEditCompletedVisit(true);
      setServiceCompleted(true);
      setServiceStarted(true);

      session.visitId;

      setWorkStarted(false);
      setShowSaveCancel(false);
      setTimerActive(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [session?.status, sessionVisitId, serviceCompleted, isEditCompletedVisit]);


  // Add this effect to clear old visitId when starting fresh:
  useEffect(() => {
    // If session has no visitId and status is not completed, clear any old visitIdRef
    if (!sessionVisitId && session?.status !== "completed") {
      console.log("🧹 Clearing old visitIdRef for new appointment");
      setIsEditCompletedVisit(false);
      setServiceCompleted(false);
      setServiceStarted(false);
    }
  }, [sessionVisitId, session?.status]);


  useEffect(() => {
    if (!customerMaps.length) {
      setSelectedMap(null);
      setStations([]);
      return;
    }

    // If we already selected a map and it still exists, keep it.
    if (selectedMap && customerMaps.some(m => m.mapId === selectedMap.mapId)) {
      const fresh = customerMaps.find(m => m.mapId === selectedMap.mapId);
      setSelectedMap(fresh);
      const normalizedStations = (Array.isArray(fresh.stations) ? fresh.stations : []).map(s => ({
        ...s,
        type: s.type || "BS"
      }));
      setStations(normalizedStations);
      return;
    }

    // Otherwise pick the first map (or newest if you want, but do it only once)
    const initial = customerMaps[0];
    setSelectedMap(initial);
    setStations((Array.isArray(initial.stations) ? initial.stations : []).map(s => ({ ...s, type: s.type || "BS" })));
  }, [customerMaps]);

  useEffect(() => {
    if (canEditCompletedVisit) {
      console.log("✏️ Editing completed visit:", session.visitId);
      setIsEditCompletedVisit(true);
    }
  }, [canEditCompletedVisit]);


  // Add this cleanup function
  useEffect(() => {
    return () => {
      // Clean up timer on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Add this useEffect to debug
  useEffect(() => {
    console.log("🔍 DEBUG - MyocideScreen state:", {
      loggedStationsCount: loggedStations.length,
      loggedStations: loggedStations.map(s => `${s.stationType}${s.stationId}`),
      sessionVisitId: sessionVisitId,
      isEditCompletedVisit,
      selectedStation: selectedStation
    });
  }, [loggedStations, sessionVisitId, isEditCompletedVisit]);

  useEffect(() => {
    console.log("🔍 STATE DEBUG:", {
      isEditCompletedVisit,
      serviceCompleted,
      serviceStarted,
      timerActive,
      workStarted,
      showSaveCancel,
      sessionStatus: session?.status,
      sessionVisitId: sessionVisitId
    });
  }, [isEditCompletedVisit, serviceCompleted, serviceStarted, timerActive, workStarted, showSaveCancel, session?.status, sessionVisitId]);

  // In your useEffect where you load customer data:
  useEffect(() => {
    const loadCustomerData = async () => {
      if (!normalizedCustomer?.customerId) return;
      console.log("🔍 Loading customer data for:", normalizedCustomer.customerId);

      setLoadingCustomer(true);
      
      try {
        const customerData = await apiService.getCustomerWithMaps(normalizedCustomer.customerId);
        
        console.log("✅ Customer data loaded:", {
          customerId: customerData?.customerId,
          customerName: customerData?.customerName,
          mapsCount: customerData?.maps?.length || 0,
          mapsIsArray: Array.isArray(customerData?.maps),
          fullData: customerData
        });
        
        if (!customerData || !customerData.customerId) {
          console.error("❌ Invalid customer data returned:", customerData);
          throw new Error("Invalid customer data structure");
        }
        
        // Ensure maps is always an array
        const safeCustomer = {
          ...customerData,
          maps: Array.isArray(customerData.maps) 
            ? customerData.maps 
            : (customerData.maps === "no maps" ? [] : [])
        };
        
        console.log("✅ Setting customerWithMaps:", {
          customerId: safeCustomer.customerId,
          customerName: safeCustomer.customerName,
          mapsCount: safeCustomer.maps.length
        });
        
        setCustomerWithMaps(safeCustomer);
        
      } catch (error) {
        console.error("❌ Error loading customer with maps:", error);
        // Fallback to the original customer data
        setCustomerWithMaps({
          ...customer,
          maps: Array.isArray(normalizedCustomer.maps) ? normalizedCustomer.maps : []
        });
      } finally {
        setLoadingCustomer(false);
      }
    };
    
    loadCustomerData();
  }, [normalizedCustomer?.customerId]);


// Use customerWithMaps instead of customer

  const startTimer = () => {

    if (!isAppointmentSession) {
      Alert.alert(
        "No Active Appointment",
        "Start Work is only available when opening a scheduled Myocide appointment."
      );
      return;
    }
    
    if (timerActive) return;

    // Clear any old data when starting new work
    console.log("🧹 Starting new work - clearing old data");
    setLoggedStations([]); // Clear old stations
    setIsEditCompletedVisit(false); // Ensure not in edit mode
    setServiceCompleted(false); // Not completed yet
    setServiceStarted(false); // Reset started status

    const start = Date.now();
    setStartTime(start);
    setTimerActive(true);
    setWorkStarted(true);
    setShowSaveCancel(true);
    setServiceStarted(true);
    setServiceCompleted(false);

    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - start);
    }, 1000);
  };


  const stopTimer = () => {
    if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
    }

    setTimerActive(false);
    setShowSaveCancel(false);
  };
    
  const handleGenerateReport = async () => {
    console.log("📄 Generate Report pressed");

    if (!sessionVisitId) {
      Alert.alert(
        "Error",
        "Visit ID is missing. Please save the service first."
      );
      return;
    }

    console.log("✅ Navigating to report with visitId:", sessionVisitId);

    onGenerateReport({
      visitId: sessionVisitId,
      serviceType: "myocide"
    });

    // ✅ NOW hide the button
    setHasGeneratedReport(true);
  };

  const handleSaveAll = async () => {
    console.log("🔍 handleSaveAll called, isEditCompletedVisit:", isEditCompletedVisit);
    console.log("📊 Total logged stations:", loggedStations.length);

    // 🚨 ADD THIS FILTER: Remove stations without data
    const stationsToSend = loggedStations.filter(station => {
      // Always include stations with "No access"
      if (station.access === "No") return true;
      
      // Include stations with any valid data
      const hasData = 
        station.capture !== undefined ||
        station.consumption !== undefined ||
        station.mosquitoes !== undefined ||
        station.condition !== undefined;
      
      return hasData;
    });

    console.log(`📤 Sending ${stationsToSend.length} stations to backend (filtered from ${loggedStations.length})`);
    console.log("✅ Valid stations:", stationsToSend.map(s => `${s.stationType}${s.stationId}`));

    // Check if we have any stations to send
    if (stationsToSend.length === 0) {
      Alert.alert(
        "No Data",
        "You haven't logged any station data. Please log at least one station before saving.",
        [{ text: "OK" }]
      );
      return;
    }

    stopTimer();

    const visitSummary = {
      startTime,
      endTime: Date.now(),
      duration: elapsedTime,
      customerId: effectiveCustomer.customerId,
      customerName: effectiveCustomer.customerName,
      technicianId: technician?.id,
      technicianName: technician?.name,
      appointmentId: session?.appointmentId,
      workType: isEditCompletedVisit
        ? "Updated Visit"
        : (session?.fromAppointment ? "Scheduled Appointment" : "Manual Visit"),
      visitId: sessionVisitId || null,
      notes: notes || ""
    };

    console.log("📋 Visit summary for save:", visitSummary);
    console.log("📤 Stations to send:", JSON.stringify(stationsToSend, null, 2));

    try {
      // ✅ Use filtered stations
      const result = await apiService.logCompleteVisit(visitSummary, stationsToSend);
      
      console.log("📥 API Response:", result); // Add this for debugging

      if (!result?.success) {
        console.error("❌ Save failed, API response:", result);
        throw new Error(result?.error || "Save failed - no success flag");
      }

      if (result?.visitId) {
        console.log("✅ Saving backend visitId:", result.visitId);
        session.visitId = result.visitId;
        setSessionVisitId(result.visitId);

        // 🔥 CRITICAL FIX: Update the appointment in the database
        if (session.appointmentId) {
          // ✅ FIXED: Remove servicePrice - technicians don't handle prices
          // Just like Disinfection screen, only send status and visitId
          await apiService.updateAppointment({
            id: session.appointmentId,
            status: "completed",
            visitId: result.visitId
          });
          
          console.log("💾 Appointment updated with visitId:", result.visitId);
        }

        // Also update raw appointment in memory
        if (session.rawAppointment) {
          session.rawAppointment.visitId = result.visitId;
          session.rawAppointment.visit_id = result.visitId; // Use correct column name
          session.rawAppointment.status = "completed";
        }
      }

      await handleSaveResponse(result);
    } catch (error) {
      console.error("❌ Error in handleSaveAll:", error);
      
      // ✅ ADD THIS: Handle price errors like Disinfection screen
      if (error.message?.includes('Service price must be set')) {
        Alert.alert(
          "Price Not Set",
          "Admin has not set the service price yet. Please contact admin to set the price before completing this appointment.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Error", error.message || "Failed to save data");
      }
    }
  };


  const handleSaveResponse = async (result, isEdit = false) => {
    console.log("✅ handleSaveResponse result:", result);

    if (!result) {
      Alert.alert("Error", "No response from server");
      return;
    }

    if (session?.appointmentId) {
      try {
        await markAppointmentCompleted(session.appointmentId, session.visitId, session);
      } catch (err) {
        console.warn("⚠️ Could not update appointment status:", err);
      }
    }

    const ltCount = loggedStations.filter(s => s.stationType === "LT").length;
    const otherCount = loggedStations.filter(s => s.stationType !== "LT").length;

    const stationSummary = loggedStations
      .map(s => `${s.stationType}${s.stationId}`)
      .join(", ");

    const message =
      `${isEdit ? "✅ SERVICE UPDATED\n" : "✅ WORK COMPLETED\n"}` +
      `Duration: ${formatTime(elapsedTime)}\n` +
      `Stations logged: ${stationSummary}\n\n` +
      `\nData saved successfully!`;

    Alert.alert(isEdit ? "Service Updated" : "Work Completed", message, [{ text: "OK" }]);

    if (session) {
      session.status = "completed";
      session.visitId = result.visitId;

      if (session.rawAppointment) {
        session.rawAppointment.status = "completed";
        session.rawAppointment.visit_id = result.visitId;
      }
    }

    setServiceCompleted(true);
    setIsEditCompletedVisit(true);
    setWorkStarted(false);
    setShowSaveCancel(false);
    setTimerActive(false);
    setHasGeneratedReport(false);
  };

  const handleCancelWork = () => {
    Alert.alert(
      "Cancel Work Session",
      "Are you sure you want to cancel this work session? All unsaved station data will be lost.",
      [
        { 
          text: "No, Continue Working", 
          style: "cancel" 
        },
        { 
          text: "Yes, Cancel Work", 
          style: "destructive",
          onPress: () => {
            stopTimer();
            setTimerActive(false);
            setWorkStarted(false);
            setShowSaveCancel(false);
            setStartTime(null);
            setElapsedTime(0);
            
            // Reset status indicators
            setServiceStarted(false);
            setServiceCompleted(false);
            
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            
            Alert.alert(
              "Work Cancelled", 
              "Session cancelled. No data was saved.",
              [{ text: "OK", onPress: () => {} }]
            );
          }
        }
      ]
    );
  };

  // New useEffect for image loading - UPDATED
  useEffect(() => {
    if (!selectedMap?.image) {
      setCurrentImageUri('');
      setImageError(false);
      return;
    }

    setCurrentImageUri(`${SERVER_BASE_URL}/uploads/${selectedMap.image}`);
    setImageError(false);
  }, [selectedMap]);

  // Debug useEffect - add this
  useEffect(() => {
    console.log("🔍 DEBUG selectedMap:", {
      exists: !!selectedMap,
      image: selectedMap?.image,
      imageError: imageError,
      currentImageUri: currentImageUri,
      customerMapsLength: customerMaps.length
    });
    
    if (selectedMap) {
      console.log("🔍 Full selectedMap object:", JSON.stringify(selectedMap, null, 2));
    }
  }, [selectedMap, imageError, currentImageUri]);

  // Debug customer data
  useEffect(() => {
    console.log("👤 Customer data:", {
      customerId: customer?.customerId,
      customerName: customer?.customerName,
      mapsCount: customerMaps.length,
      firstMapImage: customerMaps[0]?.image
    });
  }, [customer]);

  // Add this with your other useEffect hooks
  useEffect(() => {
    console.log("🔍 ARRAY COMPARISON DEBUG:", {
      stationsCount: stations.length,
      loggedStationsCount: loggedStations.length,
      stations: stations.map(s => `${s.type || "BS"}${s.id}`),
      loggedStations: loggedStations.map(s => `${s.stationType || "BS"}${s.stationId || "?"}`),
      loggedStationsData: loggedStations.map(s => ({
        type: s.stationType,
        id: s.stationId,
        capture: s.capture,
        rodentsCaptured: s.rodentsCaptured,
        consumption: s.consumption
      }))
    });
  }, [stations, loggedStations]);

  // Add this useEffect to debug the data
  useEffect(() => {
    console.log("🔍 CUSTOMER DATA DEBUG:", {
      customerId: customer?.customerId,
      customerName: customer?.customerName,
      mapsLoaded: !!customer?.maps,
      mapsCount: customer?.maps?.length || 0,
      firstMap: customer?.maps?.[0] ? {
        mapId: customer.maps[0].mapId,
        name: customer.maps[0].name,
        stationsCount: customer.maps[0].stations?.length || 0,
        stations: customer.maps[0].stations || []
      } : 'none',
      secondMap: customer?.maps?.[1] ? {
        mapId: customer.maps[1].mapId,
        name: customer.maps[1].name,
        stationsCount: customer.maps[1].stations?.length || 0
      } : 'none'
    });
    
    // Also check the customerMaps computed value
    console.log("🔍 CUSTOMER MAPS (computed):", {
      count: customerMaps.length,
      maps: customerMaps.map(m => ({
        mapId: m.mapId,
        name: m.name,
        stationsCount: m.stations?.length || 0
      }))
    });
  }, [customer, customerMaps]);

  useEffect(() => {
    const getVisitIdFromAppointment = async () => {
      if (session?.appointmentId && !sessionVisitId && session?.status === "completed") {
        console.log("🔍 Getting visitId for appointment:", session.appointmentId);
        try {
          const visitId = await apiService.getVisitIdByAppointmentId(session.appointmentId);
          if (visitId) {
            console.log("✅ Found visitId:", visitId);
            setSessionVisitId(visitId);
            if (session) {
              session.visitId = visitId;
            }
          }
        } catch (error) {
          console.error("❌ Failed to get visitId from appointment:", error);
        }
      }
    };
    
    getVisitIdFromAppointment();
  }, [session?.appointmentId, session?.status, sessionVisitId]);

  // Add this at the top of your MapScreen after the useEffects
  console.log("🔍 MAPSCREEN STATE:", {
    hasCustomer: !!customer,
    hasCustomerWithMaps: !!customerWithMaps,
    loadingCustomer,
    customerId: customer?.customerId,
    customerMapsCount: customerMaps.length,
    effectiveCustomerId: effectiveCustomer?.customerId,
    effectiveCustomerName: effectiveCustomer?.customerName,
    effectiveCustomerMaps: effectiveCustomer?.maps?.length || 0
  });

  // Also update your earlier debug log
  console.log("🔍 RAW CUSTOMER DATA from backend:", {
    customerId: effectiveCustomer?.customerId, // ← Change to effectiveCustomer
    customerName: effectiveCustomer?.customerName, // ← Change to effectiveCustomer
    maps: effectiveCustomer?.maps ? JSON.stringify(effectiveCustomer.maps) : 'no maps'
  });

  // In MyocideScreen.js - buildMyocideReportContext function
  const buildMyocideReportContext = () => {
    if (!sessionVisitId) {
      Alert.alert(
        "Cannot Generate Report",
        "No visit ID found. Please save the service first.",
        [{ text: "OK" }]
      );
      return null;
    }

    return {
      visitId: sessionVisitId,
      customerName: effectiveCustomer.customerName,
      technicianName: technician
        ? `${technician.firstName} ${technician.lastName}`
        : "N/A",
      serviceTypeName: "Myocide Service",
      stationCounts: loggedStations.reduce(
        (acc, s) => {
          acc[s.stationType] = (acc[s.stationType] || 0) + 1;
          return acc;
        },
        {}
      )
    };
  };

  // In MyocideScreen.js - Update upsertLoggedStation
  const upsertLoggedStation = (stationData) => {
    console.log("🚨 ====== upsertLoggedStation CALLED ======");
    console.log("🚨 FULL stationData received:", JSON.stringify(stationData, null, 2));
    
    // Ensure stationType is included
    if (!stationData.stationType) {
      stationData.stationType = selectedStation?.type || "BS";
    }
    
    // Ensure stationId is valid
    let fixedStationId = stationData.stationId || selectedStation?.id;
    if (!fixedStationId || fixedStationId === 0 || fixedStationId === "0") {
      console.warn(`⚠️ Invalid stationId: ${fixedStationId}, using selectedStation: ${selectedStation?.id}`);
      fixedStationId = selectedStation?.id;
    }
    
    // When access is "No", explicitly set other fields to null
    const normalized = {
      ...stationData,
      stationId: fixedStationId,
      stationType: stationData.stationType || "BS",
      // Ensure all fields are properly set (null for "No access", undefined otherwise)
      ...(stationData.access === "No" ? {
        capture: null,
        rodentsCaptured: null,
        triggered: null,
        replacedSurface: null,
        consumption: null,
        baitType: null,
        mosquitoes: null,
        lepidoptera: null,
        drosophila: null,
        flies: null,
        others: null,
        replaceBulb: null,
        condition: null
      } : {})
    };

    console.log("✅ Normalized station data:", normalized);

    setLoggedStations(prev => {
      const index = prev.findIndex(
        s =>
          s.stationId === normalized.stationId &&
          s.stationType === normalized.stationType
      );

      if (index !== -1) {
        const updated = [...prev];
        updated[index] = normalized;
        console.log("🔄 Updated existing station in loggedStations");
        return updated;
      }

      console.log("➕ Added new station to loggedStations");
      return [...prev, normalized];
    });

    Alert.alert(
      "Success",
      `${normalized.stationType}${normalized.stationId} logged successfully!`
    );
  };

  const showValidationMessage = (message) => {
    setSuccessMessage(message);

    setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);
  };

    // In MyocideScreen.js - Update the isStationCompleted function
  const isStationCompleted = (stationId, stationType = "BS") => {
    const foundStation = loggedStations.find(s => 
      s.stationId === stationId && (s.stationType || "BS") === stationType
    );
    
    if (!foundStation) {
      return false;
    }
    
    // Check if station has any valid data OR access is "No"
    const hasData = 
      foundStation.access === "No" ||
      foundStation.capture !== null && foundStation.capture !== undefined ||
      foundStation.consumption !== null && foundStation.consumption !== undefined ||
      foundStation.mosquitoes !== null && foundStation.mosquitoes !== undefined ||
      foundStation.condition !== null && foundStation.condition !== undefined;
    
    console.log("🔍 isStationCompleted check:", {
      stationId,
      stationType,
      found: true,
      access: foundStation.access,
      capture: foundStation.capture,
      hasData,
      isAccessNo: foundStation.access === "No"
    });
    
    return hasData;
  };

  const debugStationData = (stationId, stationType) => {
    const station = loggedStations.find(s => 
      s.stationId === stationId && s.stationType === stationType
    );
    
    console.log("🔍 DEBUG Station Data:", {
      stationId,
      stationType,
      exists: !!station,
      data: station,
      access: station?.access,
      capture: station?.capture,
      condition: station?.condition,
      isAccessNo: station?.access === "No"
    });
    
    return station;
  };

  const handleMapSelect = (map) => {
    setSelectedMap(map);
    setStations((Array.isArray(map.stations) ? map.stations : []).map(s => ({ ...s, type: s.type || "BS" })));
    setShowMapDropdown(false);
  };

  const saveStations = async () => {
    if (!selectedMap) return;

    setSaving(true);
    try {
      console.log("💾 Saving station locations for map:", selectedMap.mapId);
      console.log("📍 Stations to save:", stations);

      // Format stations for backend
      const stationsToSave = stations.map(st => ({
        id: st.id,
        type: st.type || "BS",
        x: st.x,
        y: st.y
      }));

      console.log("📤 Sending to backend:", {
        mapId: selectedMap.mapId,
        stationsCount: stationsToSave.length,
        stations: stationsToSave
      });

      // Save to SQL using new endpoint
      const result = await apiService.saveMapStations(selectedMap.mapId, stationsToSave);

      if (result && result.success) {
        console.log("✅ Save successful:", result);
        
        // Immediately refresh the customer data to see if stations were saved
        try {
          console.log("🔄 Refreshing customer data...");
          const freshCustomerData = await apiService.getCustomerWithMaps(effectiveCustomer.customerId);
          
          console.log("🔄 Fresh customer data:", {
            mapsCount: freshCustomerData.maps?.length,
            stationsInFirstMap: freshCustomerData.maps?.[0]?.stations?.length || 0
          });
          
          setCustomerWithMaps(freshCustomerData);
        } catch (refreshError) {
          console.error("❌ Error refreshing:", refreshError);
        }

        Alert.alert("Saved", "Station locations saved to database!");
        setEditMode(false);
        setAddingStation(false);
        setRemovingStation(false);
      } else {
        console.error("❌ Save failed:", result);
        Alert.alert("Error", result?.error || "Failed to save stations");
      }

    } catch (error) {
      console.error("❌ Save stations error:", error);
      Alert.alert("Error", error.message || "Failed to save stations.");
    } finally {
      setSaving(false);
    }
  };

  const startDrag = (id, gestureX, gestureY) => {
    const newStations = stations.map((s) =>
      s.id === id
        ? {
            ...s,
            x: Math.max(0, Math.min(1, (gestureX - offsetX) / (deviceWidth * scale))),
            y: Math.max(0, Math.min(1, (gestureY - offsetY) / (deviceWidth * scale)))
          }
        : s
    );
    setStations(newStations);
  };

  const debugStationCompletion = () => {
    console.log("🔍 DEBUG Station Completion Status:");
    
    stations.forEach(st => {
      const isCompleted = isStationCompleted(st.id, st.type || "BS");
      const stationData = loggedStations.find(s => 
        s.stationId === st.id && s.stationType === (st.type || "BS")
      );
      
      console.log(`   ${st.type || "BS"}${st.id}:`, {
        isCompleted,
        hasData: !!stationData,
        access: stationData?.access,
        capture: stationData?.capture,
        consumption: stationData?.consumption,
        mosquitoes: stationData?.mosquitoes
      });
    });
  };

  const getNextIdForType = (type) => {
    const sameType = stations.filter(s => (s.type || "BS") === type);
    if (sameType.length === 0) return 1;
    return Math.max(...sameType.map(s => Number(s.id) || 0)) + 1;
  };
  
  const handleUpdateService = async () => {
    console.log("🔄 Updating service without timer");
    
    console.log("📊 All logged stations:", loggedStations.map(s => ({
      type: s.stationType,
      id: s.stationId,
      access: s.access,
      hasData: s.access === "No" || s.capture || s.consumption || s.mosquitoes
    })));
    
    // 🚨 CRITICAL: Include stations with "No access" as valid changes
    const stationsToSend = loggedStations.filter(station => {
      // ALWAYS include stations with "No access"
      if (station.access === "No") {
        console.log(`✅ Including station ${station.stationType}${station.stationId} with "No access"`);
        return true;
      }
      
      // Include stations with any valid data
      if (station.stationType === "RM" || station.stationType === "ST") {
        const hasData = station.capture !== undefined && station.capture !== null;
        if (hasData) console.log(`✅ Including atoxic station ${station.stationType}${station.stationId} with capture: ${station.capture}`);
        return hasData;
      }
      if (station.stationType === "BS") {
        const hasData = station.consumption !== undefined || station.baitType !== undefined;
        if (hasData) console.log(`✅ Including BS station ${station.stationId} with data`);
        return hasData;
      }
      if (station.stationType === "LT") {
        const hasData = station.mosquitoes !== undefined || 
                      station.lepidoptera !== undefined || 
                      station.drosophila !== undefined || 
                      station.flies !== undefined;
        if (hasData) console.log(`✅ Including LT station ${station.stationId} with data`);
        return hasData;
      }
      return false;
    });

    console.log(`📤 Sending ${stationsToSend.length} stations for update`);
    console.log("✅ Valid stations:", stationsToSend.map(s => `${s.stationType}${s.stationId}`));

    if (stationsToSend.length === 0) {
      Alert.alert(
        "No Valid Changes",
        "You haven't logged any valid station data. Please log at least one station with data before updating.",
        [{ text: "OK" }]
      );
      return;
    }

    const visitSummary = {
      startTime,
      endTime: Date.now(),
      duration: elapsedTime,
      customerId: effectiveCustomer.customerId,
      customerName: effectiveCustomer.customerName,
      technicianId: technician?.id,
      technicianName: technician?.name,
      appointmentId: session?.appointmentId,
      workType: isEditCompletedVisit ? "Updated Visit" : "Scheduled Appointment",
      visitId: sessionVisitId || null,
      notes: notes || ''
    };

    try {
      const result = await apiService.logCompleteVisit(visitSummary, stationsToSend);

      if (result?.success && result.visitId) {
        console.log("✅ Persisting visitId in session:", result.visitId);
        session.visitId = result.visitId;
        setSessionVisitId(result.visitId);
        
        // 🔥 CRITICAL: Update the appointment in the database
        if (session?.appointmentId) {
          console.log("💾 Updating appointment with visitId:", result.visitId);
          
          // ✅ FIX: Remove servicePrice - technicians don't handle prices
          await apiService.updateAppointment({
            id: session.appointmentId,
            status: "completed",
            visitId: result.visitId
            // 🚨 REMOVED: servicePrice: finalPrice
          });
        }
        
        // Also update raw appointment
        if (session.rawAppointment) {
          session.rawAppointment.visitId = result.visitId;
          session.rawAppointment.visit_id = result.visitId;
          session.rawAppointment.status = "completed";
        }
      }
      
      if (!result?.success) {
        throw new Error(result?.error || "Failed to update service");
      }

      console.log("✅ Service updated:", result);
      
      // Set service as completed to show Generate Report button
      setServiceCompleted(true);
      setWorkStarted(false);
      setTimerActive(false);
      
      setHasGeneratedReport(false);
      setIsEditCompletedVisit(true);
      
      Alert.alert(
        "Service Updated Successfully",
        `Successfully updated ${stationsToSend.length} station(s).`,
        [{ text: "OK" }]
      );

    } catch (error) {
      console.error("❌ Update service error:", error);
      
      // ✅ ADD THIS: Handle price errors like Disinfection screen
      if (error.message?.includes('Service price must be set')) {
        Alert.alert(
          "Price Not Set",
          "Admin has not set the service price yet. Please contact admin to set the price before completing this appointment.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Error", error.message || "Failed to update service");
      }
    }
  };

  useEffect(() => {
    debugStationCompletion();
  }, [loggedStations]);

  useEffect(() => {
    const refreshData = () => {
      if (isEditCompletedVisit && sessionVisitId) {
        console.log("🔄 Refreshing data after returning from ReportScreen");
        setRefreshKey(prev => prev + 1);
      }
    };

    // This will run when component mounts or when returning from another screen
    refreshData();
  }, [isEditCompletedVisit, sessionVisitId]);

  // In MyocideScreen.js - Add this useEffect to load existing data
  useEffect(() => {
    const loadExistingVisitData = async () => {
      if (isEditCompletedVisit && sessionVisitId && loggedStations.length === 0) {
        console.log("🔄 Loading existing visit data for editing:", sessionVisitId);
        
        try {
          const report = await apiService.getVisitReport(sessionVisitId);
          
          if (report?.success && report.report?.stations) {
            console.log("📥 Loaded stations from database:", report.report.stations.length);
            
            // Transform database stations to loggedStations format
            const transformedStations = report.report.stations.map(station => ({
              stationId: station.station_id || station.station_number,
              stationType: station.station_type,
              capture: station.capture,
              rodentsCaptured: station.rodents_captured,
              triggered: station.triggered,
              replacedSurface: station.replaced_surface,
              consumption: station.consumption,
              baitType: station.bait_type,
              mosquitoes: station.mosquitoes,
              lepidoptera: station.lepidoptera,
              drosophila: station.drosophila,
              flies: station.flies,
              others: station.others,
              replaceBulb: station.replace_bulb,
              condition: station.condition,
              access: station.access,
              dosage_g: station.dosage_g 
            }));
            
            console.log("🔄 Setting loggedStations from database:", 
              transformedStations.map(s => `${s.stationType}${s.stationId}`));
            
            // CRITICAL: Set the loggedStations state
            setLoggedStations(transformedStations);
            
            // Also update sessionVisitId if needed
            if (!sessionVisitId && report.report.visitId) {
              setSessionVisitId(report.report.visitId);
              if (session) {
                session.visitId = report.report.visitId;
              }
            }
          } else {
            console.log("⚠️ No stations found in report");
          }
        } catch (error) {
          console.error("❌ Failed to load existing visit data:", error);
        }
      }
    };
    
    // Also load data when sessionVisitId changes
    if (isEditCompletedVisit && sessionVisitId) {
      loadExistingVisitData();
    }
  }, [isEditCompletedVisit, sessionVisitId, loggedStations.length, refreshKey]);

  const handleMapPress = (evt) => {
    if (!addingStation || !selectedMap) return;

    const x = evt.nativeEvent.locationX;
    const y = evt.nativeEvent.locationY;

    const newStation = {
      id: getNextIdForType(editStationType),
      type: editStationType,
      x: x / (deviceWidth * scale),
      y: y / (deviceWidth * scale)
    };

    setStations([...stations, newStation]);
    setAddingStation(false);
  };

  if (loadingCustomer) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading customer maps…</Text>
      </View>
    );
  }

  if (!Array.isArray(customerMaps) || customerMaps.length === 0 || !selectedMap) {
    // TEMPORARY DEBUG VIEW - replace the entire return statement
    return (
       <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <View style={styles.container}>
          {/* Keep the top buttons for navigation */}
          <View style={styles.topButtons}>
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          </View>

          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20}}>
            <Text style={{fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#1f9c8d'}}>
              DEBUG VIEW
            </Text>
            
            <View style={{backgroundColor: '#f5f5f5', padding: 20, borderRadius: 10, width: '100%'}}>
              <Text style={{fontSize: 16, fontWeight: 'bold', marginBottom: 10}}>STATUS:</Text>
              <Text>selectedMap exists: {selectedMap ? '✅ YES' : '❌ NO'}</Text>
              <Text>selectedMap.image: "{selectedMap?.image || 'none'}"</Text>
              <Text>imageError: {imageError ? '✅ YES' : '❌ NO'}</Text>
              <Text>currentImageUri: {currentImageUri || 'none'}</Text>
              <Text>customerMaps length: {customerMaps.length}</Text>
              <Text>Customer: {customer?.customerName || 'none'}</Text>
              
              <View style={{marginTop: 20, padding: 10, backgroundColor: '#e8f4f3', borderRadius: 5}}>
                <Text style={{fontWeight: 'bold'}}>Image Test:</Text>
                {selectedMap?.image && (
                  <>
                    <Text>URL: {currentImageUri}</Text>
                    <TouchableOpacity 
                      style={{backgroundColor: '#1f9c8d', padding: 10, borderRadius: 5, marginTop: 10}}
                      onPress={() => {
                        console.log("Testing image URL:", currentImageUri);
                        fetch(currentImageUri)
                          .then(res => {
                            console.log("Image fetch result:", res.status, res.statusText);
                            Alert.alert("Image Test", `Status: ${res.status} ${res.statusText}`);
                          })
                          .catch(err => {
                            console.error("Image fetch error:", err);
                            Alert.alert("Image Test Error", err.message);
                          });
                      }}
                    >
                      <Text style={{color: 'white', textAlign: 'center'}}>Test Image URL</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
              
              <View style={{marginTop: 20}}>
                <Text style={{fontWeight: 'bold'}}>Raw Data:</Text>
                <Text style={{fontSize: 10, color: '#666'}}>
                  {JSON.stringify({
                    selectedMap,
                    customerId: customer?.customerId,
                    customerMaps: customerMaps.slice(0, 1) // Show only first map
                  }, null, 2)}
                </Text>
              </View>
            </View>
            
            {/* Try to load the image anyway */}
            {selectedMap?.image && (
              <View style={{marginTop: 20, width: '100%'}}>
                <Text style={{fontWeight: 'bold', marginBottom: 10}}>Image Preview:</Text>
                <Image
                  source={{ uri: currentImageUri }}
                  style={{width: 200, height: 200, alignSelf: 'center', borderWidth: 1, borderColor: '#ccc'}}
                  onError={(e) => {
                    console.log("❌ Image error in debug:", e.nativeEvent.error);
                    Alert.alert("Image Error", e.nativeEvent.error);
                  }}
                  onLoad={() => console.log("✅ Image loaded in debug!")}
                />
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 110 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          {/* Top Bar with Timer */}
          <View style={styles.topButtons}>
            {editMode ? (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  setEditMode(false);
                  setAddingStation(false);
                  setRemovingStation(false);
                }}
              >
                <Text style={styles.backBtnText}>Cancel Edit</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
            )}

            {/* Timer Display */}
            {timerActive && (
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>
                  ⏱ {formatTime(elapsedTime)}
                </Text>
              </View>
            )}

            {/* Edit Map Button - Now in the top row */}
            {!editMode && !workStarted && !timerActive && (
              <TouchableOpacity 
                style={styles.editBtnTop} 
                onPress={() => setEditMode(true)}
              >
                <Text style={styles.editBtnText}>Edit Map</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.chooseMapBtn}
              onPress={() => setShowMapDropdown(!showMapDropdown)}
            >
              <Text style={styles.backBtnText}>Choose Map ▼</Text>
            </TouchableOpacity>
          </View>

          {showMapDropdown && (
            <View style={styles.mapDropdown}>
              {customerMaps.map((map, index) => (
                <TouchableOpacity
                  key={map.mapId || `map_${index}`}
                  style={styles.mapDropdownItem}
                  onPress={() => handleMapSelect(map)}
                >
                  <Text>{map.name || `Map ${index + 1}`}</Text> 
                </TouchableOpacity>
              ))}
            </View>
          )}
          <ScrollView
            style={{ flex: 1 }}
            maximumZoomScale={4}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.mapContainer}>
              <PinchGestureHandler
                onGestureEvent={(e) =>
                  setScale(Math.max(1, Math.min(3, e.nativeEvent.scale)))
                }
              >
                <Animated.View>
                  <TouchableOpacity activeOpacity={1} onPress={handleMapPress}>
                    {/* Show image only if we have a valid URI and no error */}
                    {currentImageUri && !imageError ? (
                      <Image
                        source={{ uri: currentImageUri }}
                        style={styles.map}
                        resizeMode="contain"
                        onLoad={() => console.log("✅ Image loaded:", currentImageUri)}
                        onError={(e) => {
                          console.error("❌ Image load failed:", e.nativeEvent.error);
                          setImageError(true);
                        }}
                      />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <Text>No Map Image</Text>
                      </View>
                    )}
                    {stations.map((st, index) => {            
                      const uniqueKey = `${st.type || "BS"}_${st.id}_${index}`;
                      
                      const left = st.x * deviceWidth * scale;
                      const top = st.y * deviceWidth * scale;

                      return (
                        <View key={uniqueKey} style={styles.markerWrapper}> 
                          <PanGestureHandler
                            onGestureEvent={(evt) =>
                              editMode &&
                              startDrag(st.id, evt.nativeEvent.x, evt.nativeEvent.y)
                            }
                          >
                            <Animated.View
                              style={[
                                styles.marker,
                                (() => {
                                  const label = getMarkerLabel(st);
                                  const size = getMarkerSize(label);
                                  
                                  // DEBUG: Check if station is completed
                                  const isCompletedValue = isStationCompleted(st.id, st.type || "BS");
                                  console.log(`🎯 Marker ${st.type || "BS"}${st.id} opacity check:`, {
                                    stationId: st.id,
                                    stationType: st.type,
                                    isCompleted: isCompletedValue,
                                    opacity: isCompletedValue ? 0.4 : 1
                                  });

                                  return {
                                    left,
                                    top,
                                    opacity: isCompletedValue ? 0.4 : 1,
                                    width: size,
                                    height: 28,
                                    borderRadius: 14,
                                    backgroundColor: getStationColor(
                                      st.type || "BS",
                                      isCompletedValue
                                    ),
                                    transform: [
                                      { translateX: -(size / 2) },
                                      { translateY: -14 }
                                    ],
                                  };
                                })()
                              ]}
                            >
                              <TouchableOpacity
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  justifyContent: "center",
                                  alignItems: "center"
                                }}
                                onPress={() => {
                                  const stationType = st.type || "BS";
                                  
                                  console.log("🚨 Station clicked:", {
                                    stationId: st.id,
                                    stationType: stationType
                                  });
                                  
                                  // Debug the station data
                                  debugStationData(st.id, stationType);
                                  
                                  // EDIT MODE (for completed visits)
                                  if (isEditCompletedVisit) {
                                    console.log("🚨 Setting selectedStation for edit mode");
                                    setSelectedStation({ id: st.id, type: stationType });
                                    return;
                                  }

                                  // WORK MODE (timer running for new visits)
                                  if (!editMode && workStarted) {
                                    if (isStationCompleted(st.id, stationType)) {
                                      const stationLabel = getStationLabel(stationType);
                                      Alert.alert(
                                        `Edit ${stationLabel}`,
                                        `Are you sure you want to edit ${stationLabel} ${st.id}?`,
                                        [
                                          { text: "Cancel", style: "cancel" },
                                          {
                                            text: "I'm sure",
                                            style: "destructive",
                                            onPress: () =>
                                              setSelectedStation({ id: st.id, type: stationType }),
                                          },
                                        ]
                                      );
                                    } else {
                                      setSelectedStation({ id: st.id, type: stationType });
                                    }
                                    return;
                                  }

                                  // Edit map – remove mode
                                  if (editMode && removingStation) {
                                    if ((st.type || "BS") !== editStationType) return;
                                    setStations(stations.filter(
                                      s => !(s.id === st.id && (s.type || "BS") === (st.type || "BS"))
                                    ));
                                    return;
                                  }

                                  // Not working yet
                                  if (!workStarted && !editMode) {
                                    Alert.alert("Info", "Start work first to log station data");
                                  }
                                }}
                              >
                                {(() => {
                                  const label = getMarkerLabel(st);
                                  const isLongLabel = label.length >= 4;

                                  return (
                                    <Text
                                      style={[
                                        styles.markerText,
                                        isLongLabel && styles.markerTextSmall
                                      ]}
                                      numberOfLines={1}
                                      adjustsFontSizeToFit
                                      minimumFontScale={0.8}
                                    >
                                      {label}
                                    </Text>
                                  );
                                })()}
                              </TouchableOpacity>
                            </Animated.View>
                          </PanGestureHandler>
                        </View>
                      );
                    })}
                  </TouchableOpacity>
                </Animated.View>
              </PinchGestureHandler>
            </View>
          </ScrollView>

          {editMode && (
            <View style={styles.editButtons}>
              {/* Type dropdown */}
              <View style={{ width: "100%", paddingHorizontal: 20, marginBottom: 10 }}>
                <TouchableOpacity
                  style={[styles.editBtn, { width: "100%" }]}
                  onPress={() => setShowTypeDropdown(v => !v)}
                >
                  <Text style={styles.editBtnText}>
                    {editStationType === "BS"
                      ? "Bait Station (BS) ▼"
                      : editStationType === "RM"
                      ? "Multicatch (RM) ▼"
                      : editStationType === "ST"
                      ? "Snap Trap (ST) ▼"
                      : "Light Trap (LT) ▼"}
                  </Text>
                </TouchableOpacity>

                {showTypeDropdown && (
                  <View style={[styles.mapDropdown, { position: "relative", top: 0, right: 0, marginTop: 8 }]}>
                    <TouchableOpacity
                      style={styles.mapDropdownItem}
                      onPress={() => { setEditStationType("BS"); setShowTypeDropdown(false); }}
                    >
                      <Text>Bait Station (BS)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.mapDropdownItem}
                      onPress={() => { setEditStationType("RM"); setShowTypeDropdown(false); }}
                    >
                      <Text>Multicatch (RM)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.mapDropdownItem}
                      onPress={() => { setEditStationType("ST"); setShowTypeDropdown(false); }}
                    >
                      <Text>Snap Trap (ST)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.mapDropdownItem}
                      onPress={() => { setEditStationType("LT"); setShowTypeDropdown(false); }}
                    >
                      <Text>Light Trap (LT)</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Dynamic buttons */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={[styles.editBtn, { flex: 1 }, saving && { opacity: 0.7 }]}
                  onPress={() => setAddingStation(true)}
                  disabled={saving}
                >
                  <Text style={styles.editBtnText}>
                    {editStationType === "BS"
                      ? "Add BS"
                      : editStationType === "RM"
                      ? "Add RM"
                      : editStationType === "ST"
                      ? "Add ST"
                      : "Add LT"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.editBtn, { flex: 1 }, saving && { opacity: 0.7 }]}
                  onPress={() => setRemovingStation(true)}
                  disabled={saving}
                >
                  <Text style={styles.editBtnText}>
                    {editStationType === "BS"
                      ? "Remove BS"
                      : editStationType === "RM"
                      ? "Remove RM"
                      : editStationType === "ST"
                      ? "Remove ST"
                      : "Remove LT"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.editBtn, { flex: 1 }, saving && { opacity: 0.7 }]}
                  onPress={saveStations}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.editBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STATUS INDICATORS - Show when service is started */}
          {serviceStarted && (
            <View style={styles.statusContainerBottom}>
              <View style={styles.statusItem}>
                <View style={[
                  styles.statusIndicator,
                  serviceStarted ? styles.statusActive : styles.statusInactive
                ]}>
                  <Text style={styles.statusText}>1</Text>
                </View>
                <Text style={styles.statusLabel}>Started</Text>
              </View>
              
              <View style={styles.statusConnector} />
              
              <View style={styles.statusItem}>
                <View style={[
                  styles.statusIndicator,
                  serviceCompleted ? styles.statusActive : styles.statusInactive
                ]}>
                  <Text style={styles.statusText}>2</Text>
                </View>
                <Text style={styles.statusLabel}>Completed</Text>
              </View>
            </View>
          )}

          {/* === ADDED SERVICE NOTES SECTION === */}
          {serviceStarted && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Service Notes:</Text>
              <TextInput
                style={[styles.notesInput, !serviceStarted && styles.disabledInput]}
                multiline
                value={notes}
                onChangeText={(text) => {
                  if (!serviceStarted) {
                    Alert.alert(
                      "Start Service Required",
                      "Please start the service before adding notes.",
                      [{ text: "OK" }]
                    );
                    return;
                  }
                  setNotes(text);
                }}
                placeholder="Enter service notes here..."
                editable={serviceStarted}
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* MAIN ACTION BUTTONS */}
          <View style={{ alignItems: "center", marginVertical: 10, paddingHorizontal: 20 }}>
            {/* 1. UPDATE SERVICE BUTTON - Show for COMPLETED appointments */}
            {isEditCompletedVisit && !timerActive && !editMode && !showSaveCancel && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleUpdateService}
              >
                <Text style={styles.primaryText}>Update Service</Text>
              </TouchableOpacity>
            )}

            {/* 2. GENERATE REPORT BUTTON - Show for COMPLETED appointments */}
            {isEditCompletedVisit && !hasGeneratedReport && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleGenerateReport}
              >
                <Text style={styles.primaryText}>Generate Report</Text>
              </TouchableOpacity>
            )}

            
            {/* 4. START WORK BUTTON - ONLY show for NEW visits (not completed, no edit mode) */}
            {isAppointmentSession &&
              !timerActive &&
              !editMode &&
              !workStarted &&
              !showSaveCancel && (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={startTimer}
                >
                  <Text style={styles.primaryText}>▶ Start Work</Text>
                </TouchableOpacity>
              )}
            
            {/* 5. SAVE/CANCEL BUTTONS - During active work session (timer running) */}
            {showSaveCancel && timerActive && !isEditCompletedVisit && (
              <View style={styles.saveCancelContainer}>
                <TouchableOpacity 
                  style={styles.saveWorkButton}
                  onPress={handleSaveAll}
                >
                  <Text style={styles.saveWorkButtonText}>Finish & Save</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.cancelWorkBtn}
                  onPress={handleCancelWork}
                >
                  <Text style={styles.cancelWorkText}>Cancel Work</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {selectedStation && (workStarted || isEditCompletedVisit) && (
            <View style={styles.stationOverlay}>
              {selectedStation.type === "BS" && (
                <BaitStationForm
                  stationId={selectedStation.id}
                  customerId={effectiveCustomer?.customerId}
                  technician={technician}
                  timerData={isEditCompletedVisit ? null : {
                    startTime,
                    elapsedTime,
                    appointmentId: session?.appointmentId,
                    visitId: sessionVisitId,
                  }}
                  onStationLogged={(stationData) => {
                    upsertLoggedStation({ 
                      ...stationData, 
                      stationType: "BS",
                      timestamp: isEditCompletedVisit ? new Date().toISOString() : undefined
                    });
                  }}
                  existingStationData={
                    loggedStations.find(
                      s => s.stationId === selectedStation.id && 
                      s.stationType === (selectedStation.type || "BS")
                    ) || null
                  }
                  onClose={() => setSelectedStation(null)}
                />
              )}

              {(selectedStation.type === "RM" || selectedStation.type === "ST") && (
                <AtoxicStationForm
                  stationId={selectedStation.id}
                  stationType={selectedStation.type}
                  customerId={effectiveCustomer?.customerId}
                  technician={technician}
                  timerData={isEditCompletedVisit ? null : {
                    startTime,
                    elapsedTime,
                    appointmentId: session?.appointmentId,
                    visitId: sessionVisitId,
                  }}
                  onStationLogged={(stationData) => {
                    upsertLoggedStation({ 
                      ...stationData,
                      stationType: selectedStation.type,
                      timestamp: isEditCompletedVisit ? new Date().toISOString() : undefined
                    });
                  }}
                  existingStationData={
                    loggedStations.find(
                      s =>
                        s.stationId === selectedStation.id &&
                        s.stationType === selectedStation.type
                    ) || null
                  }
                  onClose={() => setSelectedStation(null)}
                />
              )}

              {selectedStation.type === "LT" && (
                <LightTrapForm
                  stationId={selectedStation.id}
                  technician={technician}
                  timerData={isEditCompletedVisit ? null : {
                    startTime,
                    elapsedTime,
                    visitId: sessionVisitId,
                  }}
                  onStationLogged={(stationData) => {
                    upsertLoggedStation({ 
                      ...stationData,
                      stationType: "LT",
                      timestamp: isEditCompletedVisit ? new Date().toISOString() : undefined
                    });
                  }}
                  existingStationData={
                    loggedStations.find(
                      s => s.stationId === selectedStation.id && s.stationType === "LT"
                    ) || null
                  }
                  onClose={() => setSelectedStation(null)}
                />
              )}
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: "#fff" },

  topButtons: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    gap: 10,
  },

  backBtn: {
    backgroundColor: "#1f9c8d",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  backBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  chooseMapBtn: {
    backgroundColor: "#1f9c8d",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  timerContainer: {
    backgroundColor: "#1f9c8d",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: { color: "#fff", fontWeight: "bold" },

  // Status Indicators Styles - Positioned at bottom
  statusContainerBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    position: 'absolute',
    bottom: 280, 
    left: 20,
    right: 20,
    zIndex: 10,
  },
  statusItem: {
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  statusIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  statusInactive: {
    backgroundColor: '#e9ecef',
    borderWidth: 2,
    borderColor: '#dee2e6',
  },
  statusActive: {
    backgroundColor: '#1f9c8d',
    borderWidth: 2,
    borderColor: '#1a8c7d',
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statusConnector: {
    width: 40,
    height: 2,
    backgroundColor: '#e9ecef',
  },

  startButtonText: { color: "#fff", fontWeight: "bold" },

  mapDropdown: {
    position: "absolute",
    right: 20,
    top: Platform.OS === "ios" ? 100 : 80,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    zIndex: 20,
    elevation: 5,
  },
  mapDropdownItem: { paddingVertical: 8 },

  mapContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  map: { width: "100%", aspectRatio: 1 },

  marker: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(31,156,142,0.8)",
    borderWidth: 2,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  markerText: { color: "#fff", fontWeight: "bold", fontSize: 10 },

  markerTextSmall: {
    fontSize: 9,
    letterSpacing: -0.3,
  },

  editButtons: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 15,
    borderRadius: 12,
    gap: 12,
    elevation: 10,
    zIndex: 1000,
  },

  editBtn: {
    backgroundColor: "#1f9c8d",
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  editBtnText: { color: "#fff", fontWeight: "bold" },

  centerButton: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
  },

  saveCancelContainer: {
    width: '100%',
    gap: 10,
    alignItems: 'center', // Center the buttons
  },
   saveWorkButton: {
    backgroundColor: '#1f9c8d',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%', // Full width but centered by container
  },
  saveWorkButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  cancelWorkBtn: {
    backgroundColor: '#dc3545',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%', // Full width but centered by container
  },
  cancelWorkText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  placeholderImage: {
    width: deviceWidth,
    height: deviceWidth,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    borderRadius: 10,
    marginVertical: 20,
  },
  
  placeholderText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  
  placeholderSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  debugText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  primaryBtn: {
    backgroundColor: '#1f9c8d',
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
    width: '100%', // Make it full width
    marginHorizontal: 20, // Add horizontal margin
  },

  secondaryBtn: {
    backgroundColor: '#0f6a61',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    width: '100%', // Make it full width
    marginHorizontal: 20, // Add horizontal margin
  },

  primaryText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },

  reloadButton: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1f9c8d',
    borderRadius: 8,
  },

  reloadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  noMapContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  noMapText: { fontSize: 20, fontWeight: "bold", color: "#666" },
  noMapSubtext: { fontSize: 16, color: "#999" },

  stationOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#f5f5f5",
    zIndex: 9999,
    elevation: 9999,
  },
  editBtnTop: {
    backgroundColor: "#1f9c8d",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginLeft: 10,
  },
  startButtonBottom: {
    backgroundColor: "#1f9c8b",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: "center",
  },
  notesContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    marginTop: 80, // Add margin to push it below the top buttons
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#f8f9fa",
    minHeight: 100,
    textAlignVertical: "top",
  },
  disabledInput: {
    backgroundColor: "#e9ecef",
    color: "#6c757d",
    borderColor: "#ced4da",
  },
  markerWrapper: {
    position: "absolute", 
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "box-none",
  },
});
export default MapScreen;