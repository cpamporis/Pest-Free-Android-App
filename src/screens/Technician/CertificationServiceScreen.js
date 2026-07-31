// CertificationServiceScreen.js - Test iOS
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
  Modal,
  findNodeHandle,
} from "react-native";
import {
  PanGestureHandler,
  PinchGestureHandler,
  Swipeable,
} from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { formatTime } from "../../utils/timeUtils";
import apiService, { API_BASE_URL } from "../../services/apiService";
import BaitStationForm from "../../components/BaitStationForm";
import { Dimensions } from "react-native";
import AtoxicStationForm from "../../components/AtoxicStationForm";
import LightTrapForm from "../../components/LTForm";
import * as ImagePicker from "expo-image-picker";  
import { SafeAreaView } from "react-native-safe-area-context";
import PheromoneTrapForm from "../../components/PheromoneTrapForm";
import i18n from "../../services/i18n";
import ChemicalsDropdown from "../../components/ChemicalsDropdown";
import { MaterialIcons } from "@expo/vector-icons";

// Real code after imports
const { width: deviceWidth } = Dimensions.get("window");

// ---- Station label helper ----
const getStationLabel = (stationType) => {
  switch (stationType) {
    case "RM":
      return i18n.t("technician.myocide.stationTypes.multicatch");
    case "ST":
      return i18n.t("technician.myocide.stationTypes.snapTrap");
    case "LT":
      return i18n.t("technician.myocide.stationTypes.lightTrap");
    case "PT":
      return i18n.t("technician.myocide.stationTypes.pheromoneTrap");
    case "BS":
    default:
      return i18n.t("technician.myocide.stationTypes.baitStation");
  }
};

const getStationColor = (type, isCompleted) => {
  if (isCompleted) return "#bdbdbd";

  switch (type) {
    case "BS":
      return "#1f9c8b";
    case "RM":
      return "#5a5a5a";
    case "ST":
      return "#0c6b5e";
    case "LT":
      return "#6d7e87";
    case "PT":
      return "#8a6bbf"; // pick any distinct color you like
    default:
      return "#1f9c8b";
  }
};

const calculateImageLayout = (containerW, containerH, imageW, imageH) => {
  const imageRatio = imageW / imageH;
  const containerRatio = containerW / containerH;

  let width, height, offsetX = 0, offsetY = 0;

  if (imageRatio > containerRatio) {
    width = containerW;
    height = containerW / imageRatio;
    offsetY = (containerH - height) / 2;
  } else {
    height = containerH;
    width = containerH * imageRatio;
    offsetX = (containerW - width) / 2;
  }

  return { width, height, offsetX, offsetY };
};

// ---- Marker label layout helpers ----
const getMarkerLabel = (st) => `${st.type || "BS"}${st.id}`;

const getMarkerSize = (label) => {
  return label.length >= 4 ? 34 : 28;
};

