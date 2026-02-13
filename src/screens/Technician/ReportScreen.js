// ReportScreen.js - FIXED VERSION
import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import apiService from "../../services/apiService";
import { formatTime } from "../../utils/timeUtils";
import pestfreeLogo from "../../../assets/pestfree_logo.png";
import { 
  formatTimeInGreece, 
  formatDateInGreece,
  debugTimeConversion 
} from "../../utils/timeZoneUtils";


export default function ReportScreen({ route, navigation, context, onBack }) { 
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [baitTypes, setBaitTypes] = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  
  const routeParams = route?.params || {};
  const contextParams = context || {};

  const visitId =
    routeParams.visitId ||
    contextParams.visitId;

  const serviceType =
    routeParams.serviceType ||
    contextParams.serviceType;

  const readOnly =
    routeParams.readOnly ??
    contextParams.readOnly ??
    false;

  const customerName =
    routeParams.customerName ||
    contextParams.customerName;

  const technicianName =
    routeParams.technicianName ||
    contextParams.technicianName;

  const startTime =
    routeParams.startTime ||
    contextParams.startTime;

  
  // Debug what we received
  console.log("🔍 ReportScreen received:", {
    routeParams: route?.params,
    visitId,
    serviceType,
    customerName,
    technicianName,
    hasNavigation: !!navigation,
    hasContext: !!context
  });

  // Fetch report function
  const fetchReport = async (visitId) => {
  console.log("📥 Fetching report for visitId:", visitId);

  setLoading(true);
  setError(null);

  try {
    console.log("🔄 Using getServiceLogByVisitId API method...");
    const res = await apiService.getServiceLogByVisitId(visitId);
    
    console.log("📥 Service log API response:", {
      success: res?.success,
      hasLog: !!res?.log,
      logKeys: res?.log ? Object.keys(res.log) : []
    });

    if (!res?.success) {
      throw new Error(res?.error || "Report not found");
    }

    const logData = res.log || res.report;
    
    if (!logData) {
      throw new Error("No service log data found");
    }

    // 🚨 DEBUG: Check if insecticide_details exists in ANY form
    console.log("🔍 DEBUG - Checking ALL fields in logData:");
    Object.keys(logData).forEach(key => {
      if (key.toLowerCase().includes('insect') || 
          key.toLowerCase().includes('detail') ||
          key.toLowerCase().includes('pest') ||
          key.toLowerCase().includes('treatment')) {
        console.log(`  ${key}:`, logData[key]);
      }
    });

    // Map the log data to report format
    const reportData = {
      // Basic info
      date: logData.created_at || new Date().toISOString().split('T')[0],
      duration: logData.duration || 0,
      customerName: logData.customer_name || logData.customerName,
      technicianName: logData.technician_name || logData.technicianName,
      serviceType: logData.service_type || logData.serviceType,
      serviceSubtype: logData.service_subtype || logData.serviceSubtype,
      notes: logData.notes || '',
      visitId: logData.visit_id || logData.visitId || visitId,
      
      // 🚨 CRITICAL: These fields are missing from the API response
      // We need to get them from somewhere else
      insecticideDetails: logData.insecticide_details || logData.insecticideDetails,
      insecticide_details: logData.insecticide_details,
      disinfectionDetails: logData.disinfection_details || logData.disinfectionDetails,
      disinfection_details: logData.disinfection_details,
      otherPestName: logData.otherPestName || logData.other_pest_name,
      other_pest_name: logData.other_pest_name,
      
      // Arrays
      chemicalsUsed: logData.chemicals_used || logData.chemicalsUsed || [],
      treatedAreas: logData.treated_areas || logData.treatedAreas || [],
      
      // Timestamps
      start_time: logData.service_start_time || logData.serviceStartTime,
      end_time: logData.service_end_time || logData.serviceEndTime,
      updatedAt: logData.updated_at || logData.updatedAt,
      
      // Station data
      stations: logData.stations || [],
      stationCounts: logData.stationCounts || { BS: 0, RM: 0, ST: 0, LT: 0 }
    };

    console.log("✅ Final report data - insecticide fields:", {
      hasInsecticideDetails: !!reportData.insecticideDetails,
      insecticideDetails: reportData.insecticideDetails,
      hasInsecticide_details: !!reportData.insecticide_details,
      insecticide_details: reportData.insecticide_details
    });

    setReport(reportData);

  } catch (err) {
    console.error("❌ Failed to load report:", err);
    setError(err.message || "Failed to load report");
    setReport(null);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    const visitIdFromSources =
      route?.params?.visitId ||
      context?.visitId;

    if (!visitIdFromSources) {
      console.error("❌ No visitId provided to ReportScreen");
      setError("No visit ID provided");
      setLoading(false);
      return;
    }

    fetchReport(visitIdFromSources);
  }, [route?.params?.visitId, context?.visitId]);


  // Group stations by type (only for myocide)
  const stationsByType = {
    BS: report?.stations?.filter(s => {
      const type = s.station_type || s.type || "";
      if (!type || type === "") {
        return s.bait_type || s.consumption || false;
      }
      return type === "BS" || type.toUpperCase() === "BS";
    }) || [],
    RM: report?.stations?.filter(s => {
      const type = s.station_type || s.type || "";
      if (!type || type === "") {
        return s.replaced_surface || false;
      }
      return type === "RM" || type.toUpperCase() === "RM";
    }) || [],
    ST: report?.stations?.filter(s => {
      const type = s.station_type || s.type || "";
      if (!type || type === "") {
        return s.triggered || false;
      }
      return type === "ST" || type.toUpperCase() === "ST";
    }) || [],
    LT: report?.stations?.filter(s => {
      const type = s.station_type || s.type || "";
      if (!type || type === "") {
        return s.mosquitoes !== undefined || s.lepidoptera !== undefined || 
              s.drosophila !== undefined || s.flies !== undefined;
      }
      return type === "LT" || type.toUpperCase() === "LT";
    }) || [],
  };

  // Sort function for myocide stations
  const sortByStationNumber = (a, b) => {
    const idA = parseInt(a.station_id || a.station_number || 0);
    const idB = parseInt(b.station_id || b.station_number || 0);
    return idA - idB;
  };

  const getVisitTimeDisplay = (dateString) => {
    return formatTimeInGreece(dateString);
  };

  useEffect(() => {
    if (report) {
      loadMaterials();
    }
  }, [report?.visitId]);

  // Helper function to get full material details with safety info
  const getMaterialSafetyInfo = (materialName, type) => {
    if (type === 'bait') {
      const bait = baitTypes.find(b => 
        b.name.toLowerCase() === materialName.toLowerCase()
      );
      return bait || { name: materialName };
    } else {
      const chemical = chemicals.find(c => 
        c.name.toLowerCase() === materialName.toLowerCase()
      );
      return chemical || { name: materialName };
    }
  };

  const loadMaterials = async () => {
    setLoadingMaterials(true);
    try {
      console.log("🔄 Loading bait types...");
      
      // Load bait types - getBaitTypes now returns array directly
      const baitArray = await apiService.getBaitTypes();
      
      console.log("📊 Bait Types received:", {
        isArray: Array.isArray(baitArray),
        length: baitArray?.length || 0,
        firstItem: baitArray?.[0]
      });
      
      // Format bait types consistently
      const formattedBaitTypes = (Array.isArray(baitArray) ? baitArray : []).map(item => {
        if (typeof item === 'string') {
          return { 
            name: item, 
            active_ingredient: null, 
            antidote: null 
          };
        }
        
        // Handle object format
        return {
          name: item.name || item.label || item.bait_name || String(item),
          active_ingredient: item.active_ingredient || item.activeIngredient || null,
          antidote: item.antidote || item.antidote_info || null
        };
      });
      
      console.log(`✅ Formatted ${formattedBaitTypes.length} bait types`);
      
      setBaitTypes(formattedBaitTypes);

      // Load chemicals
      console.log("🔄 Loading chemicals...");
      const chemArray = await apiService.getChemicals();
      
      console.log("📊 Chemicals received:", {
        isArray: Array.isArray(chemArray),
        length: chemArray?.length || 0
      });
      
      // Format chemicals consistently
      const formattedChemicals = (Array.isArray(chemArray) ? chemArray : []).map(item => {
        if (typeof item === 'string') {
          return { 
            name: item, 
            active_ingredient: null, 
            antidote: null 
          };
        }
        
        return {
          name: item.name || item.chemical_name || item.label || String(item),
          active_ingredient: item.active_ingredient || item.activeIngredient || null,
          antidote: item.antidote || item.antidote_info || null
        };
      });
      
      console.log(`✅ Formatted ${formattedChemicals.length} chemicals`);
      
      setChemicals(formattedChemicals);
      
    } catch (e) {
      console.error("❌ Failed to load materials:", e);
      setBaitTypes([]);
      setChemicals([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  // Sort each group
  Object.keys(stationsByType).forEach(type => {
    stationsByType[type].sort(sortByStationNumber);
  });

  // Helper to format concentration display
  const formatConcentration = (conc) => {
    if (!conc) return "—";
    const num = String(conc).replace('%', '').trim();
    return num ? `${num}%` : "—";
  };
  
  // Helper to format volume display
  const formatVolume = (vol) => {
    if (!vol) return "—";
    const num = String(vol).replace('ml', '').trim();
    return num ? `${num}ml` : "—";
  };

  const getServiceLineLabel = () => {
  if (!report) return "Service";

  console.log("🔍 getServiceLineLabel - serviceType:", report.serviceType);

  if (report.serviceType === "special") {
    const label = formatSpecialSubtypeLabel(
      report.serviceSubtype,
      report
    );
    return label
      ? `Special Service - ${label}`
      : "Special Service";
  }

  if (report.serviceType === "disinfection") {
    const details = getServiceDetailsLabel(report);
    console.log("🔍 Disinfection details found:", details);
    return details 
      ? `Disinfection - ${details}`
      : "Disinfection Service";
  }
  
  if (report.serviceType === "insecticide") {
    const details = getServiceDetailsLabel(report);
    console.log("🔍 Insecticide details found:", details);
    return details 
      ? `Insecticide - ${details}`
      : "Insecticide Service";
  }
  
  if (report.serviceType === "myocide") return "Myocide Service";

  return report.serviceType || "Service";
};

  const formatDurationForDisplay = (report) => {
  if (!report || report.duration === undefined || report.duration === null) {
    return '00:00:00';
  }
  
  // Get duration in seconds
  let seconds = typeof report.duration === 'number' 
    ? report.duration 
    : parseFloat(report.duration) || 0;
  
  // Ensure it's a positive number
  seconds = Math.max(0, Math.floor(seconds));
  
  // Format as HH:MM:SS
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

  // Helper to get insecticide details from all possible fields
  const getServiceDetailsLabel = (report) => {
    if (!report) return null;

    const routeParams = route?.params || {};
    const contextParams = context || {};
    
    console.log("🔍 Checking for service details - Service Type:", report.serviceType);

    // Handle different service types
    if (report.serviceType === 'disinfection') {
      console.log("🔍 Looking for DISINFECTION details...");
      
      // Check ALL possible sources for DISINFECTION details in order
      const disinfectionSources = [
        // From context/params
        routeParams.disinfectionDetails,
        routeParams.disinfection_details,
        contextParams.disinfectionDetails,
        contextParams.disinfection_details,
        
        // From report object
        report?.disinfection_details,
        report?.disinfectionDetails,
        
        // Specific disinfection fields
        report?.treatment_details,
        report?.treatmentDetails,
        
        // Appointment data for disinfection
        report?.appointment?.disinfection_details,
        report?.appointment?.disinfectionDetails,
        report?.appointment?.treatment_details,
        
        // Generic fields (only if they don't look like service notes)
        ...(report?.details && !report.details.includes('service') ? [report.details] : []),
        
        // DO NOT include service notes here - they're separate
      ];

      console.log("🔍 Disinfection sources:", disinfectionSources);

      for (let i = 0; i < disinfectionSources.length; i++) {
        if (disinfectionSources[i] && 
            String(disinfectionSources[i]).trim() !== '' && 
            String(disinfectionSources[i]).trim() !== 'null' &&
            String(disinfectionSources[i]).trim() !== 'undefined' &&
            // Filter out service notes looking content
            !String(disinfectionSources[i]).toLowerCase().includes('service note') &&
            !String(disinfectionSources[i]).toLowerCase().includes('notes:')) {
          console.log(`✅ Found DISINFECTION details in source ${i}:`, disinfectionSources[i]);
          return String(disinfectionSources[i]).trim();
        }
      }
      
      console.log("❌ No disinfection details found");
      return null;
      
    } else if (report.serviceType === 'insecticide') {
      console.log("🔍 Looking for INSECTICIDE details...");
      
      // Check ALL possible sources for INSECTICIDE details in order
      const insecticideSources = [
        // From context/params
        routeParams.insecticideDetails,
        routeParams.insecticide_details,
        contextParams.insecticideDetails,
        contextParams.insecticide_details,
        
        // From report object
        report?.insecticide_details,
        report?.insecticideDetails,
        
        // Specific insecticide fields
        report?.treatment_details,
        report?.treatmentDetails,
        report?.otherPestName,
        report?.other_pest_name,
        
        // Appointment data for insecticide
        report?.appointment?.insecticide_details,
        report?.appointment?.insecticideDetails,
        report?.appointment?.otherPestName,
        report?.appointment?.other_pest_name,
        report?.appointment?.treatment_details,
        
        // Generic fields (only if they don't look like service notes)
        ...(report?.details && !report.details.includes('service') ? [report.details] : []),
      ];

      console.log("🔍 Insecticide sources:", insecticideSources);

      for (let i = 0; i < insecticideSources.length; i++) {
        if (insecticideSources[i] && 
            String(insecticideSources[i]).trim() !== '' && 
            String(insecticideSources[i]).trim() !== 'null' &&
            String(insecticideSources[i]).trim() !== 'undefined' &&
            // Filter out service notes looking content
            !String(insecticideSources[i]).toLowerCase().includes('service note') &&
            !String(insecticideSources[i]).toLowerCase().includes('notes:')) {
          console.log(`✅ Found INSECTICIDE details in source ${i}:`, insecticideSources[i]);
          return String(insecticideSources[i]).trim();
        }
      }
      
      console.log("❌ No insecticide details found");
      return null;
      
    } else if (report.serviceType === 'special' && report.serviceSubtype === 'other') {
      console.log("🔍 Looking for SPECIAL SERVICE (other) details...");
      
      // For special service "other", look for pest name
      const otherPestSources = [
        report?.otherPestName,
        report?.other_pest_name,
        report?.appointment?.otherPestName,
        report?.appointment?.other_pest_name,
        report?.treatment_details,
        report?.details
      ];

      for (let i = 0; i < otherPestSources.length; i++) {
        if (otherPestSources[i] && 
            String(otherPestSources[i]).trim() !== '' && 
            String(otherPestSources[i]).trim() !== 'null' &&
            String(otherPestSources[i]).trim() !== 'undefined') {
          console.log(`✅ Found other pest name in source ${i}:`, otherPestSources[i]);
          return String(otherPestSources[i]).trim();
        }
      }
      
      return "Other";
    }
    
    return null;
  };

  const SPECIAL_SERVICE_LABELS = {
    grass_cutworm: "Grass Cutworm",
    fumigation: "Fumigation",
    termites: "Termites",
    exclusion: "Exclusion Service",
    snake_repulsion: "Snake Repulsion",
    bird_control: "Bird Control",
    bed_bugs: "Bed Bugs",
    fleas: "Fleas",
    plant_protection: "Plant Protection",
    palm_weevil: "Palm Weevil",
    other: "Other",
  };

  const renderValue = (value, options = {}) => {
    if (value === null || value === undefined || value === "") {
      // Return centered em dash for consistent display
      return "\u2014";
    }
    return String(value);
  };

  const formatSpecialSubtypeLabel = (subtype, report) => {
    if (!subtype) return "—";

    if (subtype === "other") {
      return (
        report.otherPestName ||
        report.other_pest_name ||
        report.appointment?.otherPestName ||
        "Other"
      );
    }

    return SPECIAL_SERVICE_LABELS[subtype] || subtype;
  };

  const renderServiceNotes = () => {
    if (!report || !report.notes) return null;
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="notes" size={20} color="#2c3e50" />
          <Text style={styles.sectionTitle}>Service Notes</Text>
        </View>
        <View style={styles.notesCard}>
          <Text style={styles.notesText}>{report.notes}</Text>
        </View>
      </View>
    );
  };

  const getServiceTypeLabel = () => {
    if (!report) return "Service Type";

    if (report.serviceType === "special") return "Special Service";
    if (report.serviceType === "disinfection") return "Disinfection Service";
    
    if (report.serviceType === "insecticide") {
      const details = getServiceDetailsLabel(report);
      return details 
        ? `Insecticide - ${details}`
        : "Insecticide Service";
    }
    
    if (report.serviceType === "myocide") return "Myocide Service";

    return report.serviceType || "N/A";
  };

  // Helper to render service details section
  const renderServiceDetails = () => {
  if (!report || report.serviceType === 'myocide') return null;
  
  // Debug what we have
  console.log("🔍 RENDERING - Full report object:", {
    serviceType: report.serviceType,
    // Check every possible field
    insecticide_details: report.insecticide_details,
    insecticideDetails: report.insecticideDetails,
    otherPestName: report.otherPestName,
    other_pest_name: report.other_pest_name,
    disinfection_details: report.disinfection_details,
    disinfectionDetails: report.disinfectionDetails,
    // Check appointment
    appointment: report.appointment,
    // Check if there's any unexpected field
    allKeys: Object.keys(report).filter(key => 
      key.includes('insect') || 
      key.includes('Insect') || 
      key.includes('disinf') ||
      key.includes('Disinf') ||
      key.includes('detail') ||
      key.includes('Detail') ||
      key.includes('pest') ||
      key.includes('Pest')
    )
  });
  
  const serviceDetails = getServiceDetailsLabel(report);
  
  return (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="info" size={20} color="#2c3e50" />
          <Text style={styles.sectionTitle}>Service Details</Text>
          {/* Debug indicator */}
          {!serviceDetails && report.serviceType === 'insecticide' && (
            <View style={styles.debugBadge}>
              <Text style={styles.debugBadgeText}>No Details Found</Text>
            </View>
          )}
        </View>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <MaterialIcons name="category" size={16} color="#666" />
            <Text style={styles.detailLabel}>Service Type:</Text>
            <Text style={styles.detailValue}>
              {getServiceTypeLabel()}
            </Text>
          </View>
          
          {/* Special service subtype */}
          {report.serviceType === 'special' && (
            <View style={styles.detailRow}>
              <MaterialIcons name="tune" size={16} color="#666" />
              <Text style={styles.detailLabel}>Subtype:</Text>
              <Text style={styles.detailValue}>
                {formatSpecialSubtypeLabel(report.serviceSubtype, report)}
              </Text>
            </View>
          )}

          {(report.serviceType === 'insecticide' ||
            report.serviceType === 'disinfection') && (
            <View style={styles.detailRow}>
              <MaterialIcons name="description" size={16} color="#666" />
              <Text style={styles.detailLabel}>Details:</Text>
              <Text style={styles.detailValue}>
                {serviceDetails || '—'}
              </Text>
              {/* Debug info */}
              <Text style={[styles.detailValue, { fontSize: 10, color: '#999' }]}>
                {!serviceDetails ? '(no details found)' : ''}
              </Text>
            </View>
          )}

        </View>
      </View>

        {/* Chemicals Used */}
        {report.chemicalsUsed && report.chemicalsUsed.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="science" size={20} color="#2c3e50" />
              <Text style={styles.sectionTitle}>Chemicals Used</Text>
              <Text style={styles.badge}>{report.chemicalsUsed.length}</Text>
            </View>
            <View style={styles.chemicalsGrid}>
              {report.chemicalsUsed.map((chemical, index) => {
                const chemicalName = typeof chemical === 'string' ? chemical : (chemical.name || chemical.chemicalName || `Chemical ${index + 1}`);
                const concentration =
                  chemical.concentration ||
                  chemical.concentration_percent ||
                  chemical.concentrationPercent ||
                  "";

                const volume =
                  chemical.volume ||
                  chemical.volume_ml ||
                  chemical.volumeMl ||
                  "";
                
                return (
                  <View key={index} style={styles.chemicalCard}>
                    <View style={styles.chemicalHeader}>
                      <MaterialIcons name="warning-amber" size={16} color="#1f9c8b" />
                      <Text style={styles.chemicalName}>{chemicalName}</Text>
                    </View>
                    {(concentration || volume) && (
                      <View style={styles.chemicalDetails}>
                        {concentration && (
                          <View style={styles.chemicalDetail}>
                            <MaterialIcons name="speed" size={14} color="#666" />
                            <Text style={styles.chemicalDetailText}>
                              {formatConcentration(concentration)}
                            </Text>
                          </View>
                        )}
                        {volume && (
                          <View style={styles.chemicalDetail}>
                            <MaterialIcons name="water-drop" size={14} color="#666" />
                            <Text style={styles.chemicalDetailText}>
                              {formatVolume(volume)}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Treated Areas */}
        {report.treatedAreas && report.treatedAreas.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="map" size={20} color="#2c3e50" />
              <Text style={styles.sectionTitle}>Treated Areas</Text>
              <Text style={styles.badge}>{report.treatedAreas.length}</Text>
            </View>
            <View style={styles.areasTable}>
              {/* Table Header - FIXED */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Area</Text>
                <Text style={[styles.tableHeaderCell, styles.centerCell]}>Conc.</Text>
                <Text style={[styles.tableHeaderCell, styles.centerCell]}>Volume</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Chemical</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Notes</Text>
              </View>
              
              {/* Table Rows - FIXED */}
              {report.treatedAreas.flatMap((area, areaIndex) => {
                const areaChemicals = area.chemicals || [];
                
                if (areaChemicals.length === 0 && (area.concentrationPercent || area.volumeMl)) {
                  return (
                    <View key={`area-${areaIndex}-0`} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>
                        {area.name || `Area ${areaIndex + 1}`}
                      </Text>
                      
                      <View style={[styles.tableCellContainer, styles.centerCell]}>
                        <Text style={styles.tableCellText}>
                          {formatConcentration(area.concentrationPercent)}
                        </Text>
                      </View>
                      
                      <View style={[styles.tableCellContainer, styles.centerCell]}>
                        <Text style={styles.tableCellText}>
                          {formatVolume(area.volumeMl)}
                        </Text>
                      </View>
                      
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>
                        {area.chemical || area.chemicalName || "—"}
                      </Text>
                      
                      <Text style={[styles.tableCell, { flex: 1.5, color: "#666" }]}>
                        {area.areaNotes || area.notes || "—"}
                      </Text>
                    </View>
                  );
                }
                
                return areaChemicals.map((chemical, chemIndex) => (
                  <View key={`area-${areaIndex}-${chemIndex}`} style={styles.tableRow}>
                    {/* Area Name - only show on first chemical row */}
                    {chemIndex === 0 ? (
                      <Text style={[styles.tableCell, { flex: 2 }]}>
                        {area.name || `Area ${areaIndex + 1}`}
                      </Text>
                    ) : (
                      <View style={{ flex: 2 }} />
                    )}
                    
                    {/* Concentration - centered */}
                    <View style={[styles.tableCellContainer, styles.centerCell]}>
                      <Text style={styles.tableCellText}>
                        {formatConcentration(chemical.concentration || chemical.concentrationPercent)}
                      </Text>
                    </View>
                    
                    {/* Volume - centered */}
                    <View style={[styles.tableCellContainer, styles.centerCell]}>
                      <Text style={styles.tableCellText}>
                        {formatVolume(chemical.volume || chemical.volumeMl)}
                      </Text>
                    </View>
                    
                    {/* Chemical Name */}
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                      {chemical.name || chemical.chemicalName || "—"}
                    </Text>
                    
                    {/* Notes - only show on first chemical row */}
                    {chemIndex === 0 ? (
                      <Text style={[styles.tableCell, { flex: 1.5, color: "#666" }]}>
                        {area.areaNotes || area.notes || "—"}
                      </Text>
                    ) : (
                      <View style={{ flex: 1.5 }} />
                    )}
                  </View>
                ));
              })}
            </View>
          </View>
        )}
      </>
    );
  };

  const getStationStatus = (type, s) => {
    if (!s) return "—";

    // BS
    if (type === "BS") {
      switch (s.consumption) {
        case "0%": return "Inactive";
        case "25%": return "Low Activity";
        case "50%": return "Active";
        case "75%": return "High Activity";
        case "100%": return "Very Active";
        default: return "—";
      }
    }

    // RM & ST
    if (type === "RM" || type === "ST") {
      return Number(s.rodents_captured) > 0 ? "Active" : "Inactive";
    }

    // LT
    if (type === "LT") {
      const d = Number(s.drosophila || 0);
      const l = Number(s.lepidoptera || 0);
      const f = Number(s.flies || 0);
      const m = Number(s.mosquitoes || 0);

      if (d > 80 || l > 7 || f > 7 || m > 7) return "High Activity";
      if (d > 50 || l > 5 || f > 5 || m > 5) return "Active";
      if (d > 15 || l > 2 || f > 2 || m > 2) return "Low Activity";
      return "Inactive";
    }

    return "—";
  };

  const resolveAppointmentDetails = (report) => {
    const a = report?.appointment;

    if (!a) return null;

    return (
      a.insecticide_details ||
      a.disinfection_details ||
      a.other_pest_name ||
      a.otherPestName ||
      null
    );
  };

  // Helper to render myocide report
  const renderMyocideReport = () => {
    if (!report || report.serviceType !== 'myocide') return null;
    
    return (
      <>
        {/* Station Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="summarize" size={20} color="#2c3e50" />
            <Text style={styles.sectionTitle}>Station Summary</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialIcons name="pest-control-rodent" size={20} color="#1f9c8b" />
              </View>
              <Text style={styles.statNumber}>{report.stationCounts?.BS || 0}</Text>
              <Text style={styles.statLabel}>Bait Stations</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialIcons name="pest-control" size={20} color="#1f9c8b" />
              </View>
              <Text style={styles.statNumber}>{report.stationCounts?.RM || 0}</Text>
              <Text style={styles.statLabel}>Multicatch</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialIcons name="gps-fixed" size={20} color="#1f9c8b"/>
              </View>
              <Text style={styles.statNumber}>{report.stationCounts?.ST || 0}</Text>
              <Text style={styles.statLabel}>Snap Traps</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialIcons name="lightbulb" size={20} color="#1f9c8b" />
              </View>
              <Text style={styles.statNumber}>{report.stationCounts?.LT || 0}</Text>
              <Text style={styles.statLabel}>Light Traps</Text>
            </View>
          </View>
          <View style={styles.totalStations}>
            <MaterialIcons name="dashboard" size={16} color="#1f9c8b" />
            <Text style={styles.totalStationsText}>
              Total Stations: {report.stations?.length || 0}
            </Text>
          </View>
        </View>

        {/* BAIT STATIONS */}
        {stationsByType.BS.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="pest-control-rodent" size={20} color="#2c3e50" />
              <Text style={styles.sectionTitle}>Bait Stations (BS)</Text>
              <Text style={styles.badge}>{stationsByType.BS.length}</Text>
            </View>
            <View style={styles.stationTable}>
              <View style={styles.tableHeader}>
                <Text
                  style={[styles.tableHeaderCell, styles.deviceHeader, { flex: 1.2 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Device
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Consumption
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 1.5 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Bait Type
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Dosage (g)
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 1.5 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Condition
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 0.8 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Access
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 1.2 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Status
                </Text>


              </View>
              {stationsByType.BS.map((s, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.deviceCell, { flex: 1.2 }]}>
                    BS{s.station_id || s.station_number}
                  </Text>
                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1 }]}>
                    <Text style={styles.tableCellText}>
                      {renderValue(s.consumption)}
                    </Text>
                  </View>

                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1 }]}>
                    <Text style={[styles.tableCell]}>
                      {renderValue(s.bait_type)}
                    </Text>
                  </View>

                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1 }]}>
                    <Text style={[styles.tableCell]}>
                      {renderValue(s.dosage_g ? `${s.dosage_g}g` : null)}
                    </Text>
                  </View>

                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1 }]}>
                    <Text style={[styles.tableCell]}>
                      {renderValue(s.condition)}
                    </Text>
                  </View>
                  
                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1 }]}>
                    <Text style={styles.tableCellText}>
                      {renderValue(s.access)}
                    </Text>
                  </View>

                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1.2 }]}>
                    <Text style={styles.tableCellText}>
                      {getStationStatus("BS", s)}
                    </Text>
                  </View>

                </View>
              ))}
            </View>
          </View>
        )}

        {/* MULTICATCH STATIONS */}
        {stationsByType.RM.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="pest-control" size={20} color="#2c3e50" />
              <Text style={styles.sectionTitle}>Multicatch (RM)</Text>
              <Text style={styles.badge}>{stationsByType.RM.length}</Text>
            </View>
            <View style={styles.stationTable}>
              <View style={styles.tableHeader}>
                <Text
                  style={[styles.tableHeaderCell, styles.deviceHeader, { flex: 1.2 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Device
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Capture
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Rodents
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Replaced
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 1.5 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Condition
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 0.8 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Access
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 1.2 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Status
                </Text>

              </View>
              {stationsByType.RM.map((s, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.deviceCell, { flex: 1.2 }]}>
                    RM{s.station_id || s.station_number}
                  </Text>
                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1 }]}>
                    <Text style={styles.tableCellText}>
                      {renderValue(s.capture)}
                    </Text>
                  </View>

                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1 }]}>
                    <Text style={styles.tableCellText}>
                      {renderValue(s.rodents_captured)}
                    </Text>
                  </View>

                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1 }]}>
                    <Text style={styles.tableCellText}>
                      {renderValue(s.replaced_surface)}
                    </Text>
                  </View>

                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1 }]}>
                    <Text style={styles.tableCellText}>
                      {renderValue(s.condition)}
                    </Text>
                  </View>

                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1 }]}>
                    <Text style={[styles.tableCell, styles.centerCell]}>
                      {renderValue(s.access)}
                    </Text>
                  </View>

                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1 }]}>
                    <Text style={[styles.tableCell, styles.centerCell]}>
                      {getStationStatus("RM", s)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* SNAP TRAP STATIONS */}
        {stationsByType.ST.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="gps-fixed" size={20} color="#2c3e50" />
              <Text style={styles.sectionTitle}>Snap Traps (ST)</Text>
              <Text style={styles.badge}>{stationsByType.ST.length}</Text>
            </View>
            <View style={styles.stationTable}>
              <View style={styles.tableHeader}>
                <Text
                  style={[styles.tableHeaderCell, styles.deviceHeader, { flex: 1.2 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Device
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Capture
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Rodents
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Triggered
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 1.5 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Condition
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 0.8 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Access
                </Text>

                <Text
                  style={[styles.tableHeaderCell, { flex: 1.2 }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  Status
                </Text>
              </View>
              {stationsByType.ST.map((s, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.deviceCell, { flex: 1.2 }]}>
                    ST{s.station_id || s.station_number}
                  </Text>
                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1 }]}>
                    <Text style={styles.tableCellText}>
                      {renderValue(s.capture)}
                    </Text>
                  </View>

                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1 }]}>
                    <Text style={styles.tableCellText}>
                      {renderValue(s.rodents_captured)}
                    </Text>
                  </View>

                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1 }]}>
                    <Text style={styles.tableCellText}>
                      {renderValue(s.triggered)}
                    </Text>
                  </View>

                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1}]}>
                    <Text style={styles.tableCellText}>
                      {renderValue(s.condition)}
                    </Text>
                  </View>

                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1 }]}>
                    <Text style={styles.tableCellText}>
                      {renderValue(s.access)}
                    </Text>
                  </View>

                  <View style={[styles.tableCellContainer, styles.centerCell, { flex: 1 }]}>
                    <Text style={styles.tableCellText}>
                      {getStationStatus("ST", s)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* LIGHT TRAP STATIONS */}
        {stationsByType.LT.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="lightbulb" size={20} color="#2c3e50" />
              <Text style={styles.sectionTitle}>Light Traps (LT)</Text>
              <Text style={styles.badge}>{stationsByType.LT.length}</Text>
            </View>
            <View style={styles.stationTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Device</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Mosq</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Lep</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Dro</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Flies</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Others</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Bulb</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Cond</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Access</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
              </View>
              {stationsByType.LT.map((s, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '600' }]}>
                    LT{s.station_id || s.station_number}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 0.8 }]}>{s.mosquitoes || "—"}</Text>
                  <Text style={[styles.tableCell, { flex: 0.8 }]}>{s.lepidoptera || "—"}</Text>
                  <Text style={[styles.tableCell, { flex: 0.8 }]}>{s.drosophila || "—"}</Text>
                  <Text style={[styles.tableCell, { flex: 0.8 }]}>{s.flies || "—"}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>
                    {Array.isArray(s.others) && s.others.length > 0 
                      ? s.others.join(", ") 
                      : "—"}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 0.8 }]}>{s.replace_bulb || "—"}</Text>
                  <Text style={[styles.tableCell, { flex: 0.8 }]}>{s.condition || "—"}</Text>
                  <Text style={[styles.tableCell, { flex: 0.8 }]}>{s.access || "—"}</Text>
                  <Text style={[styles.tableCell, { flex: 0.8 }]}>{getStationStatus("LT", s)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {(!report.stations || report.stations.length === 0) && (
          <View style={styles.emptyDataCard}>
            <MaterialIcons name="info" size={40} color="#ddd" />
            <Text style={styles.emptyDataText}>No station data found for this visit</Text>
          </View>
        )}
      </>
    );
  };

  // Helper to get report title
  const getReportTitle = () => {
    if (!report) {
      return context?.serviceTypeName || "Service Report";
    }
    
    if (report.serviceType === 'disinfection') {
      return "Disinfection Report";
    } else if (report.serviceType === 'insecticide') {
      return "Insecticide Report";
    } else if (report.serviceType === 'special') {
      return "Special Service Report";
    } else if (report.serviceType === 'myocide') {
      return "Myocide Report";
    } else {
      return "Service Report";
    }
  };

  // Get service icon
  const getServiceIcon = () => {
    if (!report) return "description";
    
    if (report.serviceType === 'disinfection') return "clean-hands";
    if (report.serviceType === 'insecticide') return "pest-control";
    if (report.serviceType === 'special') return "star";
    if (report.serviceType === 'myocide') return "pest-control-rodent";
    
    return "description";
  };

  // Render Health & Safety section
  const renderHealthSafetySection = () => {
    if (!report) return null;

    // 🔹 SOURCE OF TRUTH
    const materials =
      report.serviceType === 'myocide'
        ? report.baitsUsed || []
        : report.chemicalsUsed || [];

    if (materials.length === 0) return null;

    const materialsWithSafety = materials.map(m => ({
      ...getMaterialSafetyInfo(
        typeof m === 'string' ? m : m.name,
        report.serviceType === 'myocide' ? 'bait' : 'chemical'
      ),
      originalType: report.serviceType === 'myocide' ? 'bait' : 'chemical'
    }));

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="health-and-safety" size={20} color="#2c3e50" />
          <Text style={styles.sectionTitle}>Health & Safety</Text>
          <Text style={styles.badge}>{materialsWithSafety.length}</Text>
        </View>

        <View style={styles.healthSafetyCard}>
          <View style={styles.healthSafetyHeader}>
            <MaterialIcons name="warning" size={16} color="#1f9c8b" />
            <Text style={styles.healthSafetyTitle}>
              Materials Used – Safety Information
            </Text>
          </View>

          <Text style={styles.healthSafetySubtitle}>
            {report.serviceType === 'myocide'
              ? 'Bait types used in this service:'
              : 'Chemicals used in this service:'}
          </Text>

          {materialsWithSafety.map((material, index) => (
            <View key={`${material.name}-${index}`} style={styles.materialSafetyCard}>
              <View style={styles.materialHeader}>
                <View style={styles.materialTypeBadge}>
                  <MaterialIcons
                    name={material.originalType === 'bait' ? 'pest-control' : 'science'}
                    size={14}
                    color="#fff"
                  />
                  <Text style={styles.materialTypeText}>
                    {material.originalType === 'bait' ? 'BAIT' : 'CHEMICAL'}
                  </Text>
                </View>
                <Text style={styles.materialName}>{material.name}</Text>
              </View>

              <View style={styles.safetyDetails}>
                <View style={styles.safetyRow}>
                  <MaterialIcons name="science" size={14} color="#1f9c8b" />
                  <Text style={styles.safetyLabel}>Active Ingredient:</Text>
                  <Text style={styles.safetyValue}>
                    {material.active_ingredient || 'Not specified'}
                  </Text>
                </View>

                <View style={styles.safetyRow}>
                  <MaterialIcons name="medical-services" size={14} color="#1f9c8b" />
                  <Text style={styles.safetyLabel}>First Aid / Antidote:</Text>
                  <Text style={styles.safetyValue}>
                    {material.antidote || 'Not specified'}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {loadingMaterials && (
            <View style={styles.loadingSafetyInfo}>
              <ActivityIndicator size="small" color="#1f9c8b" />
              <Text style={styles.loadingSafetyText}>
                Loading safety information…
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };


  // Format date nicely
  const formatReportDate = (dateString) => {
    if (!dateString || dateString === 'N/A' || dateString === 'Not recorded') {
      return 'Not recorded';
    }
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("⚠️ Invalid date string:", dateString);
        return 'Invalid date';
      }
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
      });
    } catch (error) {
      console.error("❌ Error formatting date:", error);
      return dateString || 'Not recorded';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f9c8b" />
          <Text style={styles.loadingText}>Loading Report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onBack || (() => navigation.goBack())} // Use navigation.goBack() as fallback
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.brandContainer}>
            <Image source={pestfreeLogo} style={styles.logo} resizeMode="contain" />
            <View style={styles.adminBadge}>
              <MaterialIcons name="description" size={14} color="#fff" />
              <Text style={styles.adminBadgeText}>REPORT</Text>
            </View>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <MaterialIcons name="error-outline" size={60} color="#F44336" />
          </View>
          <Text style={styles.errorTitle}>Report Unavailable</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => {
              const visitIdFromSources = route?.params?.visitId || context?.visitId;
              if (visitIdFromSources) fetchReport(visitIdFromSources);
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="refresh" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={onBack || (() => navigation.goBack())}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
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
                <MaterialIcons name="description" size={14} color="#fff" />
                <Text style={styles.adminBadgeText}>REPORT</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onBack || (() => navigation.goBack())}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <View style={styles.reportIconContainer}>
              <MaterialIcons name={getServiceIcon()} size={28} color="#fff" />
            </View>
            <Text style={styles.welcomeText}>Service Report</Text>
            <Text style={styles.title}>{getReportTitle()}</Text>
            <Text style={styles.subtitle}>
              Detailed service completion report
            </Text>
          </View>
        </View>

        {/* OVERVIEW CARD */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View style={styles.overviewTitleContainer}>
              <MaterialIcons name="list-alt" size={20} color="#2c3e50" />
              <Text style={styles.overviewTitle}>Visit Overview</Text>
            </View>
            <View style={styles.overviewBadge}>
              <Text style={styles.overviewBadgeText}>
                {report?.serviceType === 'myocide' ? 'Myocide' : 
                report?.serviceType === 'insecticide' ? 'Insecticide' :
                report?.serviceType === 'disinfection' ? 'Disinfection' :
                report?.serviceType === 'special' ? 'Special' : 
                report?.serviceType || 'Service'}
              </Text>
            </View>
          </View>
          
          {report && (
            <View style={styles.overviewGrid}>
              {/* DATE - using Greece timezone */}
              <View style={styles.overviewItem}>
                <MaterialIcons name="calendar-today" size={18} color="#666" />
                <Text style={styles.overviewLabel}>Date</Text>
                <Text style={styles.overviewValue}>
                  {report.date && report.date !== 'N/A' 
                    ? formatDateInGreece(report.date) 
                    : 'Not recorded'}
                </Text>
              </View>
              
              {/* DURATION - Restored! */}
              <View style={styles.overviewItem}>
                <MaterialIcons name="access-time" size={18} color="#666" />
                <Text style={styles.overviewLabel}>Duration</Text>
                <Text style={styles.overviewValue}>
                  {formatDurationForDisplay(report)}
                </Text>
              </View>
              
              {/* CUSTOMER */}
              <View style={styles.overviewItem}>
                <MaterialIcons name="person" size={18} color="#666" />
                <Text style={styles.overviewLabel}>Customer</Text>
                <Text style={styles.overviewValue} numberOfLines={1}>
                  {report.customerName || 'Not recorded'}
                </Text>
              </View>
              
              {/* TECHNICIAN */}
              <View style={styles.overviewItem}>
                <MaterialIcons name="engineering" size={18} color="#666" />
                <Text style={styles.overviewLabel}>Technician</Text>
                <Text style={styles.overviewValue} numberOfLines={1}>
                  {report.technicianName || 'Not recorded'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.serviceTypeRow}>
            <MaterialIcons name="category" size={18} color="#1f9c8b" />
            <Text style={styles.serviceTypeLabel}>Service Type:</Text>
            <Text style={styles.serviceTypeValue}>
              {report ? getServiceLineLabel() : 'Loading...'}
            </Text>
          </View>
        </View>

        {/* HEALTH & SAFETY SECTION - Add this */}
        {renderHealthSafetySection()}

        {/* Render appropriate report based on service type */}
        {report.serviceType === 'myocide' 
          ? renderMyocideReport()
          : renderServiceDetails()}
      
        {renderServiceNotes()}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
              Technician's Report 
          </Text>
          <Text style={styles.footerSubtext}>
            ID: {report.visitId || 'N/A'}
          </Text>
          <Text style={styles.footerSubtext}>
            Version 1.0 • Last updated: {new Date().toLocaleDateString()}
          </Text>
          <Text style={styles.footerCopyright}>
            © {new Date().getFullYear()} Pest-Free. All rights reserved.
          </Text>
        </View>
      </ScrollView>
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
    alignItems: "center",
    marginTop: 10,
  },
  reportIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
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
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
    fontFamily: 'System',
    textAlign: "center",
  },
  // OVERVIEW CARD
  overviewCard: {
    backgroundColor: "#fff",
    marginHorizontal: 24,
    marginTop: -16,
    borderRadius: 16,
    padding: 24,
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
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  overviewTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginLeft: 8,
    fontFamily: 'System',
  },
  overviewBadge: {
    backgroundColor: "#e9f7f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  overviewBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f9c8b",
    fontFamily: 'System',
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  overviewItem: {
    width: "50%",
    marginBottom: 16,
  },
  overviewLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    marginBottom: 2,
    fontFamily: 'System',
  },
  overviewValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    fontFamily: 'System',
  },
  serviceTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  serviceTypeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginLeft: 8,
    marginRight: 6,
    fontFamily: 'System',
  },
  serviceTypeValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f9c8b",
    flex: 1,
    fontFamily: 'System',
  }, 
  // SECTIONS
  section: {
    marginHorizontal: 24,
    marginTop: 24,
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
  badge: {
    backgroundColor: "#e9f7f6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  // STATS GRID
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  statCard: {
    width: "25%",
    alignItems: "center",
    paddingVertical: 12,
  },
  statIcon: {
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
    textAlign: "center",
  },
  totalStations: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  totalStationsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f9c8b",
    marginLeft: 8,
    fontFamily: 'System',
  },
  
  // DETAILS CARD
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    marginRight: 6,
    fontFamily: 'System',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    flex: 1,
    fontFamily: 'System',
  },
  
  // CHEMICALS
  chemicalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  chemicalCard: {
    width: "50%",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  chemicalHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  chemicalName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2c3e50",
    marginLeft: 8,
    flex: 1,
    fontFamily: 'System',
  },
  chemicalDetails: {
    backgroundColor: "#fff",
    padding: 12,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#e9ecef",
  },
  chemicalDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  chemicalDetailText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
    fontFamily: 'System',
  },
  
  // TABLES
  stationTable: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    overflow: "hidden",
  },
  areasTable: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1f9c8b",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  tableHeaderCell: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    paddingHorizontal: 4,
    fontFamily: 'System',
    height: 32,
    lineHeight: 32,
  },
  tableRow: {
    flexDirection: "row",
    height: 32,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f9fa",
    alignItems: "center",
  },
  tableCell: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
    paddingHorizontal: 4,
    fontFamily: 'System',
    lineHeight: 32,
    includeFontPadding: false,
  },
 emptyTableCell: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 4,
    fontFamily: 'System',
    fontStyle: 'italic',
    minHeight: 20,
    textAlignVertical: 'center',
  },
  
  // NOTES
  notesCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f8f9fa",
  },
  notesText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    fontFamily: 'System',
  },
  
  // EMPTY STATES
  emptyDataCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: 16,
  },
  emptyDataText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 16,
    fontFamily: 'System',
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
    marginTop: 24,
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
    textAlign: 'center',
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
  
  // ERROR
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorIcon: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F44336",
    marginBottom: 12,
    fontFamily: 'System',
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    fontFamily: 'System',
    lineHeight: 22,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f9c8b",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: 'System',
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#6c757d",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: 'System',
  },
  deviceHeader: {
    textAlign: "left",
    paddingLeft: 6,
  },

  deviceCell: {
    textAlign: "left",
    paddingLeft: 6,
    fontWeight: "600",
  },
  leftCell: {
    textAlign: "left",
    paddingLeft: 6,
  },
  centerCell: {
    textAlign: "center",
    textAlignVertical: 'center',
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  healthSafetyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  healthSafetyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  healthSafetyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f9c8b",
    marginLeft: 8,
    fontFamily: 'System',
  },
  healthSafetySubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    fontFamily: 'System',
  },
  materialSafetyCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  materialHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  materialTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f9c8b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  materialTypeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 4,
    fontFamily: 'System',
  },
  materialName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    flex: 1,
    fontFamily: 'System',
  },
  safetyDetails: {
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  safetyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  safetyLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginLeft: 8,
    marginRight: 6,
    width: 100,
    fontFamily: 'System',
  },
  safetyValue: {
    fontSize: 12,
    color: "#333",
    flex: 1,
    fontFamily: 'System',
    lineHeight: 16,
  },
  noInfoText: {
    color: "#999",
    fontStyle: "italic",
  },
  missingSafetyInfo: {
    fontSize: 11,
    color: "#F44336",
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "center",
    fontFamily: 'System',
  },
  loadingSafetyInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loadingSafetyText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    fontFamily: 'System',
  },
  tableCellContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    height: 32,
  },
  tableCellText: {
    fontSize: 12,
    color: "#333",
    fontFamily: 'System',
    textAlign: 'center',
  },
  debugBadge: {
  backgroundColor: '#ff9800',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  marginLeft: 8
},
debugBadgeText: {
  color: '#fff',
  fontSize: 10,
  fontWeight: '600'
},
});