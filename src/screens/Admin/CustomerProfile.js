//Admin/CustomerProfile.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Dimensions
} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import Dropdown from "../../components/Dropdown";
import apiService from "../../services/apiService";
import ReportScreen from "../Technician/ReportScreen";
import SwipeableVisitRow from '../../components/SwipeableVisitRow';
import pestfreeLogo from "../../../assets/pestfree_logo.png";
import i18n from "../../services/i18n";

const { width } = Dimensions.get('window');

export default function CustomerProfile({ customer, onClose, onOpenReport }) {
  const customerId = customer.customerId;
  const [customerRevenue, setCustomerRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileCustomer, setProfileCustomer] = useState(null);
  const [maps, setMaps] = useState([]);
  const [stations, setStations] = useState([]);
  const [visits, setVisits] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [showServiceHistory, setShowServiceHistory] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);

  // 🔽 CHART FILTERS
  const [selectedDevice, setSelectedDevice] = useState("BS");
  const [selectedPeriod, setSelectedPeriod] = useState("3m");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // 🔽 CHART DATA
  const [chartData, setChartData] = useState([]); 
  const [trendData, setTrendData] = useState([]);
  const [stationHistory, setStationHistory] = useState([]);
  const [latestService, setLatestService] = useState(null);
  
  // Filter states
  const [availableYears, setAvailableYears] = useState([]);
  
  // Comparison data
  const [currentPeriodData, setCurrentPeriodData] = useState([]);
  const [previousPeriodData, setPreviousPeriodData] = useState([]);
  const [topStations, setTopStations] = useState([]);
  const [monthlyActivity, setMonthlyActivity] = useState([]);
  
  // Available device types
  const deviceTypes = [
    { 
      value: "BS", 
      label: i18n.t("admin.customerProfile.stations.baitStation"), 
      icon: "room" 
    },
    { 
      value: "RM", 
      label: i18n.t("admin.customerProfile.stations.rodentMonitor"), 
      icon: "pets" 
    },
    { 
      value: "ST", 
      label: i18n.t("admin.customerProfile.stations.stickyTrap"), 
      icon: "bolt" 
    },
    { 
      value: "LT", 
      label: i18n.t("admin.customerProfile.stations.lightTrap"), 
      icon: "lightbulb" 
    },
    { 
      value: "PT", 
      label: i18n.t("admin.customerProfile.stations.pheromoneTrap"), 
      icon: "bug-report" 
    }
  ];

  // Time periods
  const timePeriods = [
    { value: "1m", label: i18n.t("admin.customerProfile.charts.periods.oneMonth") },
    { value: "3m", label: i18n.t("admin.customerProfile.charts.periods.threeMonths") },
    { value: "6m", label: i18n.t("admin.customerProfile.charts.periods.sixMonths") },
    { value: "12m", label: i18n.t("admin.customerProfile.charts.periods.twelveMonths") }
  ];

  useEffect(() => {
    if (!customerId) return;
    loadCustomer();
  }, [customerId]);

  useEffect(() => {
    if (trendData.length > 0 && latestService) {
      analyzeData();
    }
  }, [trendData, latestService, selectedDevice, selectedPeriod, selectedYear]);

  function normalizeNumber(value) {
    if (value === null || value === undefined) return 0;

    if (typeof value === "string") {
      const cleaned = value.replace("%", "").trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }

    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  function filterByPeriod(stations, period, year) {
    const now = new Date();
    let monthsBack = 1;

    if (period === "3M") monthsBack = 3;
    if (period === "6M") monthsBack = 6;
    if (period === "12M") monthsBack = 12;

    const cutoff = new Date();
    cutoff.setMonth(now.getMonth() - monthsBack);

    return stations.filter(s => {
      const date = new Date(s.date);
      return date >= cutoff && date.getFullYear() === year;
    });
  }

  function getDeviceData(stations, deviceType) {
    if (deviceType === "BS") {
      return stations.map(s => ({
        stationId: `S${station.station_id}`,
        value: normalizeNumber(s.consumption)
      }));
    }

    if (deviceType === "ST" || deviceType === "RM") {
      return stations.map(s => ({
        label: `S${s.station_id}`,
        value: normalizeNumber(s.rodents_captured)
      }));
    }

    if (deviceType === "LT") {
      const categories = {};
      stations.forEach(s => {
        const insect = s.insect_type;
        if (!insect || insect.toLowerCase() === "other") return;
        categories[insect] = (categories[insect] || 0) + 1;
      });

      return Object.entries(categories).map(([k, v]) => ({
        label: k,
        value: v
      }));
    }

    if (deviceType === "PT") {
      const categories = {};
      stations.forEach(s => {
        if (!s.insect_type) return;
        categories[s.insect_type] = (categories[s.insect_type] || 0) + 1;
      });

      return Object.entries(categories).map(([k, v]) => ({
        label: k,
        value: v
      }));
    }

    return [];
  }

  function getMonthlyTrend(stations) {
    const monthly = {};

    stations.forEach(s => {
      const d = new Date(s.visit_date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;

      monthly[key] = (monthly[key] || 0) + 1;
    });

    return Object.entries(monthly).map(([month, count]) => ({
      month,
      count
    }));
  }

  function getTopStations(stations) {
    const map = {};

    stations.forEach(s => {
      const id = s.station_id;
      map[id] = (map[id] || 0) + normalizeNumber(s.consumption);
    });

    return Object.entries(map)
      .map(([id, value]) => ({ id, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const result = await apiService.getCustomerById(customerId);

      if (!result || result.success === false || !result.data) {
        throw new Error("Failed to load customer");
      }

      const freshCustomer = result.data;
      setProfileCustomer(freshCustomer);

      const customerMaps = Array.isArray(freshCustomer.maps)
        ? freshCustomer.maps
        : [];
      setMaps(customerMaps);

      const allStations = customerMaps.flatMap(map =>
        Array.isArray(map.stations) ? map.stations : []
      );
      setStations(allStations);

      // Load visits and trends
      await loadVisitsAndTrends(freshCustomer.customerId);
      
      // Load station history
      await loadStationHistory(freshCustomer.customerId);

      try {
        const revenue = await apiService.getRevenueByCustomer(customerId);
        setCustomerRevenue(revenue);
      } catch (err) {
        console.error("❌ Failed to load customer revenue:", err);
      }

    } catch (e) {
      console.error("❌ CustomerProfile load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadVisitsAndTrends = async (custId) => {
  try {
    // Load customer appointments
    const appointmentsRes = await apiService.request(
      "GET", 
      `/appointments/customer/${custId}`
    );
    
    let customerVisits = [];
    
    if (appointmentsRes?.success && Array.isArray(appointmentsRes.visits)) {
      
      for (const appointment of appointmentsRes.visits) {
        try {
          const visitId = appointment.visitId || appointment.id;
          
          if (visitId) {
            
            const reportRes = await apiService.request(
              "GET",
              `/reports/visit/${visitId}`
            );
            
            if (reportRes?.success && reportRes.report) {
              customerVisits.push({
                visitId: reportRes.report.visitId || visitId,
                appointmentId: appointment.id || visitId,
                serviceType: reportRes.report.serviceType || appointment.service_type || 'myocide',
                startTime: reportRes.report.start_time || reportRes.report.service_start_time || appointment.appointment_date,
                appointmentDate: reportRes.report.date || appointment.appointment_date,
                technicianName: reportRes.report.technician_name || reportRes.report.technicianName || "N/A",
                status: appointment.status || 'completed',
                duration: reportRes.report.duration,
                source: 'report',
                stations: reportRes.report.stations || [],
                chemicalsUsed: reportRes.report.chemicalsUsed || []
              });
            }
          }
        } catch (visitErr) {
          console.warn(`⚠️ Error processing appointment ${appointment.id}:`, visitErr.message);
        }
      }
    }
    
    // Sort visits by date
    customerVisits.sort((a, b) => {
      const dateA = new Date(a.appointmentDate || a.startTime || 0);
      const dateB = new Date(b.appointmentDate || b.startTime || 0);
      return dateB - dateA;
    });
    
    
    // Set latest service (most recent)
    if (customerVisits.length > 0) {
      setLatestService(customerVisits[0]);
    }
    
    setVisits(customerVisits);

    // Load trend data - CRITICAL FIX
    try {
      const trendRes = await apiService.request(
        "GET",
        `/reports/customer-trends/${custId}`
      );

      // Check different possible response structures
      let trendDataArray = [];
      
      if (trendRes?.success && Array.isArray(trendRes.data)) {
        trendDataArray = trendRes.data;
      } else if (Array.isArray(trendRes)) {
        trendDataArray = trendRes;
      } else if (trendRes?.data && typeof trendRes.data === 'object') {
        // If it's an object, try to convert to array
        trendDataArray = Object.values(trendRes.data);
      }

      if (trendDataArray.length > 0) {
        setTrendData(trendDataArray);
        
        // Extract available years from trend data
        const years = [...new Set(trendDataArray.map(d => {
          if (!d.date) return null;
          return new Date(d.date).getFullYear();
        }).filter(y => y !== null))].sort((a, b) => b - a);
        
        if (years.length > 0) {
          setAvailableYears(years);
          setSelectedYear(years[0]);
        } else {
          const currentYear = new Date().getFullYear();
          setAvailableYears([currentYear]);
          setSelectedYear(currentYear);
        }
      } else {
        
        // Try to extract trend data from visits as fallback
        if (customerVisits.length > 0) {
          const extractedTrends = [];
          
          customerVisits.forEach(visit => {
            if (visit.stations && Array.isArray(visit.stations)) {
              visit.stations.forEach(station => {
                extractedTrends.push({
                  date: visit.appointmentDate || visit.startTime,
                  station_id: station.station_id || station.station_number,
                  station_type: station.station_type,
                  consumption: station.consumption,
                  rodents_captured: station.rodents_captured,
                  mosquitoes: station.mosquitoes,
                  lepidoptera: station.lepidoptera,
                  drosophila: station.drosophila,
                  flies: station.flies,
                  insects_captured: station.insects_captured
                });
              });
            }
          });
          
          if (extractedTrends.length > 0) {
            setTrendData(extractedTrends);
            
            const years = [...new Set(extractedTrends.map(d => {
              if (!d.date) return null;
              return new Date(d.date).getFullYear();
            }).filter(y => y !== null))].sort((a, b) => b - a);
            
            setAvailableYears(years.length > 0 ? years : [new Date().getFullYear()]);
          } else {
            setAvailableYears([new Date().getFullYear()]);
          }
        } else {
          setAvailableYears([new Date().getFullYear()]);
        }
      }
    } catch (err) {
      console.warn("⚠️ Trend data load failed:", err.message);
      
      // Try to extract from visits as fallback
      if (customerVisits.length > 0) {
        const extractedTrends = [];
        customerVisits.forEach(visit => {
          if (visit.stations && Array.isArray(visit.stations)) {
            visit.stations.forEach(station => {
              extractedTrends.push({
                date: visit.appointmentDate || visit.startTime,
                station_id: station.station_id || station.station_number,
                station_type: station.station_type,
                consumption: station.consumption,
                rodents_captured: station.rodents_captured,
                mosquitoes: station.mosquitoes,
                lepidoptera: station.lepidoptera,
                drosophila: station.drosophila,
                flies: station.flies,
                insects_captured: station.insects_captured
              });
            });
          }
        });
        
        if (extractedTrends.length > 0) {
          setTrendData(extractedTrends);
          const years = [...new Set(extractedTrends.map(d => new Date(d.date).getFullYear()))].sort((a, b) => b - a);
          setAvailableYears(years.length > 0 ? years : [new Date().getFullYear()]);
        } else {
          setAvailableYears([new Date().getFullYear()]);
        }
      } else {
        setAvailableYears([new Date().getFullYear()]);
      }
    }

  } catch (err) {
    console.error("❌ Failed to load customer visits:", err.message);
    setAvailableYears([new Date().getFullYear()]);
  }
};

  const loadStationHistory = async (custId) => {
    try {
      // This would be a new API endpoint to get station history
      // For now, we'll extract from visits
      const history = [];
      
      visits.forEach(visit => {
        if (visit.stations && Array.isArray(visit.stations)) {
          visit.stations.forEach(station => {
            history.push({
              date: visit.startTime,
              stationId: station.station_id,
              stationType: station.station_type,
              consumption: station.consumption,
              rodentsCaptured: station.rodents_captured,
              mosquitoes: station.mosquitoes,
              lepidoptera: station.lepidoptera,
              drosophila: station.drosophila,
              flies: station.flies,
              insectsCaptured: station.insects_captured
            });
          });
        }
      });
      
      setStationHistory(history);
    } catch (err) {
      console.error("❌ Failed to load station history:", err);
    }
  };

  const analyzeData = () => {

    if (!trendData || trendData.length === 0) {
      setChartData([]);
      setCurrentPeriodData([]);
      setPreviousPeriodData([]);
      setTopStations([]);
      setMonthlyActivity([]);
      return;
    }

    // Filter data by selected year and period
    const filteredData = getFilteredData();
    
    // Get current and previous period data for comparison
    const { current, previous } = getComparisonPeriods(filteredData);
    setCurrentPeriodData(current);
    setPreviousPeriodData(previous);
    
    // Calculate top stations
    calculateTopStations();
    
    // Calculate monthly activity
    calculateMonthlyActivity();
  };

  const getFilteredData = () => {
    const now = new Date();

    let monthsBack = 3; // default
    if (selectedPeriod === "1m") monthsBack = 1;
    if (selectedPeriod === "3m") monthsBack = 3;
    if (selectedPeriod === "6m") monthsBack = 6;
    if (selectedPeriod === "12m") monthsBack = 12;

    const cutoff = new Date();
    cutoff.setMonth(now.getMonth() - monthsBack);

    return trendData.filter(d => {
      if (!d.date) return false;
      const dDate = new Date(d.date);
      return dDate >= cutoff;
    });
  };

  const getComparisonPeriods = (data) => {
    const now = new Date();
    let currentStart = new Date();
    let previousStart = new Date();
    let previousEnd = new Date();

    switch(selectedPeriod) {
      case "1m":
        currentStart.setMonth(now.getMonth() - 1);
        previousStart.setMonth(now.getMonth() - 2);
        previousEnd.setMonth(now.getMonth() - 1);
        break;
      case "3m":
        currentStart.setMonth(now.getMonth() - 3);
        previousStart.setMonth(now.getMonth() - 6);
        previousEnd.setMonth(now.getMonth() - 3);
        break;
      case "6m":
        currentStart.setMonth(now.getMonth() - 6);
        previousStart.setMonth(now.getMonth() - 12);
        previousEnd.setMonth(now.getMonth() - 6);
        break;
      case "12m":
        currentStart.setFullYear(now.getFullYear() - 1);
        previousStart.setFullYear(now.getFullYear() - 2);
        previousEnd.setFullYear(now.getFullYear() - 1);
        break;
    }

    const current = data.filter(d => {
      if (!d.date) return false;
      const dDate = new Date(d.date);
      return dDate >= currentStart && dDate <= now;
    });

    const previous = data.filter(d => {
      if (!d.date) return false;
      const dDate = new Date(d.date);
      return dDate >= previousStart && dDate < previousEnd;
    }); 
    return { current, previous };
  };

  const calculateTopStations = () => {
    const stationMap = new Map();
    
    trendData.forEach(entry => {
      if (entry.station_type === "BS") {
        const key = entry.station_id;
        if (!stationMap.has(key)) {
          stationMap.set(key, { 
            stationId: key,
            count100: 0,
            total: 0,
            avgConsumption: 0
          });
        }
        
        const station = stationMap.get(key);
        if (normalizeNumber(entry.consumption) === 100){
          station.count100++;
        }
        station.total++;
        const val = normalizeNumber(entry.consumption);
          station.avgConsumption =
          (station.avgConsumption * (station.total - 1) + val) / station.total;
        }
    });

    const sorted = Array.from(stationMap.values())
      .sort((a, b) => b.count100 - a.count100)
      .slice(0, 10);
    
    setTopStations(sorted);
  };

  const calculateMonthlyActivity = () => {
    if (!trendData || trendData.length === 0) {
      setMonthlyActivity([]);
      return;
    }

    // Initialize array for all 12 months
    const monthlyMap = new Array(12).fill(0).map(() => ({ total: 0, count: 0 }));

    trendData.forEach(entry => {
      if (!entry.date) {
        console.warn("⚠️ Entry missing date:", entry);
        return;
      }
      
      // Try to parse the date properly
      let date;
      
      // If it's a string like "2026-01-15T..."
      if (typeof entry.date === 'string') {
        // Remove any timezone issues by taking just the date part
        const datePart = entry.date.split('T')[0]; // "2026-01-15"
        date = new Date(datePart + 'T12:00:00'); // Add noon to avoid timezone issues
      } else {
        date = new Date(entry.date);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("⚠️ Invalid date:", entry.date);
        return;
      }
      
      const month = date.getMonth(); // 0 = Ιαν, 1 = Φεβ, 2 = Μαρ
      
      let value = 0;

      if (selectedDevice === "BS") {
        value = normalizeNumber(entry.consumption);
      } else if (selectedDevice === "RM" || selectedDevice === "ST") {
        value = normalizeNumber(entry.rodents_captured);
      } else if (selectedDevice === "LT") {
        value = (normalizeNumber(entry.mosquitoes) || 0) + 
                (normalizeNumber(entry.lepidoptera) || 0) + 
                (normalizeNumber(entry.drosophila) || 0) + 
                (normalizeNumber(entry.flies) || 0);
      } else if (selectedDevice === "PT") {
        value = normalizeNumber(entry.insects_captured);
      } else if (selectedDevice === "LT") {
        value =
          normalizeNumber(station.mosquitoes) +
          normalizeNumber(station.lepidoptera) +
          normalizeNumber(station.drosophila) +
          normalizeNumber(station.flies);
      }

      if (value > 0) {
        monthlyMap[month].total += value;
        monthlyMap[month].count++;
      }
    });

    const monthlyAvg = monthlyMap.map((month, index) => ({
      month: index,
      avg: month.count > 0 ? Number((month.total / month.count).toFixed(1)) : 0
    }));
    setMonthlyActivity(monthlyAvg);
  };

  const getStationValue = (station) => {
    switch(selectedDevice) {
      case "BS":
        return normalizeNumber(station.consumption);
      case "RM":
      case "ST":
        return normalizeNumber(station.rodents_captured);
      case "LT":
        return {
          mosquitoes: normalizeNumber(station.mosquitoes),
          lepidoptera: normalizeNumber(station.lepidoptera),
          drosophila: normalizeNumber(station.drosophila),
          flies: normalizeNumber(station.flies)
        };
      case "PT":
        return normalizeNumber(station.insects_captured)
      default:
        return 0;
    }
  };

  const getCurrentDeviceData = useMemo(() => {
  if (!trendData || trendData.length === 0) return [];

  const filtered = getFilteredData().filter(s => {
    const type = String(
      s.station_type ||
      s.stationType ||
      s.type ||
      ""
    ).toUpperCase().trim();

    return type === selectedDevice;
  });
  // Group by station ID and average the values
  const stationMap = new Map();
  
  filtered.forEach(station => {
    const stationId = station.station_id;
    if (!stationId) return;
    
    if (!stationMap.has(stationId)) {
      stationMap.set(stationId, {
        total: 0,
        count: 0,
        stationId
      });
    }
    
    const record = stationMap.get(stationId);
    let value = 0;
    
    if (selectedDevice === "BS") {
      value = normalizeNumber(station.consumption);
    } else if (selectedDevice === "RM" || selectedDevice === "ST") {
      value = normalizeNumber(station.rodents_captured);
    } else if (selectedDevice === "PT") {
      value = normalizeNumber(station.insects_captured);
    }
    
    record.total += value;
    record.count++;
  });
  
  const result = Array.from(stationMap.values()).map(item => ({
    label: `S${item.stationId}`,
    value: item.count > 0 ? item.total / item.count : 0
  }));
  return result;
}, [trendData, selectedDevice, selectedPeriod, selectedYear]); // Added all dependencies

  const calculateAverage = (data) => {
    if (!data || data.length === 0) return 0;
    
    let total = 0;
    let count = 0;
    
    data.forEach(entry => {
      let value = 0;
      
      if (selectedDevice === "BS") {
        value = normalizeNumber(entry.consumption);
      } else if (selectedDevice === "RM" || selectedDevice === "ST") {
        value = normalizeNumber(entry.rodents_captured);
      } else if (selectedDevice === "LT") {
        value = (normalizeNumber(entry.mosquitoes) || 0) + 
                (normalizeNumber(entry.lepidoptera) || 0) + 
                (normalizeNumber(entry.drosophila) || 0) + 
                (normalizeNumber(entry.flies) || 0);
      } else if (selectedDevice === "PT") {
        value = normalizeNumber(entry.insects_captured);
      }
      
      // Only count if value is valid and > 0
      if (!isNaN(value) && value > 0) {
        total += value;
        count++;
      }
    });
    
    return count > 0 ? total / count : 0;
  };

  const getLtInsectData = () => {
    if (!latestService || !latestService.stations) return null;
    
    const ltStations = latestService.stations.filter(s => s.station_type === "LT");
    if (ltStations.length === 0) return null;
    
    // Aggregate insect counts across all LT stations
    const totals = ltStations.reduce((acc, station) => {
      acc.mosquitoes += Number(station.mosquitoes || 0);
      acc.lepidoptera += Number(station.lepidoptera || 0);
      acc.drosophila += Number(station.drosophila || 0);
      acc.flies += Number(station.flies || 0);
      return acc;
    }, { mosquitoes: 0, lepidoptera: 0, drosophila: 0, flies: 0 });
    
    return {
      labels: ["Mosquitoes", "Lepidoptera", "Drosophila", "Flies"],
      data: [totals.mosquitoes, totals.lepidoptera, totals.drosophila, totals.flies],
      colors: ["#1f9c8b", "#3498db", "#e74c3c", "#f39c12"]
    };
  };

  const handleVisitPress = (visit) => {
    
    setReportData({
      visitId: visit.visitId,
      serviceType: visit.serviceType || "myocide",
      customerName: profileCustomer?.customerName,
      technicianName: visit.technicianName || "N/A",
      appointmentId: visit.appointmentId
    });
    
    setShowReport(true);
  };

  // Simple bar chart renderer for device data (BS, RM, ST, PT)
  const renderSimpleBarChart = (data, title, valueSuffix = '') => {
    if (!data || data.length === 0) {
      return (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{title}</Text>
          <Text style={styles.noDataText}>No data available for this period</Text>
        </View>
      );
    }
    
    const maxValue = Math.max(...data.map(item => 
      typeof item.value === 'number' ? item.value : 0
    ), 1);
    
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.chartVisualization}>
          {/* Y-axis labels */}
          <View style={styles.yAxisContainer}>
            {[3, 2, 1, 0].map((multiplier) => {
              const value = Math.round((maxValue / 3) * multiplier);
              return (
                <Text key={multiplier} style={styles.yAxisLabel}>
                  {value}{valueSuffix}
                </Text>
              );
            })}
          </View>
          
          {/* Chart Bars */}
          <View style={styles.chartBarsContainer}>
            {data.map((item, index) => {
              const safeValue = isNaN(item.value) ? 0 : item.value;
              const height = maxValue > 0 ? (safeValue / maxValue) * 100 : 0;
              
              return (
                <View key={index} style={styles.chartColumn}>
                  {/* Bar */}
                  <View 
                    style={[
                      styles.revenueBar,
                      { 
                        height: `${height}%`,
                        backgroundColor: "#1f9c8b"
                      }
                    ]}
                  >
                    {/* Bar value label - only show if bar is tall enough */}
                    {height > 20 && (
                      <Text style={styles.barValue}>
                        {item.value}{valueSuffix}
                      </Text>
                    )}
                  </View>
                  
                  {/* X-axis label */}
                  <Text style={styles.xAxisLabel}>
                    {item.label || item.stationId || `S${index + 1}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  // LT insect breakdown chart
  const renderLTChart = (insectData) => {
    if (!insectData) {
      return (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {i18n.t("admin.customerProfile.charts.lightTraps.insectBreakdown")}
          </Text>
          <Text style={styles.noDataText}>No light trap data available</Text>
        </View>
      );
    }
    
    const maxValue = Math.max(...insectData.data, 1);
    
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>
          {i18n.t("admin.customerProfile.charts.lightTraps.insectBreakdown")}
        </Text>
        
        {/* Legend and bars */}
        {insectData.labels.map((label, index) => (
          <View key={index} style={styles.distributionItem}>
            <View style={styles.distributionLeft}>
              <View style={[styles.distributionIcon, { backgroundColor: `${insectData.colors[index]}20` }]}>
                <View style={[styles.statusDot, { backgroundColor: insectData.colors[index] }]} />
              </View>
              <Text style={styles.distributionType}>{label}</Text>
            </View>
            
            <View style={styles.distributionMiddle}>
              <View style={styles.distributionBar}>
                <View 
                  style={[
                    styles.distributionBarFill,
                    { 
                      width: `${(insectData.data[index] / maxValue) * 100}%`,
                      backgroundColor: insectData.colors[index]
                    }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.distributionRight}>
              <Text style={styles.distributionCount}>{insectData.data[index]}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Comparison chart
  const renderComparisonChart = () => {
    const currentAvg = calculateAverage(currentPeriodData);
    const previousAvg = calculateAverage(previousPeriodData);
    
    // If both are zero, don't show the chart
    if (currentAvg === 0 && previousAvg === 0) {
      return null;
    }
    
    const maxValue = Math.max(currentAvg, previousAvg, 1);
    
    const chartData = [
      { label: "Previous", value: previousAvg, color: "#95a5a6" },
      { label: "Current", value: currentAvg, color: "#1f9c8b" }
    ];
    
    // Calculate percentage change safely
    let percentChange = 0;
    let changeColor = '#1f9c8b';
    
    if (previousAvg > 0) {
      percentChange = ((currentAvg - previousAvg) / previousAvg * 100);
      changeColor = currentAvg > previousAvg ? '#1f9c8b' : '#e74c3c';
    } else if (currentAvg > 0) {
      percentChange = 100; // 100% increase from zero
      changeColor = '#1f9c8b';
    }
    
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>
          {i18n.t("admin.customerProfile.charts.periodComparison")}
        </Text>
        
        <View style={styles.chartVisualization}>
          {/* Y-axis labels */}
          <View style={styles.yAxisContainer}>
            {[3, 2, 1, 0].map((multiplier) => {
              const value = Math.round((maxValue / 3) * multiplier);
              return (
                <Text key={multiplier} style={styles.yAxisLabel}>
                  {value.toFixed(1)}
                </Text>
              );
            })}
          </View>
          
          {/* Chart Bars */}
          <View style={styles.chartBarsContainer}>
            {chartData.map((item, index) => {
              const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
              
              return (
                <View key={index} style={styles.chartColumn}>
                  {/* Bar */}
                  <View 
                    style={[
                      styles.revenueBar,
                      { 
                        height: `${Math.max(height, 2)}%`, // Always show at least a tiny bar
                        backgroundColor: item.color
                      }
                    ]}
                  >
                    {height > 20 && (
                      <Text style={styles.barValue}>
                        {item.value.toFixed(1)}
                      </Text>
                    )}
                  </View>
                  
                  {/* X-axis label */}
                  <Text style={styles.xAxisLabel}>{item.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
        
        {/* Stats Summary */}
        <View style={styles.comparisonStats}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>
              {i18n.t("admin.customerProfile.charts.change")}
            </Text>
            <Text style={[
              styles.statBoxValue,
              { color: changeColor }
            ]}>
              {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>Current Avg</Text>
            <Text style={styles.statBoxValue}>
              {currentAvg.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Monthly activity chart
  const renderMonthlyActivityChart = () => {
    if (monthlyActivity.length === 0) return null;
    
    // Filter out months with zero activity
    const activeMonths = monthlyActivity.filter(m => m.avg > 0);
    
    if (activeMonths.length === 0) {
      return (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {i18n.t("admin.customerProfile.charts.monthlyActivity")}
          </Text>
          <Text style={styles.noDataText}>No activity data for this period</Text>
        </View>
      );
    }
    
    const maxValue = Math.max(...activeMonths.map(m => m.avg), 1);
    const monthNames = [
      i18n.t("months.jan"), i18n.t("months.feb"), i18n.t("months.mar"),
      i18n.t("months.apr"), i18n.t("months.may"), i18n.t("months.jun"),
      i18n.t("months.jul"), i18n.t("months.aug"), i18n.t("months.sep"),
      i18n.t("months.oct"), i18n.t("months.nov"), i18n.t("months.dec")
    ];
    
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>
          {i18n.t("admin.customerProfile.charts.monthlyActivity")}
        </Text>
        
        <View style={styles.chartVisualization}>
          {/* Y-axis labels */}
          <View style={styles.yAxisContainer}>
            {[3, 2, 1, 0].map((multiplier) => {
              const value = Math.round((maxValue / 3) * multiplier);
              return (
                <Text key={multiplier} style={styles.yAxisLabel}>
                  {value}
                </Text>
              );
            })}
          </View>
          
          {/* Chart Bars - only show active months */}
          <View style={styles.chartBarsContainer}>
            {activeMonths.map((month, index) => {
              const height = maxValue > 0 ? (month.avg / maxValue) * 100 : 0;
              
              return (
                <View key={index} style={styles.chartColumn}>
                  {/* Bar */}
                  <View 
                    style={[
                      styles.revenueBar,
                      { 
                        height: `${height}%`,
                        backgroundColor: "#1f9c8b"
                      }
                    ]}
                  >
                    {height > 20 && (
                      <Text style={styles.barValue}>
                        {month.avg.toFixed(0)}
                      </Text>
                    )}
                  </View>
                  
                  {/* X-axis label */}
                  <Text style={styles.xAxisLabel}>
                    {monthNames[month.month].substring(0, 3)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
        
        {/* Peak Months */}
        <View style={styles.peakMonthsContainer}>
          <Text style={styles.peakMonthsTitle}>
            {i18n.t("admin.customerProfile.charts.peakMonths")}
          </Text>
          <View style={styles.peakMonthsGrid}>
            {activeMonths
              .sort((a, b) => b.avg - a.avg)
              .slice(0, 3)
              .map((month, index) => (
                <View key={index} style={styles.peakMonthCard}>
                  <Text style={styles.peakMonthName}>
                    {monthNames[month.month]}
                  </Text>
                  <Text style={styles.peakMonthValue}>
                    {month.avg.toFixed(1)}
                  </Text>
                </View>
              ))}
          </View>
        </View>
      </View>
    );
  };

  // Main render function for device charts
  const renderDeviceChart = () => {
    if (selectedDevice === "LT") {
      const insectData = getLtInsectData();
      return renderLTChart(insectData);
    }
    
    const data = getCurrentDeviceData;
    
    let title = "";
    let suffix = "";
    
    switch(selectedDevice) {
      case "BS":
        title = i18n.t("admin.customerProfile.charts.baitStations.consumption");
        suffix = "%";
        break;
      case "RM":
        title = i18n.t("admin.customerProfile.charts.rodentMonitors.rodents");
        break;
      case "ST":
        title = i18n.t("admin.customerProfile.charts.snapTraps.rodents");
        break;
      case "PT":
        title = i18n.t("admin.customerProfile.charts.pheromoneTraps.insectsPerTrap");
        break;
    }
    
    return renderSimpleBarChart(data, title, suffix);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f9c8b" />
          <Text style={styles.loadingText}>{i18n.t("admin.customerProfile.loading")}</Text>
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
        
        {showReport && reportData ? (
          <View style={styles.reportContainer}>
            <ReportScreen
              visitId={reportData.visitId}
              serviceType={reportData.serviceType}
              customerName={reportData.customerName}
              technicianName={reportData.technicianName}
              context={{
                visitId: reportData.visitId,
                serviceType: reportData.serviceType,
                customerName: reportData.customerName,
                technicianName: reportData.technicianName,
                appointmentId: reportData.appointmentId
              }}
              onBack={() => {
                setShowReport(false);
                setReportData(null);
              }}
              isNestedModal={true}
            />
          </View>
        ) : (
          <>
            {/* HEADER */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                
                <View style={styles.brandContainer}>
                  <Image source={pestfreeLogo} style={styles.logo} resizeMode="contain" />
                  <View style={styles.adminBadge}>
                    <MaterialIcons name="person" size={14} color="#fff" />
                    <Text style={styles.adminBadgeText}>{i18n.t("admin.customerProfile.header.badge")}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.headerContent}>
                <Text style={styles.welcomeText}>{i18n.t("admin.customerProfile.header.welcome")}</Text>
                <Text style={styles.title}>{profileCustomer?.customerName || "Customer"}</Text>
                <Text style={styles.subtitle}>
                  {i18n.t("admin.customerProfile.header.subtitle")}
                </Text>
              </View>
            </View>

            {/* STATS BAR */}
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <MaterialIcons name="map" size={18} color="#1f9c8b" />
                </View>
                <Text style={styles.statNumber}>{maps.length}</Text>
                <Text style={styles.statLabel}>
                  {maps.length === 1 
                    ? i18n.t("admin.customerProfile.stats.maps_one")
                    : i18n.t("admin.customerProfile.stats.maps_other")}
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <MaterialIcons name="location-pin" size={18} color="#1f9c8b" />
                </View>
                <Text style={styles.statNumber}>{stations.length}</Text>
                <Text style={styles.statLabel}>
                  {stations.length === 1
                    ? i18n.t("admin.customerProfile.stats.stations_one")
                    : i18n.t("admin.customerProfile.stats.stations_other")}
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <MaterialIcons name="history" size={18} color="#1f9c8b" />
                </View>
                <Text style={styles.statNumber}>{visits.length}</Text>
                <Text style={styles.statLabel}>
                  {visits.length === 1
                    ? i18n.t("admin.customerProfile.stats.services_one")
                    : i18n.t("admin.customerProfile.stats.services_other")}
                </Text>
              </View>
            </View>

            {/* CUSTOMER REVENUE */}
            {customerRevenue && (
              <>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <MaterialIcons name="euro" size={20} color="#2c3e50" />
                    <Text style={styles.sectionTitle}>{i18n.t("admin.customerProfile.revenue.title")}</Text>
                  </View>
                </View>

                <View style={styles.card}>
                  <View style={styles.revenueGrid}>
                    
                    <View style={styles.revenueCard}>
                      <MaterialIcons name="euro" size={24} color="#1f9c8b" />
                      <Text style={styles.revenueValue}>
                        €{parseFloat(customerRevenue.total_revenue || 0).toFixed(2)}
                      </Text>
                      <Text style={styles.revenueLabel}>{i18n.t("admin.customerProfile.revenue.totalRevenue")}</Text>
                    </View>

                    <View style={styles.revenueCard}>
                      <MaterialIcons name="check-circle" size={24} color="#1f9c8b" />
                      <Text style={styles.revenueValue}>
                        {customerRevenue.appointment_count || 0}
                      </Text>
                      <Text style={styles.revenueLabel}>{i18n.t("admin.customerProfile.revenue.completedServices")}</Text>
                    </View>

                  </View>
                </View>
              </>
            )}

            {/* BASIC INFO */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons name="info" size={20} color="#2c3e50" />
                <Text style={styles.sectionTitle}>{i18n.t("admin.customerProfile.customerInfo.title")}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.customerHeader}>
                <View style={styles.customerAvatar}>
                  <FontAwesome5 name="building" size={22} color="#fff" />
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{profileCustomer.customerName}</Text>
                  <View style={styles.customerMeta}>
                    <View style={styles.customerMetaItem}>
                      <MaterialIcons name="fingerprint" size={12} color="#666" />
                      <Text style={styles.customerMetaText}>
                        {i18n.t("admin.customerProfile.customerInfo.id", { id: profileCustomer.customerId })}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {profileCustomer.address && (
                <View style={styles.infoRow}>
                  <MaterialIcons name="location-on" size={16} color="#1f9c8b" />
                  <Text style={styles.infoText}>{profileCustomer.address}</Text>
                </View>
              )}
              
              {profileCustomer.email && (
                <View style={styles.infoRow}>
                  <MaterialIcons name="email" size={16} color="#1f9c8b" />
                  <Text style={styles.infoText}>{profileCustomer.email}</Text>
                </View>
              )}

              {profileCustomer.telephone && (
                <View style={styles.infoRow}>
                  <MaterialIcons name="phone" size={16} color="#1f9c8b" />
                  <Text style={styles.infoText}>{profileCustomer.telephone}</Text>
                </View>
              )}
            </View>

            {/* MAPS */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons name="map" size={20} color="#2c3e50" />
                <Text style={styles.sectionTitle}>
                  {maps.length === 1
                    ? i18n.t("admin.customerProfile.maps.title_one", { count: maps.length })
                    : i18n.t("admin.customerProfile.maps.title_other", { count: maps.length })}
                </Text>
              </View>
            </View>

            {maps.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <MaterialIcons name="map" size={40} color="#ddd" />
                </View>
                <Text style={styles.emptyStateText}>{i18n.t("admin.customerProfile.maps.noMaps")}</Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {maps.map(map => (
                  <View key={map.mapId} style={styles.card}>
                    <View style={styles.customerHeader}>
                      <View style={styles.customerAvatar}>
                        <MaterialIcons name="map" size={22} color="#fff" />
                      </View>
                      <View style={styles.customerInfo}>
                        <Text style={styles.customerName}>{map.name}</Text>
                        <View style={styles.customerMeta}>
                          <View style={styles.customerMetaItem}>
                            <MaterialIcons name="location-pin" size={12} color="#666" />
                            <Text style={styles.customerMetaText}>
                              {i18n.t("admin.customerProfile.maps.stations", { count: Array.isArray(map.stations) ? map.stations.length : 0 })}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* STATIONS */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons name="location-pin" size={20} color="#2c3e50" />
                <Text style={styles.sectionTitle}>
                  {stations.length === 1
                    ? i18n.t("admin.customerProfile.stations.title_one", { count: stations.length })
                    : i18n.t("admin.customerProfile.stations.title_other", { count: stations.length })}
                </Text>
              </View>
            </View>

            {stations.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <MaterialIcons name="location-off" size={40} color="#ddd" />
                </View>
                <Text style={styles.emptyStateText}>{i18n.t("admin.customerProfile.stations.noStations")}</Text>
              </View>
            ) : (
              <View style={styles.card}>
                <View style={styles.stationsGrid}>
                  {["BS", "RM", "ST", "LT", "PT"].map(type => {
                    const count = stations.filter(s => s.type === type).length;
                    return (
                      <View key={type} style={styles.stationCard}>
                        <Text style={styles.stationType}>{type}</Text>
                        <Text style={styles.stationCount}>{count}</Text>
                        <Text style={styles.stationLabel}>
                          {type === 'BS' ? i18n.t("admin.customerProfile.stations.baitStation") : 
                           type === 'RM' ? i18n.t("admin.customerProfile.stations.rodentMonitor") : 
                           type === 'ST' ? i18n.t("admin.customerProfile.stations.stickyTrap") : 
                           type === 'PT' ? i18n.t("admin.customerProfile.stations.pheromoneTrap") : 
                           i18n.t("admin.customerProfile.stations.lightTrap")}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ADVANCED CHARTS HEADER (ALWAYS VISIBLE) */}
            <View style={styles.sectionHeader}>
              <TouchableOpacity 
                style={styles.serviceHistoryHeader}
                onPress={() => setShowAnalysis(!showAnalysis)}
                activeOpacity={0.7}
              >
                <View style={styles.sectionTitleContainer}>
                  <MaterialIcons name="analytics" size={20} color="#2c3e50" />
                  <Text style={styles.sectionTitle}>
                    {i18n.t("admin.customerProfile.charts.title")}
                  </Text>
                </View>

                <View style={styles.dropdownIconContainer}>
                  <MaterialIcons 
                    name={showAnalysis ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={24} 
                    color="#333" 
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* ADVANCED CHARTS CONTENT */}
            {showAnalysis && (
              <View style={styles.chartsSection}>
              <View style={styles.sectionHeader}>
                <TouchableOpacity 
                  style={styles.serviceHistoryHeader}
                  onPress={() => setShowAnalysis(!showAnalysis)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sectionTitleContainer}>
                    <MaterialIcons name="analytics" size={20} color="#2c3e50" />
                    <Text style={styles.sectionTitle}>
                      {i18n.t("admin.customerProfile.charts.title")}
                    </Text>
                  </View>

                  <View style={styles.dropdownIconContainer}>
                    <MaterialIcons 
                      name={showAnalysis ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                      size={24} 
                      color="#333" 
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {/* FILTERS */}
              <View style={styles.filtersContainer}>

                {/* Device Type */}
                <View style={[styles.dropdownWrapper, { zIndex: 3 }]}>
                  <Dropdown
                    label={i18n.t("admin.customerProfile.charts.filters.deviceType")}
                    options={deviceTypes.map(device => ({
                      label: `${device.label} (${device.value})`,
                      value: device.value,
                    }))}
                    selected={selectedDevice}
                    onSelect={(value) => {
                      setSelectedDevice(value);
                    }}
                  />
                </View>

                {/* Period */}
                <View style={[styles.dropdownWrapper, { zIndex: 2 }]}>
                  <Dropdown
                    label={i18n.t("admin.customerProfile.charts.filters.period")}
                    options={timePeriods.map(period => ({
                      label: period.label,
                      value: period.value,
                    }))}
                    selected={selectedPeriod}
                    onSelect={(value) => {
                      setSelectedPeriod(value);
                    }}
                  />
                </View>

                {/* Year */}
                <View style={[styles.dropdownWrapper, { zIndex: 1 }]}>
                  <Dropdown
                    label={i18n.t("admin.customerProfile.charts.filters.year")}
                    options={
                      availableYears.length > 0
                        ? availableYears.map(year => ({
                            label: year.toString(),
                            value: year,
                          }))
                        : [
                            {
                              label: new Date().getFullYear().toString(),
                              value: new Date().getFullYear(),
                            },
                          ]
                    }
                    selected={selectedYear}
                    onSelect={(value) => {
                      setSelectedYear(value);
                    }}
                  />
                </View>
              </View>

              {/* Latest Service Chart */}
              {latestService && latestService.stations && (
                <>
                  <Text style={styles.chartSubTitle}>
                    {i18n.t("admin.customerProfile.charts.latestService")}
                  </Text>
                  {renderDeviceChart()}
                </>
              )}

              {/* Comparison Chart */}
              {renderComparisonChart()}

              {/* Monthly Activity Trend */}
              {renderMonthlyActivityChart()}

              {/* Top 10 Most Active Bait Stations */}
              {topStations.length > 0 && (
                <>
                  <Text style={styles.chartSubTitle}>
                    {i18n.t("admin.customerProfile.charts.topStations.title")}
                  </Text>
                  <View style={styles.topStationsContainer}>
                    {topStations.map((station, index) => (
                      <View key={station.stationId} style={styles.topStationRow}>
                        <View style={styles.topStationRank}>
                          <View style={[
                            styles.rankBadge,
                            index === 0 && styles.rankBadgeGold,
                            index === 1 && styles.rankBadgeSilver,
                            index === 2 && styles.rankBadgeBronze
                          ]}>
                            <Text style={styles.rankText}>#{index + 1}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.topStationInfo}>
                          <Text style={styles.topStationId}>
                            {i18n.t("admin.customerProfile.charts.topStations.station", { id: station.stationId })}
                          </Text>
                          <View style={styles.topStationStats}>
                            <View style={styles.topStationStat}>
                              <Text style={styles.topStationStatLabel}>
                                {i18n.t("admin.customerProfile.charts.topStations.fullConsumption")}
                              </Text>
                              <Text style={styles.topStationStatValue}>
                                {station.count100} {i18n.t("admin.customerProfile.charts.topStations.times")}
                              </Text>
                            </View>
                            <View style={styles.topStationStat}>
                              <Text style={styles.topStationStatLabel}>
                                {i18n.t("admin.customerProfile.charts.topStations.avgConsumption")}
                              </Text>
                              <Text style={styles.topStationStatValue}>
                                {station.avgConsumption.toFixed(1)}%
                              </Text>
                            </View>
                          </View>
                        </View>
                        
                        <View style={styles.topStationProgress}>
                          <View style={styles.progressBarBg}>
                            <View 
                              style={[
                                styles.progressBarFill,
                                { width: `${station.avgConsumption}%` }
                              ]} 
                            />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
              
            </View>
            )}

            {/* SERVICE HISTORY - DROPDOWN MENU */}
            <View style={styles.sectionHeader}>
              <TouchableOpacity 
                style={styles.serviceHistoryHeader}
                onPress={() => setShowServiceHistory(!showServiceHistory)}
                activeOpacity={0.7}
              >
                <View style={styles.sectionTitleContainer}>
                  <MaterialIcons name="history" size={20} color="#2c3e50" />
                  <Text style={styles.sectionTitle}>
                    {visits.length === 1
                      ? i18n.t("admin.customerProfile.serviceHistory.title_one", { count: visits.length })
                      : i18n.t("admin.customerProfile.serviceHistory.title_other", { count: visits.length })}
                  </Text>
                </View>
                <View style={styles.dropdownIconContainer}>
                  <MaterialIcons 
                    name={showServiceHistory ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={24} 
                    color="#333" 
                  />
                </View>
              </TouchableOpacity>
              <Text style={styles.countBadge}>
                {visits.length === 1
                  ? i18n.t("admin.customerProfile.serviceHistory.service_one", { count: visits.length })
                  : i18n.t("admin.customerProfile.serviceHistory.service_other", { count: visits.length })}
              </Text>
            </View>

            {showServiceHistory && (
              <View style={styles.dropdownContent}>
                {visits.length === 0 ? (
                  <View style={[styles.emptyState, { marginHorizontal: 24 }]}>
                    <View style={styles.emptyIconContainer}>
                      <MaterialIcons name="assignment" size={40} color="#ddd" />
                    </View>
                    <Text style={styles.emptyStateText}>{i18n.t("admin.customerProfile.serviceHistory.noServices")}</Text>
                  </View>
                ) : (
                  <View style={styles.dropdownListContainer}>
                    <ScrollView 
                      style={styles.dropdownScrollView}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                      {visits.map(visit => (
                        <SwipeableVisitRow
                          key={visit.visitId}
                          visit={visit}
                          appointmentId={visit.appointmentId}
                          customerName={profileCustomer?.customerName}
                          onPress={() => handleVisitPress(visit)}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* FOOTER */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>{i18n.t("admin.customerProfile.footer.system")}</Text>
              <Text style={styles.footerSubtext}>
                {i18n.t("admin.customerProfile.footer.version", { date: new Date().toLocaleDateString() })}
              </Text>
              <Text style={styles.footerCopyright}>
                {i18n.t("admin.customerProfile.footer.copyright", { year: new Date().getFullYear() })}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  
  // SCROLL VIEW
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  
  // REPORT CONTAINER
  reportContainer: {
    flex: 1,
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
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 10,
  },
  logo: {
    width: 120,
    height: 50,
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
  
  // SECTION HEADER
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
  countBadge: {
    backgroundColor: "#e9f7f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "600",
    color: "#1f9c8b",
    fontFamily: 'System',
  },
  
  // SERVICE HISTORY DROPDOWN
  serviceHistoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dropdownIconContainer: {
    marginLeft: 8,
  },
  dropdownContent: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  dropdownListContainer: {
    maxHeight: 400,
  },
  dropdownScrollView: {
    maxHeight: 400,
  },
  
  // CUSTOMER INFO
  customerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1f9c8b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
    fontFamily: 'System',
  },
  customerMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  customerMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  customerMetaText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    fontFamily: 'System',
  },
  
  // CARDS
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
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
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  
  // INFO ROWS
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f8f9fa",
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 12,
    fontFamily: 'System',
  },
  
  // STATIONS
  stationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  stationCard: {
    width: "48%",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  stationType: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f9c8b",
    marginBottom: 4,
    fontFamily: 'System',
  },
  stationCount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4,
    fontFamily: 'System',
  },
  stationLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    fontFamily: 'System',
  },
  
  // EMPTY STATE
  emptyState: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    fontFamily: 'System',
  },
  
  // FOOTER
  footer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 8,
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
  revenueGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  revenueCard: {
    width: "48%",
    backgroundColor: "#f0f9f8",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  revenueValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f9c8b",
    marginTop: 8,
  },
  revenueLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },

  // CHARTS SECTION
  chartsSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  chartsSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  chartSubTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 12,
  },
  filtersContainer: {
    marginBottom: 20,
    zIndex: 10,
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  chartVisualization: {
    flexDirection: 'row',
    height: 200,
    marginBottom: 10,
  },
  yAxisContainer: {
    width: 40,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#999',
    textAlign: 'right',
  },
  chartBarsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingBottom: 20,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  revenueBar: {
    width: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barValue: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  xAxisLabel: {
    position: 'absolute',
    bottom: -20,
    fontSize: 10,
    color: '#666',
  },
  comparisonStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statBox: {
    alignItems: 'center',
  },
  statBoxLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  statBoxValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
  },
  peakMonthsContainer: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  peakMonthsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  peakMonthsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  peakMonthCard: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    minWidth: 80,
  },
  peakMonthName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  peakMonthValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f9c8b',
  },

  // TOP STATIONS
  topStationsContainer: {
    marginTop: 8,
  },
  topStationRow: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  topStationRank: {
    marginBottom: 8,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#95a5a6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeGold: {
    backgroundColor: '#f1c40f',
  },
  rankBadgeSilver: {
    backgroundColor: '#bdc3c7',
  },
  rankBadgeBronze: {
    backgroundColor: '#e67e22',
  },
  rankText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  topStationInfo: {
    marginBottom: 8,
  },
  topStationId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  topStationStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topStationStat: {
    flex: 1,
  },
  topStationStatLabel: {
    fontSize: 11,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  topStationStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  topStationProgress: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarBg: {
    height: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1f9c8b',
    borderRadius: 4,
  },

  // Distribution styles (for LT chart)
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  distributionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    marginRight: 8,
  },
  distributionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  distributionType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    flex: 1,
  },
  distributionMiddle: {
    flex: 3,
    paddingHorizontal: 8,
  },
  distributionBar: {
    height: 8,
    backgroundColor: '#e8e8e8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  distributionRight: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 40,
  },
  distributionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
  dropdownWrapper: {
    marginBottom: 12,
  },
});