const markAppointmentCompleted = async (appointmentId, visitId, sessionRef) => {
  if (!appointmentId) return;


  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appointmentId);
    
    if (isUUID && visitId) { // Make sure visitId exists
      
      const updateResult = await apiService.updateAppointment({
        id: appointmentId,
        status: "completed",
        visitId: visitId // This will set the visit_id column
      });
      
      
      // ✅ ADD THIS: Handle price errors like Disinfection screen does
      if (!updateResult?.success) {
        console.error("❌ Failed to update appointment:", updateResult?.error);
        
        // Check if it's a price error
        if (updateResult?.error?.includes('Service price must be set')) {
          Alert.alert(
            i18n.t("technician.myocide.alerts.priceNotSet"),
            i18n.t("technician.myocide.alerts.priceNotSetMessage"),
            [{ text: i18n.t("technician.common.ok") }]
          );
          return; // Stop here if price error
        }
      }
    } 

    // Always update the session object
    if (sessionRef && typeof sessionRef === 'object') {
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
  
  const [selectedMap, setSelectedMap] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null); 
  const [showMapDropdown, setShowMapDropdown] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [addingStation, setAddingStation] = useState(false);
  const [removingStation, setRemovingStation] = useState(false);
  const [scale, setScale] = useState(1);
  const [imageLayout, setImageLayout] = useState({
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0
  });
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
  const [selectedChemicals, setSelectedChemicals] = useState([]);
  const [treatedAreas, setTreatedAreas] = useState([]);
  const [areaNameInput, setAreaNameInput] = useState("");
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [activeAreaId, setActiveAreaId] = useState(null);
  const [areaNotes, setAreaNotes] = useState("");
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [reportImages, setReportImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const removeNewImage = (index) => {
    setReportImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const dismissKeyboardWhenTouchingOutsideInput = (event) => {
    const focusedInput = TextInput.State.currentlyFocusedInput?.();
    if (!focusedInput) return;

    const focusedInputHandle = findNodeHandle(focusedInput);

    if (event.nativeEvent.target !== focusedInputHandle) {
      Keyboard.dismiss();
    }
  };

  const totalPhotos = useMemo(() => {
  return (reportImages?.length || 0) + (existingImages?.length || 0);
}, [reportImages, existingImages]);

  const addTreatedArea = () => {
    const name = areaNameInput.trim();
    if (!name) return;
    setTreatedAreas(prev => [
      ...prev,
      { id: `area_${Date.now()}`, name, chemicals: [], areaNotes: "" }
    ]);
    setAreaNameInput("");
  };

  const openArea = (area) => {
    setActiveAreaId(area.id);
    setAreaNotes(area.areaNotes || "");
    setAreaModalVisible(true);
  };

  const addChemicalToActiveArea = (chemical) => {
    const name = typeof chemical === "string"
      ? chemical
      : chemical?.name || chemical?.chemicalName;
    if (!name || !activeAreaId) return;

    setTreatedAreas(prev => prev.map(area => {
      if (area.id !== activeAreaId) return area;
      const chemicals = Array.isArray(area.chemicals) ? area.chemicals : [];
      if (chemicals.some(c => c.name === name)) return area;
      return {
        ...area,
        chemicals: [...chemicals, { name, concentration: "", volume: "" }]
      };
    }));
  };

  const updateAreaChemical = (index, field, value) => {
    setTreatedAreas(prev => prev.map(area => {
      if (area.id !== activeAreaId) return area;
      const chemicals = [...(area.chemicals || [])];
      chemicals[index] = { ...chemicals[index], [field]: value };
      return { ...area, chemicals };
    }));
  };

  const saveActiveArea = () => {
    setTreatedAreas(prev => prev.map(area =>
      area.id === activeAreaId ? { ...area, areaNotes } : area
    ));
    setAreaModalVisible(false);
  };

  const normalizedCustomer = useMemo(() => {
    if (!customer) return null;

    return {
      customerId: customer.customerId ?? customer.id ?? null,
      customerName: customer.customerName ?? customer.name ?? "",
      address: customer.address ?? "",
      email: customer.email ?? "",
      tin: customer.tin ?? "",
      ama: customer.ama ?? "",
      maps: Array.isArray(customer.maps) ? customer.maps : []
    };
  }, [customer]);

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
  const dragStartRef = useRef({}); 
  const [showSaveCancel, setShowSaveCancel] = useState(false);
  const [workStarted, setWorkStarted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState('');
  
  // STATUS STATES
  const [serviceStarted, setServiceStarted] = useState(false);
  const [serviceCompleted, setServiceCompleted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const SERVER_BASE_URL = API_BASE_URL.replace("/api", ""); 

  const effectiveCustomer = customerWithMaps ?? normalizedCustomer;
  
  // Log the first map details
  if (Array.isArray(customerMaps) && customerMaps.length > 0) {
    const firstMap = customerMaps[0];

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

  // In your useEffect where you load customer data:
  useEffect(() => {
    const loadCustomerData = async () => {
      if (!normalizedCustomer?.customerId) return;

      setLoadingCustomer(true);
      
      try {
        const customerData = await apiService.getCustomerWithMaps(normalizedCustomer.customerId);
        
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

useEffect(() => {
  const loadExistingVisitData = async () => {
    if (isEditCompletedVisit && sessionVisitId && loggedStations.length === 0) {
      
      try {
        setLoading(true);
        
        // Try getServiceLogByVisitId instead of getVisitReport
        const response = await apiService.getVisitReport(sessionVisitId);

        // Check different possible response structures
        let reportData = null;
        
        if (response?.success && response.log) {
          reportData = response.log;
        } else if (response?.success && response.report) {
          reportData = response.report;
        } else if (response?.data) {
          reportData = response.data;
        } else if (response?.report) {
          reportData = response.report;
        }

        if (reportData) {
          setServiceStarted(true);
          
          // Load existing images
          let parsedImages = [];

          if (reportData?.images) {
            parsedImages = reportData.images;
          }

          // Handle postgres string "{file.jpg,file2.jpg}"
          if (typeof parsedImages === "string") {
            parsedImages = parsedImages
              .replace(/[{}"]/g, "")
              .split(",")
              .map(i => i.trim())
              .filter(Boolean);
          }

          // Handle single filename
          if (typeof parsedImages === "object" && !Array.isArray(parsedImages)) {
            parsedImages = [parsedImages];
          }

          // Ensure array
          if (!Array.isArray(parsedImages)) {
            parsedImages = [];
          }

          setExistingImages(parsedImages);

          const chemicals = reportData.chemicals_used || reportData.chemicalsUsed || [];
          const areas = reportData.treated_areas || reportData.treatedAreas || [];
          setSelectedChemicals(Array.isArray(chemicals) ? chemicals : []);
          setTreatedAreas(Array.isArray(areas) ? areas : []);
          
          // Check where stations are stored - could be in stations or treated_areas
          let stationsArray = [];
          
          if (reportData.stations && reportData.stations.length > 0) {
            stationsArray = reportData.stations;
          }
          
          // Load stations data
          if (stationsArray.length > 0) {
            // Transform database stations to loggedStations format
            const transformedStations = stationsArray.map(station => ({
              stationId: station.station_id || station.station_number || station.id,
              stationType: station.station_type || station.type || "BS",
              capture: station.capture,
              rodentsCaptured: station.rodents_captured || station.rodentsCaptured,
              triggered: station.triggered,
              replacedSurface: station.replaced_surface || station.replacedSurface,
              consumption: station.consumption,
              baitType: station.bait_type || station.baitType,
              mosquitoes: station.mosquitoes,
              lepidoptera: station.lepidoptera,
              drosophila: station.drosophila,
              flies: station.flies,
              others: station.others,
              replaceBulb: station.replace_bulb || station.replaceBulb,
              condition: station.condition,
              access: station.access,
              dosage_g: station.dosage_g,
              pheromoneType: station.pheromone_type || station.pheromoneType,
              replacedPheromone: station.replaced_pheromone || station.replacedPheromone,
              insectsCaptured: station.insects_captured || station.insectsCaptured,
              damaged: station.damaged
            }));
            
            setLoggedStations(transformedStations);
          }
          
          // Load notes
          if (reportData.notes) {
            setNotes(reportData.notes);
          }
          
          // Load duration if available
          if (reportData.duration) {
            setElapsedTime(reportData.duration * 1000); // Convert seconds to milliseconds
          }
          
        } 
      } catch (error) {
        console.error("❌ Failed to load existing visit data:", error);
        Alert.alert(
          i18n.t("technician.common.error"),
          i18n.t("technician.specialServices.errors.noDataFound") || "Failed to load existing service data. You can still edit but previous data may not appear."
        );
      } finally {
        setLoading(false);
      }
    }
  };
  
  if (isEditCompletedVisit && sessionVisitId) {
    loadExistingVisitData();
  }
}, [isEditCompletedVisit, sessionVisitId]);


// Use customerWithMaps instead of customer

  const startTimer = () => {
    if (timerActive) return;
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

    if (!sessionVisitId) {
      Alert.alert(
        i18n.t("technician.common.error"),
        i18n.t("technician.specialServices.errors.noVisitId") || "Visit ID is missing. Please save the service first."
      );
      return;
    }

    onGenerateReport({
      visitId: sessionVisitId,
      serviceType: "certificate"
    });

    // ✅ NOW hide the button
    setHasGeneratedReport(true);
  };

  const appendImagesToFormData = (formData, images) => {
    if (!Array.isArray(images)) return;

    images.forEach((img, index) => {
      if (!img?.uri) return;

      const uri =
        Platform.OS === "ios"
          ? img.uri.replace("file://", "")
          : img.uri;

      const name =
        img.fileName ||
        img.name ||
        `photo_${Date.now()}_${index}.jpg`;

      const type = img.type || "image/jpeg";

      formData.append("images", {
        uri,
        name,
        type,
      });
    });
  };


// In CertificationServiceScreen.js - Update the handleSaveAll function

const handleSaveAll = async () => {

  // Transform stations to the format expected by the backend
  const stationsToSend = loggedStations.map(station => ({
    station_id: station.stationId,
    station_number: station.stationId,
    station_type: station.stationType,
    consumption: station.consumption,
    bait_type: station.baitType,
    capture: station.capture,
    rodents_captured: station.rodentsCaptured,
    triggered: station.triggered,
    replaced_surface: station.replacedSurface,
    condition: station.condition,
    access: station.access,
    dosage_g: station.dosage_g,
    // LT fields
    mosquitoes: station.mosquitoes,
    lepidoptera: station.lepidoptera,
    drosophila: station.drosophila,
    flies: station.flies,
    others: station.others,
    replace_bulb: station.replaceBulb,
    // PT fields (NEW)
    pheromone_type: station.pheromoneType,
    replaced_pheromone: station.replacedPheromone,
    insects_captured: station.insectsCaptured,
    damaged: station.damaged
  }));

  if (!effectiveCustomer?.tin || !effectiveCustomer?.ama) {
    Alert.alert(
      i18n.t("technician.certificate.missingCustomerData"),
      i18n.t("technician.certificate.missingCustomerDataMessage"),
      [{ text: i18n.t("technician.common.ok") }]
    );
    return;
  }

  const hasCertificationData =
    stationsToSend.length > 0 ||
    selectedChemicals.length > 0 ||
    treatedAreas.length > 0 ||
    notes.trim().length > 0 ||
    reportImages.length > 0 ||
    existingImages.length > 0;

  if (!hasCertificationData) {
    Alert.alert(
      i18n.t("technician.certificate.noData"),
      i18n.t("technician.certificate.noDataMessage")
    );
    return;
  }

  stopTimer();

  // Generate a visitId if not exists
  const generatedVisitId = sessionVisitId || `certificate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 🚨 FIX: Convert elapsedTime from milliseconds to seconds
  const durationInSeconds = Math.floor(elapsedTime / 1000);
  
  const visitSummary = {
    serviceType: "certificate",
    startTime,
    endTime: Date.now(),
    duration: durationInSeconds,  // Now in seconds, not milliseconds
    customerId: effectiveCustomer?.customerId,
    customerName: effectiveCustomer?.customerName,
    technicianId: technician?.id,
    technicianName: technician?.name || `${technician?.firstName || ''} ${technician?.lastName || ''}`.trim(),
    appointmentId: session?.appointmentId,
    workType: isEditCompletedVisit
      ? "Updated Visit"
      : (session?.fromAppointment ? "Scheduled Appointment" : "Manual Visit"),
    visitId: generatedVisitId,
    logId: generatedVisitId,
    notes: notes || ""
  };

  // Validate required fields
  if (!visitSummary.technicianName) {
    console.error("❌ Missing technicianName", { technician });
    Alert.alert(i18n.t("technician.common.error"), i18n.t("technician.specialServices.errors.missingInfo"));
    return;
  }

  try {
    const formData = new FormData();

    // Add the data with properly formatted stations
    formData.append(
  "data",
  JSON.stringify({
    visitSummary: {
      ...visitSummary,
      customerId: effectiveCustomer?.customerId,
      service_type: "certificate"
    },
    stations: stationsToSend,
    chemicalsUsed: selectedChemicals,
    treatedAreas
  })
);

    formData.append("chemicals_used", JSON.stringify(selectedChemicals));
    formData.append("treated_areas", JSON.stringify(treatedAreas));

    // Add new images - limit to prevent timeout
    const MAX_IMAGES = 5;
    const imagesToUpload = reportImages.slice(0, MAX_IMAGES);
    
    if (reportImages.length > MAX_IMAGES) {
      Alert.alert(
        i18n.t("technician.common.warning"),
        i18n.t("technician.myocide.alerts.uploadTimeoutMessage") || "Only the first 5 images will be uploaded. Please save and upload additional images separately."
      );
    }

    imagesToUpload.forEach((img, index) => {
      if (!img?.uri) return;
      
      const uri = Platform.OS === "ios" ? img.uri.replace("file://", "") : img.uri;
      const name = img.fileName || img.name || `photo_${Date.now()}_${index}.jpg`;
      const type = img.type || "image/jpeg";
      
      formData.append("images", {
        uri,
        name,
        type,
      });
    });

    // Add existing images as JSON string
    formData.append("existingImages", JSON.stringify(existingImages));


    // Show loading indicator
    setSaving(true);

    const result = await apiService.submitServiceLog(formData);
   
    if (!result?.success) {
      throw new Error(result?.error || i18n.t("technician.myocide.alerts.saveFailed"));
    }

    // Success handling...
    if (result?.visitId) {
      session.visitId = result.visitId;
      setSessionVisitId(result.visitId);

      if (session.appointmentId) {
        await apiService.updateAppointment({
          id: session.appointmentId,
          status: "completed",
          visitId: result.visitId
        });
      }
    }

    await handleSaveResponse(result);

  } catch (error) {
    console.error("❌ Error in handleSaveAll:", error);
    
    setSaving(false);
    
    // Check if it's a timeout error
    if (error.message?.includes('Network request failed') || error.message?.includes('timeout')) {
      Alert.alert(
        i18n.t("technician.myocide.alerts.uploadTimeout"),
        i18n.t("technician.myocide.alerts.uploadTimeoutMessage"),
        [
          { text: i18n.t("technician.myocide.alerts.tryAgain"), onPress: () => handleSaveAll() },
          { text: i18n.t("technician.myocide.alerts.cancel"), style: "cancel" }
        ]
      );
    } else if (error.message?.includes('Service price must be set')) {
      Alert.alert(
        i18n.t("technician.myocide.alerts.priceNotSet"),
        i18n.t("technician.myocide.alerts.priceNotSetMessage"),
        [{ text: i18n.t("technician.common.ok") }]
      );
    } else {
      Alert.alert(
        i18n.t("technician.myocide.alerts.saveFailed"), 
        error.message || i18n.t("technician.myocide.alerts.saveFailed"),
        [{ text: i18n.t("technician.common.ok") }]
      );
    }
  } finally {
    setSaving(false);
  }
};

  const handleSaveResponse = async (result, isEdit = false) => {

    if (!result) {
      Alert.alert(i18n.t("technician.common.error"), i18n.t("technician.myocide.alerts.saveFailed"));
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
      `${i18n.t("technician.report.visitOverview.duration")}: ${formatTime(elapsedTime)}\n` +
      `${i18n.t("technician.report.stationSummary.totalStations", { count: loggedStations.length })}: ${stationSummary}\n\n` +
      `${i18n.t("technician.myocide.alerts.serviceUpdatedMessage", { count: loggedStations.length })}`;

    Alert.alert(
      isEdit ? i18n.t("technician.myocide.actionButtons.updateService") : i18n.t("technician.common.success"), 
      message, 
      [{ text: i18n.t("technician.common.ok") }]
    );

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
      i18n.t("technician.myocide.confirmations.cancelWork"),
      i18n.t("technician.myocide.confirmations.cancelWorkMessage"),
      [
        { 
          text: i18n.t("technician.myocide.confirmations.noContinue"), 
          style: "cancel" 
        },
        { 
          text: i18n.t("technician.myocide.confirmations.yesCancel"), 
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
              i18n.t("technician.myocide.alerts.workCancelled"),
              i18n.t("technician.myocide.alerts.workCancelledMessage"),
              [{ text: i18n.t("technician.common.ok"), onPress: () => {} }]
            );
          }
        }
      ]
    );
  };

  // ---------------- IMAGE FUNCTIONS ----------------
  const pickImagesFromGallery = async () => {
  try {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert(
        "Permission required",
        "Gallery permission is required."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setReportImages(prev => [...prev, ...result.assets]);
    }
  } catch (error) {
    console.error("Gallery error:", error);
  }
};

const captureImages = async () => {
  try {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert(
        "Permission required",
        "Camera permission is required."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled) {
      setReportImages(prev => [...prev, ...result.assets]);
    }
  } catch (error) {
    console.error("Camera error:", error);
  }
};

  const openImageChooser = () => {
    if (!serviceStarted) {
      Alert.alert(
        i18n.t("technician.myocide.alerts.startServiceFirst"),
        i18n.t("technician.myocide.alerts.startServiceRequired")
      );
      return;
    }

    Alert.alert(i18n.t("technician.myocide.photos.add"), i18n.t("common.chooseOption") || "Choose source", [
      { text: i18n.t("components.chemicalsDropdown.camera") || "Camera", onPress: captureImages },
      { text: i18n.t("components.chemicalsDropdown.gallery") || "Gallery", onPress: pickImagesFromGallery },
      { text: i18n.t("common.cancel"), style: "cancel" }
    ]);
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


  useEffect(() => {
    const getVisitIdFromAppointment = async () => {
      if (session?.appointmentId && !sessionVisitId && session?.status === "completed") {
        try {
          const visitId = await apiService.getVisitIdByAppointmentId(session.appointmentId);
          if (visitId) {
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

  // In CertificationServiceScreen.js - buildMyocideReportContext function
  const buildMyocideReportContext = () => {
    if (!sessionVisitId) {
      Alert.alert(
        i18n.t("technician.common.error"),
        i18n.t("technician.specialServices.errors.noVisitId") || "No visit ID found. Please save the service first.",
        [{ text: i18n.t("technician.common.ok") }]
      );
      return null;
    }

    return {
      visitId: sessionVisitId,
      customerName: effectiveCustomer.customerName,
      technicianName: technician
        ? `${technician.firstName} ${technician.lastName}`
        : i18n.t("technician.common.notAvailable"),
      serviceTypeName: i18n.t("technician.report.stationSummary.baitStations") || "Myocide Service",
      stationCounts: loggedStations.reduce(
        (acc, s) => {
          acc[s.stationType] = (acc[s.stationType] || 0) + 1;
          return acc;
        },
        {}
      )
    };
  };

  const buildExistingImageUrl = (img) => {
    if (!img) return null;

    let value = String(img).trim().replace(/[{}"]/g, "");

    // If multiple full URLs were concatenated, keep the last one
    const matches = value.match(/https?:\/\/[^ ]+/g);
    if (matches && matches.length > 0) {
      value = matches[matches.length - 1];
    }

    // From full URL -> filename
    if (value.startsWith("http://") || value.startsWith("https://")) {
      value = value.split("?")[0];
      value = value.substring(value.lastIndexOf("/") + 1);
    }

    // From /uploads/file -> filename
    if (value.includes("/uploads/")) {
      value = value.substring(value.lastIndexOf("/") + 1);
    }

    return `${SERVER_BASE_URL}/uploads/${value}`;
  };

  // In CertificationServiceScreen.js - Update upsertLoggedStation
  const upsertLoggedStation = (stationData) => {

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

    setLoggedStations(prev => {
      const index = prev.findIndex(
        s =>
          s.stationId === normalized.stationId &&
          s.stationType === normalized.stationType
      );

      if (index !== -1) {
        const updated = [...prev];
        updated[index] = normalized;
        return updated;
      }

      return [...prev, normalized];
    });

    Alert.alert(
      i18n.t("technician.common.success"),
      i18n.t("technician.myocide.alerts.stationLogged", { 
        type: normalized.stationType, 
        id: normalized.stationId 
      })
    );
  };

  const showValidationMessage = (message) => {
    setSuccessMessage(message);

    setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);
  };

    // In CertificationServiceScreen.js - Update the isStationCompleted function
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
      foundStation.access === "no" ||

      // BS / RM / ST
      (foundStation.capture !== null && foundStation.capture !== undefined) ||
      (foundStation.consumption !== null && foundStation.consumption !== undefined) ||
      (foundStation.condition !== null && foundStation.condition !== undefined) ||

      // LT
      (foundStation.mosquitoes !== null && foundStation.mosquitoes !== undefined) ||

      // PT (NEW)
      (foundStation.pheromoneType !== null && foundStation.pheromoneType !== undefined && foundStation.pheromoneType !== "") ||
      (foundStation.replacedPheromone !== null && foundStation.replacedPheromone !== undefined) ||
      (foundStation.insectsCaptured !== null && foundStation.insectsCaptured !== undefined && String(foundStation.insectsCaptured).trim() !== "") ||
      (foundStation.damaged !== null && foundStation.damaged !== undefined);
    
    return hasData;
  };

  const debugStationData = (stationId, stationType) => {
    const station = loggedStations.find(s => 
      s.stationId === stationId && s.stationType === stationType
    );
    
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
      // Format stations for backend
      const stationsToSave = stations.map(st => ({
        id: st.id,
        type: st.type || "BS",
        x: st.x,
        y: st.y
      }));

      // Save to SQL using new endpoint
      const result = await apiService.saveMapStations(selectedMap.mapId, stationsToSave);

      if (result && result.success) {

        // Immediately refresh the customer data to see if stations were saved
        try {

          const freshCustomerData = await apiService.getCustomerWithMaps(effectiveCustomer.customerId);

          
          setCustomerWithMaps(freshCustomerData);
        } catch (refreshError) {
          console.error("❌ Error refreshing:", refreshError);
        }

        Alert.alert(i18n.t("common.success"), i18n.t("technician.myocide.editButtons.save") + " " + i18n.t("common.success"));
        setEditMode(false);
        setAddingStation(false);
        setRemovingStation(false);
      } else {
        console.error("❌ Save failed:", result);
        Alert.alert(i18n.t("common.error"), result?.error || i18n.t("technician.myocide.alerts.saveFailed"));
      }

    } catch (error) {
      console.error("❌ Save stations error:", error);
      Alert.alert(i18n.t("common.error"), error.message || i18n.t("technician.myocide.alerts.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (id, type) => {
    const st = stations.find(s => s.id === id && (s.type || "BS") === type);
    if (!st) return;

    dragStartRef.current = {
      id,
      type,
      startX: st.x,
      startY: st.y
    };
  };

  const handleDragMove = (evt) => {
    const { translationX, translationY } = evt.nativeEvent;
    const drag = dragStartRef.current;

    if (!drag?.id) return;

    const deltaX = translationX / imageLayout.width;
    const deltaY = translationY / imageLayout.height;

    const newX = Math.max(0, Math.min(1, drag.startX + deltaX));
    const newY = Math.max(0, Math.min(1, drag.startY + deltaY));

    setStations(prev =>
      prev.map(st =>
        st.id === drag.id && (st.type || "BS") === drag.type
          ? { ...st, x: newX, y: newY }
          : st
      )
    );
  };

  const debugStationCompletion = () => {
    
    stations.forEach(st => {
      const isCompleted = isStationCompleted(st.id, st.type || "BS");
      const stationData = loggedStations.find(s => 
        s.stationId === st.id && s.stationType === (st.type || "BS")
      );

    });
  };

  const getNextIdForType = (type) => {
    const sameType = stations.filter(s => (s.type || "BS") === type);
    if (sameType.length === 0) return 1;
    return Math.max(...sameType.map(s => Number(s.id) || 0)) + 1;
  };
  
  const handleUpdateService = async () => {
    
    // Ensure technician name is available
    const technicianName = technician?.name || 
                          `${technician?.firstName || ''} ${technician?.lastName || ''}`.trim();
    
    if (!technicianName) {
      console.error("❌ Missing technicianName", { technician });
      Alert.alert(i18n.t("technician.common.error"), i18n.t("technician.specialServices.errors.missingInfo"));
      return;
    }
    
    // Transform stations to the format expected by the backend
    const stationsToSend = loggedStations.map(station => ({
      station_id: station.stationId,
      station_number: station.stationId,
      station_type: station.stationType,
      consumption: station.consumption,
      bait_type: station.baitType,
      capture: station.capture,
      rodents_captured: station.rodentsCaptured,
      triggered: station.triggered,
      replaced_surface: station.replacedSurface,
      condition: station.condition,
      access: station.access,
      dosage_g: station.dosage_g,
      // LT fields
      mosquitoes: station.mosquitoes,
      lepidoptera: station.lepidoptera,
      drosophila: station.drosophila,
      flies: station.flies,
      others: station.others,
      replace_bulb: station.replaceBulb,
      // PT fields (NEW)
      pheromone_type: station.pheromoneType,
      replaced_pheromone: station.replacedPheromone,
      insects_captured: station.insectsCaptured,
      damaged: station.damaged
    }));

    if (!effectiveCustomer?.tin || !effectiveCustomer?.ama) {
      Alert.alert(
        i18n.t("technician.certificate.missingCustomerData"),
        i18n.t("technician.certificate.missingCustomerDataMessage"),
        [{ text: i18n.t("technician.common.ok") }]
      );
      return;
    }

    // Generate visitId if not exists
    const generatedVisitId = sessionVisitId || `certificate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate duration in seconds
    const durationInSeconds = Math.floor(elapsedTime / 1000);
    
    const visitSummary = {
      serviceType: "certificate",
      startTime: startTime || Date.now() - 3600000, // Default to 1 hour ago if not set
      endTime: Date.now(),
      duration: durationInSeconds,
      customerId: effectiveCustomer?.customerId,
      customerName: effectiveCustomer?.customerName,
      technicianId: technician?.id,
      technicianName: technicianName, // Use the variable we created
      appointmentId: session?.appointmentId,
      workType: isEditCompletedVisit ? "Updated Visit" : "Scheduled Appointment",
      visitId: generatedVisitId,
      logId: generatedVisitId,
      notes: notes || ''
    };

    try {
      const formData = new FormData();

      formData.append(
  "data",
  JSON.stringify({
    visitSummary: {
      ...visitSummary,
      customerId: effectiveCustomer?.customerId,
      service_type: "certificate"
    },
    stations: stationsToSend,
    chemicalsUsed: selectedChemicals,
    treatedAreas
  })
);

      formData.append("chemicals_used", JSON.stringify(selectedChemicals));
      formData.append("treated_areas", JSON.stringify(treatedAreas));

      // Add new images
      reportImages.forEach((img, index) => {
        if (!img?.uri) return;
        
        const uri = Platform.OS === "ios" ? img.uri.replace("file://", "") : img.uri;
        const name = img.fileName || img.name || `photo_${Date.now()}_${index}.jpg`;
        const type = img.type || "image/jpeg";
        
        formData.append("images", {
          uri,
          name,
          type,
        });
      });

      // Add existing images as JSON string
      formData.append("existingImages", JSON.stringify(existingImages));

      setSaving(true);
      const result = await apiService.submitServiceLog(formData);

      if (!result?.success) {
        throw new Error(result?.error || i18n.t("technician.myocide.alerts.saveFailed"));
      }

      if (result?.visitId) {

        session.visitId = result.visitId;
        setSessionVisitId(result.visitId);
        
        if (session?.appointmentId) {
          await apiService.updateAppointment({
            id: session.appointmentId,
            status: "completed",
            visitId: result.visitId
          });
        }
      }
      
      // Set service as completed to show Generate Report button
      setServiceCompleted(true);
      setWorkStarted(false);
      setTimerActive(false);
      setHasGeneratedReport(false);
      setIsEditCompletedVisit(true);
      
      Alert.alert(
        i18n.t("technician.myocide.alerts.serviceUpdated"),
        i18n.t("technician.myocide.alerts.serviceUpdatedMessage", { count: stationsToSend.length }),
        [{ text: i18n.t("technician.common.ok") }]
      );

    } catch (error) {
      console.error("❌ Update service error:", error);
      
      if (error.message?.includes('Service price must be set')) {
        Alert.alert(
          i18n.t("technician.myocide.alerts.priceNotSet"),
          i18n.t("technician.myocide.alerts.priceNotSetMessage"),
          [{ text: i18n.t("technician.common.ok") }]
        );
      } else {
        Alert.alert(i18n.t("technician.common.error"), error.message || i18n.t("technician.myocide.alerts.saveFailed"));
      }
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    debugStationCompletion();
  }, [loggedStations]);

  useEffect(() => {
    const refreshData = () => {
      if (isEditCompletedVisit && sessionVisitId) {
        setRefreshKey(prev => prev + 1);
      }
    };

    // This will run when component mounts or when returning from another screen
    refreshData();
  }, [isEditCompletedVisit, sessionVisitId]);


  const handleMapPress = (evt) => {
    if (!addingStation || !selectedMap) return;

    const x = evt.nativeEvent.locationX;
    const y = evt.nativeEvent.locationY;

    const newStation = {
      id: getNextIdForType(editStationType),
      type: editStationType,
      x: (x - imageLayout.offsetX) / imageLayout.width,
      y: (y - imageLayout.offsetY) / imageLayout.height
    };

    setStations([...stations, newStation]);
    setAddingStation(false);
  };

  if (loadingCustomer) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>{i18n.t("technician.common.loading")}</Text>
      </View>
    );
  }

  // Certification may be completed without a map. Keep the normal screen open
  // and let the certification section below act as the complete service form.
  if (false && (!Array.isArray(customerMaps) || customerMaps.length === 0 || !selectedMap)) {
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
              <Text style={styles.backBtnText}>← {i18n.t("technician.common.back")}</Text>
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
      <View
        style={styles.container}
        onTouchStart={dismissKeyboardWhenTouchingOutsideInput}
      >
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
                <Text style={styles.backBtnText}>{i18n.t("technician.myocide.cancelEdit")}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                <Text style={styles.backBtnText}>← {i18n.t("technician.common.back")}</Text>
              </TouchableOpacity>
            )}

            {/* Timer Display */}
            {timerActive && (
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>
                  {i18n.t("technician.myocide.timer", { time: formatTime(elapsedTime) })}
                </Text>
              </View>
            )}

            {/* Edit Map Button - Now in the top row */}
            {Boolean(selectedMap?.image) && !editMode && !workStarted && !timerActive && (
              <TouchableOpacity 
                style={styles.editBtnTop} 
                onPress={() => setEditMode(true)}
              >
                <Text style={styles.editBtnText}>{i18n.t("technician.myocide.editMap")}</Text>
              </TouchableOpacity>
            )}

            {customerMaps.length > 0 && (
              <TouchableOpacity
                style={styles.chooseMapBtn}
                onPress={() => setShowMapDropdown(!showMapDropdown)}
              >
                <Text style={styles.backBtnText}>{i18n.t("technician.myocide.chooseMap")}</Text>
              </TouchableOpacity>
            )}
          </View>

          {showMapDropdown && (
            <View style={styles.mapDropdown}>
              {customerMaps.map((map, index) => (
                <TouchableOpacity
                  key={map.mapId || `map_${index}`}
                  style={styles.mapDropdownItem}
                  onPress={() => handleMapSelect(map)}
                >
                  <Text>{map.name || i18n.t("technician.myocide.mapDropdown.mapName", { number: index + 1 })}</Text> 
                </TouchableOpacity>
              ))}
            </View>
          )}

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            maximumZoomScale={4}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            onScrollBeginDrag={Keyboard.dismiss}
          >
            {selectedMap?.image ? (
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
                        onLoad={(e) => {
                          const { width: imgW, height: imgH } = e.nativeEvent.source;

                          const containerW = deviceWidth;
                          const containerH = deviceWidth;

                          const layout = calculateImageLayout(
                            containerW,
                            containerH,
                            imgW,
                            imgH
                          );

                          setImageLayout(layout);
                        }}
                      />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <Text>{i18n.t("technician.myocide.noMaps")}</Text>
                      </View>
                    )}
                    {stations.map((st, index) => {            
                      const uniqueKey = `${st.type || "BS"}_${st.id}_${index}`;
                      
                      const left = imageLayout.offsetX + (st.x * imageLayout.width);
                      const top = imageLayout.offsetY + (st.y * imageLayout.height);

                      return (
                        <View key={uniqueKey} style={styles.markerWrapper}> 
                          <PanGestureHandler
                            onBegan={() => handleDragStart(st.id, st.type || "BS")}
                            onGestureEvent={handleDragMove}
                          >
                            <Animated.View
                              style={[
                                styles.marker,
                                (() => {
                                  const label = getMarkerLabel(st);
                                  const size = getMarkerSize(label);
                                  
                                  // DEBUG: Check if station is completed
                                  const isCompletedValue = isStationCompleted(st.id, st.type || "BS");

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
                                  
                            
                                  
                                  // Debug the station data
                                  debugStationData(st.id, stationType);
                                  
                                  // EDIT MODE (for completed visits)
                                  if (isEditCompletedVisit) {
         
                                    setSelectedStation({ id: st.id, type: stationType });
                                    return;
                                  }

                                  // WORK MODE (timer running for new visits)
                                  if (!editMode && workStarted) {
                                    if (isStationCompleted(st.id, stationType)) {
                                      const stationLabel = getStationLabel(stationType);
                                      Alert.alert(
                                        i18n.t("technician.myocide.confirmations.editStation", { type: stationLabel }),
                                        i18n.t("technician.myocide.confirmations.editStationMessage", { 
                                          type: stationLabel, 
                                          id: st.id 
                                        }),
                                        [
                                          { text: i18n.t("common.cancel"), style: "cancel" },
                                          {
                                            text: i18n.t("technician.myocide.confirmations.imSure"),
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
                                    Alert.alert(
                                      i18n.t("technician.common.info"), 
                                      i18n.t("technician.myocide.alerts.startServiceRequired")
                                    );
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
            ) : (
              <View
                style={{
                  marginHorizontal: 20,
                  marginTop: 12,
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: "#eef8f6",
                  borderWidth: 1,
                  borderColor: "#b9ddd7"
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#176f63" }}>
                  {i18n.t("technician.certificate.noMapInspection")}
                </Text>
                <Text style={{ marginTop: 6, color: "#4f625f", lineHeight: 20 }}>
                  {i18n.t("technician.certificate.noMapOptional") ||
                    "You can complete the certification using treated areas, chemicals, notes and photos."}
                </Text>
              </View>
            )}

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
                      ? `${i18n.t("technician.myocide.stationTypes.baitStation")} ▼`
                      : editStationType === "RM"
                      ? `${i18n.t("technician.myocide.stationTypes.multicatch")} ▼`
                      : editStationType === "ST"
                      ? `${i18n.t("technician.myocide.stationTypes.snapTrap")} ▼`
                      : editStationType === "LT"
                      ? `${i18n.t("technician.myocide.stationTypes.lightTrap")} ▼`
                      : `${i18n.t("technician.myocide.stationTypes.pheromoneTrap")} ▼`}
                  </Text>
                </TouchableOpacity>

                {showTypeDropdown && (
                  <View style={[styles.mapDropdown, { position: "relative", top: 0, right: 0, marginTop: 8 }]}>
                    <TouchableOpacity
                      style={styles.mapDropdownItem}
                      onPress={() => { setEditStationType("BS"); setShowTypeDropdown(false); }}
                    >
                      <Text>{i18n.t("technician.myocide.stationTypes.baitStation")}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.mapDropdownItem}
                      onPress={() => { setEditStationType("RM"); setShowTypeDropdown(false); }}
                    >
                      <Text>{i18n.t("technician.myocide.stationTypes.multicatch")}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.mapDropdownItem}
                      onPress={() => { setEditStationType("ST"); setShowTypeDropdown(false); }}
                    >
                      <Text>{i18n.t("technician.myocide.stationTypes.snapTrap")}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.mapDropdownItem}
                      onPress={() => { setEditStationType("LT"); setShowTypeDropdown(false); }}
                    >
                      <Text>{i18n.t("technician.myocide.stationTypes.lightTrap")}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.mapDropdownItem}
                      onPress={() => { setEditStationType("PT"); setShowTypeDropdown(false); }}
                    >
                      <Text>{i18n.t("technician.myocide.stationTypes.pheromoneTrap")}</Text>
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
                    {i18n.t("technician.myocide.editButtons.add", { 
                      type: editStationType === "BS" ? "BS" : 
                            editStationType === "RM" ? "RM" :
                            editStationType === "ST" ? "ST" :
                            editStationType === "LT" ? "LT" : "PT"
                    })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.editBtn, { flex: 1 }, saving && { opacity: 0.7 }]}
                  onPress={() => setRemovingStation(true)}
                  disabled={saving}
                >
                  <Text style={styles.editBtnText}>
                    {i18n.t("technician.myocide.editButtons.remove", { 
                      type: editStationType === "BS" ? "BS" : 
                            editStationType === "RM" ? "RM" :
                            editStationType === "ST" ? "ST" :
                            editStationType === "LT" ? "LT" : "PT"
                    })}
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
                    <Text style={styles.editBtnText}>{i18n.t("technician.myocide.editButtons.save")}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* CERTIFICATION DETAILS — remains available even when no map exists */}
          {serviceStarted && (
            <View style={styles.certificationSection}>
              <Text style={styles.certificationTitle}>
                {i18n.t("technician.certificate.certificationSection")}
              </Text>

              <View style={styles.identityCard}>
                <Text style={styles.identityText}>{i18n.t("customer.tin")}: {effectiveCustomer?.tin || "—"}</Text>
                <Text style={styles.identityText}>{i18n.t("customer.ama")}: {effectiveCustomer?.ama || "—"}</Text>
              </View>

              <ChemicalsDropdown
                selectedChemicals={selectedChemicals}
                onChemicalsChange={setSelectedChemicals}
                disabled={!serviceStarted}
                editable={serviceStarted}
              />

              <View style={styles.areaAddRow}>
                <TextInput
                  style={styles.areaNameInput}
                  value={areaNameInput}
                  onChangeText={setAreaNameInput}
                  placeholder={i18n.t("technician.specialServices.areaPlaceholder")}
                />
                <TouchableOpacity style={styles.areaAddButton} onPress={addTreatedArea}>
                  <Text style={styles.areaAddButtonText}>{i18n.t("technician.specialServices.add")}</Text>
                </TouchableOpacity>
              </View>

              {treatedAreas.map(area => (
                <View key={area.id} style={styles.areaSwipeContainer}>
                  <Swipeable
                    friction={2}
                    rightThreshold={40}
                    overshootRight={false}
                    renderRightActions={() => (
                      <TouchableOpacity
                        style={styles.areaSwipeDelete}
                        onPress={() =>
                          setTreatedAreas(prev =>
                            prev.filter(item => item.id !== area.id)
                          )
                        }
                      >
                        <MaterialIcons name="delete-outline" size={24} color="#fff" />
                        <Text style={styles.areaSwipeDeleteText}>
                          {i18n.t("common.delete", { defaultValue: "Delete" })}
                        </Text>
                      </TouchableOpacity>
                    )}
                  >
                    <TouchableOpacity
                      style={styles.areaItem}
                      activeOpacity={0.8}
                      onPress={() => {
                        Keyboard.dismiss();
                        openArea(area);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.areaItemTitle}>{area.name}</Text>
                        <Text style={styles.areaItemMeta}>
                          {(area.chemicals || []).length}{" "}
                          {i18n.t("technician.specialServices.chemicalsUsed")}
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-left" size={22} color="#87938f" />
                    </TouchableOpacity>
                  </Swipeable>
                </View>
              ))}
            </View>
          )}

          {/* === ADDED SERVICE NOTES SECTION === */}
          {serviceStarted && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>{i18n.t("technician.myocide.serviceNotes.label")}</Text>
              <TextInput
                style={[styles.notesInput, !serviceStarted && styles.disabledInput]}
                multiline
                value={notes}
                onChangeText={(text) => {
                  if (!serviceStarted) {
                    Alert.alert(
                      i18n.t("technician.myocide.alerts.startServiceFirst"),
                      i18n.t("technician.myocide.alerts.startServiceRequired"),
                      [{ text: i18n.t("technician.common.ok") }]
                    );
                    return;
                  }
                  setNotes(text);
                }}
                placeholder={i18n.t("technician.myocide.serviceNotes.placeholder")}
                editable={serviceStarted}
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* VIEW PHOTOS BUTTON */}
          {serviceStarted && totalPhotos > 0 && (
            <View style={{ alignItems: "center", paddingHorizontal: 20, marginTop: 10}}>
              <TouchableOpacity
                style={styles.saveWorkButton}
                onPress={() => setShowPhotoViewer(true)}
              >
                <Text style={styles.saveWorkButtonText}>
                  {i18n.t("technician.myocide.photos.view", { count: totalPhotos })}
                </Text>
              </TouchableOpacity>
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
                <Text style={styles.primaryText}>{i18n.t("technician.myocide.actionButtons.updateService")}</Text>
              </TouchableOpacity>
            )}

            {/* 2. GENERATE REPORT BUTTON - Show for COMPLETED appointments */}
            {isEditCompletedVisit && !hasGeneratedReport && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleGenerateReport}
              >
                <Text style={styles.primaryText}>{i18n.t("technician.myocide.actionButtons.generateReport")}</Text>
              </TouchableOpacity>
            )}

            
          </View>

          </ScrollView>

          {!keyboardVisible &&
            !editMode &&
            !selectedStation &&
            !showPhotoViewer &&
            !areaModalVisible && (
              <SafeAreaView style={styles.bottomActionDock} edges={["bottom"]}>
                {!timerActive &&
                  !serviceStarted &&
                  !serviceCompleted &&
                  !isEditCompletedVisit && (
                    <TouchableOpacity
                      style={[styles.bottomActionButton, styles.startActionButton]}
                      onPress={startTimer}
                      disabled={saving}
                    >
                      <Text style={styles.bottomActionButtonText}>
                        {i18n.t("technician.myocide.actionButtons.startWork")}
                      </Text>
                    </TouchableOpacity>
                  )}

                {serviceStarted && (
                  <TouchableOpacity
                    style={[
                      styles.bottomActionButton,
                      styles.photoActionButton,
                      saving && styles.disabledActionButton,
                    ]}
                    onPress={openImageChooser}
                    disabled={saving}
                  >
                    <MaterialIcons name="add-a-photo" size={20} color="#fff" />
                    <Text style={styles.bottomActionButtonText}>
                      {reportImages.length > 0
                        ? i18n.t("technician.myocide.photos.addMore")
                        : i18n.t("technician.myocide.photos.add")}
                    </Text>
                  </TouchableOpacity>
                )}

                {timerActive && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.bottomActionButton,
                        styles.finishActionButton,
                        saving && styles.disabledActionButton,
                      ]}
                      onPress={handleSaveAll}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.bottomActionButtonText}>
                          {i18n.t("technician.myocide.actionButtons.finishAndSave")}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.bottomActionButton,
                        styles.cancelActionButton,
                        saving && styles.disabledActionButton,
                      ]}
                      onPress={handleCancelWork}
                      disabled={saving}
                    >
                      <Text style={styles.bottomActionButtonText}>
                        {i18n.t("technician.myocide.actionButtons.cancelWork")}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </SafeAreaView>
            )}

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

              {selectedStation.type === "PT" && (
                <PheromoneTrapForm
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
                      stationType: "PT",
                      timestamp: isEditCompletedVisit ? new Date().toISOString() : undefined
                    });
                  }}
                  existingStationData={
                    loggedStations.find(
                      s => s.stationId === selectedStation.id && s.stationType === "PT"
                    ) || null
                  }
                  onClose={() => setSelectedStation(null)}
                />
              )}
            </View>
          )}
          {showPhotoViewer && (
  <SafeAreaView style={styles.photoViewer}>

    <View style={styles.photoViewerHeader}>
      <Text style={styles.photoViewerTitle}>{i18n.t("technician.myocide.photos.servicePhotos")}</Text>

      <TouchableOpacity onPress={() => setShowPhotoViewer(false)}>
        <Text style={styles.closeText}>{i18n.t("technician.myocide.photos.close")}</Text>
      </TouchableOpacity>
    </View>

    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.photoScrollContainer}
      showsVerticalScrollIndicator={true}
    >
      {(existingImages || []).map((img, index) => {

        const imageUri = buildExistingImageUrl(img);

        return (
          <View key={`existing-${index}`} style={styles.photoWrapper}>
            <Image
              source={{ uri: imageUri }}
              style={styles.viewerImage}
              resizeMode="cover"
              onError={(e) =>
                console.log("❌ Image load error:", imageUri, e.nativeEvent?.error)
              }
            />

            <TouchableOpacity
              style={styles.deletePhotoBtn}
              onPress={() => removeExistingImage(index)}
            >
              <Text style={styles.deletePhotoText}>✕</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {(reportImages || []).map((img, index) => (
        <View key={`new-${index}`} style={styles.photoWrapper}>
          <Image
            source={{ uri: img.uri }}
            style={styles.viewerImage}
          />

          <TouchableOpacity
            style={styles.deletePhotoBtn}
            onPress={() => removeNewImage(index)}
          >
            <Text style={styles.deletePhotoText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>

  </SafeAreaView>
)}
          <Modal
            visible={areaModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => {
              Keyboard.dismiss();
              setAreaModalVisible(false);
            }}
          >
            <KeyboardAvoidingView
              style={styles.modalKeyboardAvoider}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={0}
            >
              <View
                style={styles.areaModalOverlay}
                onTouchStart={dismissKeyboardWhenTouchingOutsideInput}
              >
                  <View style={styles.areaModalCard}>
                    <Text style={styles.certificationTitle}>
                      {treatedAreas.find(a => a.id === activeAreaId)?.name || ""}
                    </Text>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginVertical: 12 }}
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode={
                        Platform.OS === "ios" ? "interactive" : "on-drag"
                      }
                    >
                      {selectedChemicals.map((chemical, index) => {
                        const name =
                          typeof chemical === "string"
                            ? chemical
                            : chemical.name || chemical.chemicalName;
                        return (
                          <TouchableOpacity
                            key={`${name}-${index}`}
                            style={styles.chemicalChip}
                            onPress={() => {
                              Keyboard.dismiss();
                              addChemicalToActiveArea(chemical);
                            }}
                          >
                            <Text style={styles.chemicalChipText}>{name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <ScrollView
                      style={styles.areaModalContent}
                      contentContainerStyle={styles.areaModalContentContainer}
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode={
                        Platform.OS === "ios" ? "interactive" : "on-drag"
                      }
                      onScrollBeginDrag={Keyboard.dismiss}
                    >
                      {(treatedAreas.find(a => a.id === activeAreaId)?.chemicals || []).map((chemical, index) => (
                        <View key={`${chemical.name}-${index}`} style={styles.areaChemicalRow}>
                          <Text style={styles.areaItemTitle}>{chemical.name}</Text>
                          <TextInput
                            style={styles.smallInput}
                            value={String(chemical.concentration || "").replace("%", "")}
                            onChangeText={value => updateAreaChemical(index, "concentration", value)}
                            placeholder="%"
                            keyboardType="decimal-pad"
                          />
                          <TextInput
                            style={styles.smallInput}
                            value={String(chemical.volume || "").replace("ml", "")}
                            onChangeText={value => updateAreaChemical(index, "volume", value)}
                            placeholder="ml"
                            keyboardType="decimal-pad"
                          />
                        </View>
                      ))}
                      <TextInput
                        style={styles.areaNotesInput}
                        value={areaNotes}
                        onChangeText={setAreaNotes}
                        multiline
                        placeholder={i18n.t("technician.specialServices.areaDetails.notesPlaceholder")}
                      />
                    </ScrollView>

                    <View style={styles.areaModalActions}>
                      <TouchableOpacity
                        style={styles.areaModalCancel}
                        onPress={() => {
                          Keyboard.dismiss();
                          setAreaModalVisible(false);
                        }}
                      >
                        <Text>{i18n.t("common.cancel")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.areaModalSave}
                        onPress={() => {
                          Keyboard.dismiss();
                          saveActiveArea();
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "700" }}>{i18n.t("common.save")}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: {
    paddingBottom: 12,
  },

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
  map: {
    width: deviceWidth,
    height: deviceWidth
  },

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
  marginHorizontal: 20
},

  secondaryBtn: {
  backgroundColor: '#0f6a61',
  padding: 16,
  borderRadius: 8,
  marginTop: 10,
  alignItems: 'center',
  marginHorizontal: 20
},

  primaryText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },

  bottomActionDock: {
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#dfe7e5",
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 8,
  },
  bottomActionButton: {
    minHeight: 50,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  bottomActionButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  startActionButton: {
    backgroundColor: "#1f9c8d",
  },
  photoActionButton: {
    backgroundColor: "#176f63",
  },
  finishActionButton: {
    backgroundColor: "#1f9c8d",
  },
  cancelActionButton: {
    backgroundColor: "#dc3545",
  },
  disabledActionButton: {
    opacity: 0.65,
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
  photoViewer: {
  flex: 1,
  backgroundColor: "#fff",
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 9999
},

  photoViewerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#eee"
  },

  photoViewerTitle: {
    fontSize: 18,
    fontWeight: "bold"
  },

  closeText: {
    color: "#1f9c8d",
    fontWeight: "bold",
    fontSize: 16
  },

  viewerImage: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    marginBottom: 15
  },
  photoWrapper: {
    marginBottom: 15,
    position: "relative"
  },

  deletePhotoBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center"
  },

  deletePhotoText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  },
  certificationSection: { marginHorizontal: 20, marginTop: 14, padding: 16, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e6efed" },
  certificationTitle: { fontSize: 18, fontWeight: "700", color: "#1f9c8b", marginBottom: 12 },
  identityCard: { backgroundColor: "#f0f9f8", padding: 12, borderRadius: 10, marginBottom: 14 },
  identityText: { color: "#334", fontSize: 14, marginBottom: 4 },
  areaAddRow: { flexDirection: "row", marginTop: 16, marginBottom: 10 },
  areaNameInput: { flex: 1, borderWidth: 1, borderColor: "#dfe7e5", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  areaAddButton: { marginLeft: 8, paddingHorizontal: 18, justifyContent: "center", borderRadius: 10, backgroundColor: "#1f9c8b" },
  areaAddButtonText: { color: "#fff", fontWeight: "700" },
  areaSwipeContainer: {
    marginTop: 8,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#dc3545",
  },
  areaSwipeDelete: {
    width: 104,
    backgroundColor: "#dc3545",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  areaSwipeDeleteText: {
    color: "#fff",
    fontWeight: "700",
  },
  areaItem: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#edf1f0",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  areaItemTitle: { fontSize: 15, fontWeight: "600", color: "#2c3e50" },
  areaItemMeta: { fontSize: 12, color: "#777", marginTop: 3 },
  modalKeyboardAvoider: { flex: 1 },
  areaModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  areaModalCard: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: "90%" },
  areaModalContent: { flexShrink: 1, maxHeight: 300 },
  areaModalContentContainer: { paddingBottom: 8 },
  chemicalChip: { borderWidth: 1, borderColor: "#1f9c8b", backgroundColor: "#eaf7f5", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  chemicalChipText: { color: "#1f9c8b", fontWeight: "600" },
  areaChemicalRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  smallInput: { width: 70, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 8 },
  areaNotesInput: { minHeight: 90, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, textAlignVertical: "top", marginTop: 12 },
  areaModalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  areaModalCancel: { flex: 1, alignItems: "center", padding: 14, backgroundColor: "#f2f2f2", borderRadius: 10 },
  areaModalSave: { flex: 1, alignItems: "center", padding: 14, backgroundColor: "#1f9c8b", borderRadius: 10 },
});
export default MapScreen;