//Admin/Statistics.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Dimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import apiService from "../../services/apiService";
import pestfreeLogo from "../../../assets/pestfree_logo.png";
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function Statistics({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visits, setVisits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [todayRequests, setTodayRequests] = useState(0);
  
  // REVENUE STATES
  const [revenueStats, setRevenueStats] = useState(null);
  const [revenueByService, setRevenueByService] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [yearRevenue, setYearRevenue] = useState(0);
  const [technicianRevenue, setTechnicianRevenue] = useState([]);
  const [todayTotalRequests, setTodayTotalRequests] = useState(0);
  
  // ENHANCED KPI STATES
  const [kpiData, setKpiData] = useState({
    revenueGrowth: 0,
    customerGrowth: 0,
    efficiencyScore: 0,
    retentionRate: 0,
    avgTicketSize: 0,
    visitFrequency: 0
  });
  const [newCustomersThisMonth, setNewCustomersThisMonth] = useState(0);
  const [bestTechnician, setBestTechnician] = useState("N/A");
  const [topService, setTopService] = useState("N/A");
  
  // CHART INTERACTIVITY STATES
  const [timePeriod, setTimePeriod] = useState('6months'); // '3months', '6months', '1year', 'all'
  const [showTimeFilter, setShowTimeFilter] = useState(false);
  const [showRevenueDetails, setShowRevenueDetails] = useState(false);
  const [selectedBarIndex, setSelectedBarIndex] = useState(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  useEffect(() => {
    const checkAndResetDaily = async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastResetKey = 'lastRequestResetDate';
      
      try {
        const lastReset = await AsyncStorage.getItem(lastResetKey);
        
        if (lastReset !== today) {
          // It's a new day, reset the counter
          await AsyncStorage.setItem(lastResetKey, today);
          await saveTodayRequestsToStorage(0);
          console.log('🔄 Reset Today\'s Requests counter for new day');
        }
      } catch (error) {
        console.error('Error resetting daily counter:', error);
      }
    };
    
    checkAndResetDaily();
    
    // Check every hour to catch midnight
    const interval = setInterval(checkAndResetDaily, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const loadStatistics = async () => {
    setLoading(true);

    try {
      const today = new Date().toISOString().split("T")[0];
      console.log(`📅 Today's date: ${today}`);

      // ====== TODAY'S REQUESTS - FIXED APPROACH ======
      console.log("🔍 Loading today's TOTAL requests for Statistics...");
      
      // TRY MULTIPLE APPROACHES TO GET TODAY'S TOTAL COUNT
      
      // APPROACH 1: Try to get total count from existing endpoint first
      let todayTotalCount = 0;
      
      try {
        // First, try the regular endpoint which might return all requests
        const allRequestsResult = await apiService.getCustomerRequests();
        
        console.log("🔍 getCustomerRequests() response:", {
          success: allRequestsResult?.success,
          hasRequests: !!allRequestsResult?.requests,
          isArray: Array.isArray(allRequestsResult?.requests),
          length: allRequestsResult?.requests?.length || 0,
          rawKeys: Object.keys(allRequestsResult || {})
        });
        
        // Handle different response formats
        let requestsArray = [];
        
        if (Array.isArray(allRequestsResult)) {
          // Response is directly an array
          requestsArray = allRequestsResult;
          console.log("✅ Response is direct array");
        } else if (allRequestsResult?.requests && Array.isArray(allRequestsResult.requests)) {
          // Response has .requests property
          requestsArray = allRequestsResult.requests;
          console.log("✅ Response has .requests array");
        } else if (allRequestsResult?.success && Array.isArray(allRequestsResult.data)) {
          // Response has .data array
          requestsArray = allRequestsResult.data;
          console.log("✅ Response has .data array");
        } else if (allRequestsResult?.success && allRequestsResult.data?.requests && Array.isArray(allRequestsResult.data.requests)) {
          // Nested .data.requests
          requestsArray = allRequestsResult.data.requests;
          console.log("✅ Response has .data.requests array");
        }
        
        if (requestsArray.length > 0) {
          // Filter for requests created today (regardless of status)
          todayTotalCount = requestsArray.filter(request => {
            if (!request.created_at) {
              console.log("⚠️ Request missing created_at:", request.id);
              return false;
            }
            
            try {
              // Try different date formats
              let requestDate;
              const dateStr = request.created_at.toString();
              
              if (dateStr.includes('T')) {
                // ISO format: "2024-01-15T10:30:00Z"
                requestDate = new Date(dateStr).toISOString().split('T')[0];
              } else if (dateStr.includes(' ')) {
                // SQL timestamp: "2024-01-15 10:30:00"
                requestDate = dateStr.split(' ')[0];
              } else {
                // Just date: "2024-01-15"
                requestDate = dateStr;
              }
              
              const isToday = requestDate === today;
              
              if (isToday) {
                console.log(`✅ Found today's request: ${request.id}, created_at: ${request.created_at}, date: ${requestDate}`);
              }
              
              return isToday;
            } catch (error) {
              console.error("❌ Error parsing date:", error, "for request:", request.id, "created_at:", request.created_at);
              return false;
            }
          }).length;
          
          console.log(`📊 Approach 1: Found ${todayTotalCount} TOTAL requests created today`);
          
          // Debug: Show all requests with dates
          console.log("🔍 All requests with dates:");
          requestsArray.slice(0, 5).forEach((request, index) => {
            console.log(`  ${index + 1}. ID: ${request.id}, Status: ${request.status}, Created: ${request.created_at}`);
          });
          
        } else {
          console.warn("⚠️ No requests array found in response");
        }
        
      } catch (allRequestsError) {
        console.error("❌ Approach 1 failed:", allRequestsError);
      }
      
      // APPROACH 2: If Approach 1 failed or returned 0, try the today-count endpoint
      if (todayTotalCount === 0) {
        try {
          console.log("🔄 Trying today-count endpoint as fallback...");
          const todayCountResult = await apiService.getTodayCustomerRequestsCount();
          
          if (todayCountResult?.success) {
            todayTotalCount = todayCountResult.count || 0;
            console.log(`📊 Approach 2 (pending-only): Today's count = ${todayTotalCount}`);
          }
        } catch (todayCountError) {
          console.error("❌ Approach 2 failed:", todayCountError);
        }
      }
      
      // APPROACH 3: Try the total-today-count endpoint if it exists
      if (todayTotalCount === 0) {
        try {
          console.log("🔄 Trying total-today-count endpoint...");
          // Check if this method exists in apiService
          if (apiService.getTodayTotalCustomerRequestsCount) {
            const totalTodayResult = await apiService.getTodayTotalCustomerRequestsCount();
            if (totalTodayResult?.success) {
              todayTotalCount = totalTodayResult.count || 0;
              console.log(`📊 Approach 3 (total): Today's count = ${todayTotalCount}`);
            }
          } else if (apiService.getTotalRequestsCreatedToday) {
            const totalTodayResult = await apiService.getTotalRequestsCreatedToday();
            if (totalTodayResult?.success) {
              todayTotalCount = totalTodayResult.count || 0;
              console.log(`📊 Approach 3 (total): Today's count = ${todayTotalCount}`);
            }
          }
        } catch (totalTodayError) {
          console.error("❌ Approach 3 failed:", totalTodayError);
        }
      }
      
      // Load stored count for comparison
      const storedCount = await loadTodayRequestsFromStorage();
      console.log(`📊 Statistics: Stored count: ${storedCount}`);
      
      // SPECIAL CASE: If we're getting 0 but stored count > 0, increment based on manual check
      if (todayTotalCount === 0 && storedCount > 0) {
        console.log(`⚠️ API returned 0 but stored count is ${storedCount}. Keeping stored value.`);
        todayTotalCount = storedCount;
      }
      
      // Use the maximum of: Today's total count OR stored count
      const finalCount = Math.max(todayTotalCount, storedCount);
      
      console.log(`📊 Statistics: Final TODAY'S REQUESTS count: ${finalCount} (today total: ${todayTotalCount}, stored: ${storedCount})`);
      
      // Save the count to storage for backup
      await saveTodayRequestsToStorage(finalCount);
      
      // Set the state
      setTodayRequests(finalCount);

      // ====== LOAD ALL OTHER STATISTICS ======
      console.log("📦 Loading other statistics...");
      
      const [
        customersRes,
        techniciansRes,
        appointmentsRes,
        revenueStatsRes,
        revenueByServiceRes,
        monthlyRevenueRes,
        topCustomersRes,
        yearRevenueRes,
        technicianRevenueRes,
        enhancedKPIRes,
        topPerformanceRes
      ] = await Promise.all([
        apiService.getCustomers(),
        apiService.getTechnicians(),
        apiService.getAppointments(),
        apiService.request("GET", "/statistics/revenue/stats"),
        apiService.request("GET", "/statistics/revenue/by-service"),
        apiService.request("GET", "/statistics/revenue/monthly"),
        apiService.request("GET", "/statistics/revenue/top-customers"),
        apiService.request("GET", "/statistics/revenue/year"),
        apiService.request("GET", "/statistics/revenue/technicians/year"),
        apiService.getEnhancedKPIs(),
        apiService.getTopPerformance()
      ]);

      console.log("📦 Debug - Appointments response:", {
        type: typeof appointmentsRes,
        isArray: Array.isArray(appointmentsRes),
        raw: appointmentsRes
      });

      // Process appointments data
      let appointmentsArray = [];
      
      if (Array.isArray(appointmentsRes)) {
        appointmentsArray = appointmentsRes;
      } else if (appointmentsRes?.appointments && Array.isArray(appointmentsRes.appointments)) {
        appointmentsArray = appointmentsRes.appointments;
      } else if (appointmentsRes?.data && Array.isArray(appointmentsRes.data)) {
        appointmentsArray = appointmentsRes.data;
      } else if (appointmentsRes?.success && Array.isArray(appointmentsRes.data)) {
        appointmentsArray = appointmentsRes.data;
      }

      console.log(`✅ Processed ${appointmentsArray.length} appointments`);

      // Transform appointments to visits for display
      const transformedVisits = appointmentsArray.map(appointment => {
        const customerId = appointment.customerId || appointment.customer_id || appointment.customer?.id;
        const startTime = appointment.start_time || 
                        appointment.startTime ||
                        (appointment.date ? `${appointment.date}T${appointment.time || '09:00:00'}` : null);
        
        return {
          id: appointment.id || appointment.appointmentId || `appt_${Date.now()}`,
          visit_id: appointment.id || appointment.appointmentId,
          status: appointment.status || 'scheduled',
          customer_id: customerId,
          service_type: appointment.serviceType || appointment.service_type || 'unknown',
          start_time: startTime,
          end_time: appointment.endTime || appointment.end_time || null,
          duration: appointment.duration || 0,
          technician_name: appointment.technicianName || appointment.technician_name || 'Unknown',
          technician_id: appointment.technicianId || appointment.technician_id
        };
      }).filter(visit => visit.start_time);

      console.log(`✅ Created ${transformedVisits.length} transformed visits`);

      // Set the database-calculated KPIs
      if (enhancedKPIRes?.success && enhancedKPIRes.kpiData) {
        console.log("📊 Received KPI data (frontend):", enhancedKPIRes.kpiData);
        
        setKpiData({
          revenueGrowth: enhancedKPIRes.kpiData.revenueGrowth || 0,
          customerGrowth: enhancedKPIRes.kpiData.customerGrowth || 0,
          efficiencyScore: enhancedKPIRes.kpiData.efficiencyScore || 0,
          retentionRate: enhancedKPIRes.kpiData.retentionRate || 0,
          avgTicketSize: enhancedKPIRes.kpiData.avgTicketSize || 0,
          visitFrequency: enhancedKPIRes.kpiData.visitFrequency || 30
        });
      }

      // Set top performance from database
      if (topPerformanceRes?.success && topPerformanceRes.performanceData) {
        setBestTechnician(topPerformanceRes.performanceData.bestTechnician || "N/A");
        setTopService(topPerformanceRes.performanceData.topService || "N/A");
      }

      // Calculate new customers this month from local data as fallback
      if (Array.isArray(customersRes)) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const newCustomers = customersRes.filter(c => {
          const createdDate = new Date(c.createdAt || c.customerSince || c.created_at || new Date());
          return createdDate.getMonth() === currentMonth && 
                createdDate.getFullYear() === currentYear;
        }).length;
        
        setNewCustomersThisMonth(newCustomers);
      }

      // Set other data
      setVisits(transformedVisits);
      setCustomers(Array.isArray(customersRes) ? customersRes : []);
      setTechnicians(Array.isArray(techniciansRes) ? techniciansRes : []);
      setAppointments(appointmentsArray);
      setRevenueStats(revenueStatsRes?.stats || null);
      setRevenueByService(revenueByServiceRes?.data || []);
      setMonthlyRevenue(monthlyRevenueRes?.data || []);
      setTopCustomers(topCustomersRes?.data || []);
      setYearRevenue(yearRevenueRes?.total || 0);
      setTechnicianRevenue(technicianRevenueRes?.data || []);

      console.log("✅ All state set successfully");

    } catch (error) {
      console.error("❌ Failed to load statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for Today's Requests
  const getTodayRequestsKey = () => {
    const today = new Date().toISOString().split('T')[0];
    return `todayRequests_${today}`;
  };

  const loadTodayRequestsFromStorage = async () => {
    try {
      const key = getTodayRequestsKey();
      const stored = await AsyncStorage.getItem(key);
      return stored ? parseInt(stored) : 0;
    } catch (error) {
      console.error("Error loading from storage:", error);
      return 0;
    }
  };

  const saveTodayRequestsToStorage = async (count) => {
    try {
      const key = getTodayRequestsKey();
      await AsyncStorage.setItem(key, count.toString());
      console.log(`✅ Saved ${count} requests for today`);
    } catch (error) {
      console.error("Error saving to storage:", error);
    }
  };

  const completedAppointments = visits.filter(
    v => (v.status === "completed" || v.status === "done" || v.status === "finished") && 
        (typeof v.duration === "number" || (v.start_time && v.end_time))
  );

  const technicianEfficiency = visits.reduce((acc, visit) => {
    const duration = getVisitDurationMinutes(visit);
    if (!duration || !visit.technician_id) return acc;

    if (!acc[visit.technician_id]) {
      acc[visit.technician_id] = {
        technicianId: visit.technician_id,
        technicianName: visit.technician_name || "Unknown",
        totalDuration: 0,
        visits: 0,
        services: {}
      };
    }

    const tech = acc[visit.technician_id];
    tech.totalDuration += duration;
    tech.visits += 1;

    const service = visit.service_type || "unknown";

    if (!tech.services[service]) {
      tech.services[service] = { totalDuration: 0, visits: 0 };
    }

    tech.services[service].totalDuration += duration;
    tech.services[service].visits += 1;

    return acc;
  }, {});

  const getFilteredMonthlyRevenue = () => {
    if (!monthlyRevenue || monthlyRevenue.length === 0) return [];
    
    let filteredData = [...monthlyRevenue];
    
    // Sort by date (most recent first)
    filteredData.sort((a, b) => {
      const [aYear, aMonth] = a.month.split('-').map(Number);
      const [bYear, bMonth] = b.month.split('-').map(Number);
      return bYear - aYear || bMonth - aMonth;
    });
    
    // Filter based on time period
    switch(timePeriod) {
      case '3months':
        return filteredData.slice(0, 3);
      case '6months':
        return filteredData.slice(0, 6);
      case '1year':
        return filteredData.slice(0, 12);
      case 'all':
      default:
        return filteredData;
    }
  };

  function getVisitDurationMinutes(visit) {
    if (typeof visit.duration === "number") {
      return visit.duration;
    }

    if (visit.start_time && visit.end_time) {
      const start = new Date(visit.start_time);
      const end = new Date(visit.end_time);
      return Math.round((end - start) / 60000);
    }

    return null;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
  };

  const incrementTodayRequests = async () => {
    try {
      const key = getTodayRequestsKey();
      const current = await loadTodayRequestsFromStorage();
      const newCount = current + 1;
      await saveTodayRequestsToStorage(newCount);
      setTodayRequests(newCount);
      console.log(`➕ Incremented today's requests to ${newCount}`);
    } catch (error) {
      console.error("Error incrementing today's requests:", error);
    }
  };

  const todayAppointments = appointments.filter(
    a => a.date === new Date().toISOString().split("T")[0]
  );

  const appointmentsByStatus = appointments.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const appointmentsByService = appointments.reduce((acc, a) => {
    const key = a.serviceType || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const isMonthCurrentMonth = (monthString) => {
    if (!monthString) return false;
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const [year, month] = monthString.split('-').map(Number);
    
    return year === currentYear && month === currentMonth;
  };

  const calculateEnhancedKPIs = (customersData, appointmentsData, revenueStatsData, monthlyRevenueData, technicianRevenueData, revenueByServiceData) => {
    // Default values
    const defaultKpiData = {
      revenueGrowth: 0,
      customerGrowth: 0,
      efficiencyScore: 0,
      retentionRate: 0,
      avgTicketSize: 0,
      visitFrequency: 0
    };

    if (!customersData || customersData.length === 0 || !appointmentsData || appointmentsData.length === 0) {
      setKpiData(defaultKpiData);
      return;
    }
    
    const activeCustomers = customersData.filter(c => c.status === 'active').length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Calculate new customers this month
    const newCustomers = customersData.filter(c => {
      const createdDate = new Date(c.createdAt || c.customerSince || c.created_at || new Date());
      return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
    }).length;
    setNewCustomersThisMonth(newCustomers);
    
    // Customer Growth
    const customerGrowth = activeCustomers > 0 ? ((newCustomers / activeCustomers) * 100) : 0;
    
    // Revenue Growth (Month-over-Month)
    let revenueGrowth = 0;
    if (monthlyRevenueData && monthlyRevenueData.length >= 2) {
      // Sort monthly revenue by date (most recent first)
      const sortedMonthlyRevenue = [...monthlyRevenueData].sort((a, b) => {
        const [aYear, aMonth] = a.month.split('-').map(Number);
        const [bYear, bMonth] = b.month.split('-').map(Number);
        return bYear - aYear || bMonth - aMonth;
      });
      
      const currentMonthRev = parseFloat(sortedMonthlyRevenue[0]?.revenue || 0);
      const lastMonthRev = parseFloat(sortedMonthlyRevenue[1]?.revenue || 0);
      revenueGrowth = lastMonthRev > 0 ? ((currentMonthRev - lastMonthRev) / lastMonthRev * 100) : currentMonthRev > 0 ? 100 : 0;
    }
    
    // Technician Efficiency Score
    let efficiencyScore = 100;
    if (completedAppointments.length > 0) {
      // Get actual durations from visits
      const durations = completedAppointments.map(v => {
        if (v.duration) return v.duration;
        if (v.start_time && v.end_time) {
          return Math.round((new Date(v.end_time) - new Date(v.start_time)) / 60000);
        }
        return 0;
      }).filter(d => d > 0);
      
      if (durations.length > 0) {
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        
        // Better calculation based on realistic times
        const expectedTime = 75; // minutes for average job
        
        // Efficiency: 100% if at or below expected, penalty for going over
        efficiencyScore = Math.max(0, Math.min(100, 
          100 - Math.max(0, ((avgDuration - expectedTime) / expectedTime) * 50)
        ));
      }
    }
    
    // Customer Retention Rate
    const recurringCustomers = visits.reduce((set, visit) => {
      if (visit.customer_id && (visit.status === "completed" || visit.status === "done")) {
        set.add(visit.customer_id);
      }
      return set;
    }, new Set()).size;
    
    const retentionRate = customersData.length > 0 ? 
      (recurringCustomers / customersData.length * 100) : 0;
    
    // Average Ticket Size - safely parse
    const avgTicketSize = revenueStatsData?.avg_price ? parseFloat(revenueStatsData.avg_price) : 0;
    
    // Visit Frequency
    const visitFrequency = calculateAverageVisitFrequency();
    
    // Set best technician
    if (technicianRevenueData && technicianRevenueData.length > 0) {
      const topTech = technicianRevenueData.reduce((max, tech) => 
        parseFloat(tech.total || 0) > parseFloat(max.total || 0) ? tech : max
      );
      setBestTechnician(topTech.technician_name?.split(' ')[0] || 'N/A');
    }
    
    // Set top service
    if (revenueByServiceData && revenueByServiceData.length > 0) {
      const topServiceData = revenueByServiceData.reduce((max, service) => 
        parseFloat(service.total_revenue || 0) > parseFloat(max.total_revenue || 0) ? service : max
      );
      setTopService(topServiceData.service_type || 'N/A');
    }
    
    setKpiData({
      revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
      customerGrowth: parseFloat(customerGrowth.toFixed(1)),
      efficiencyScore: parseFloat(efficiencyScore.toFixed(0)),
      retentionRate: parseFloat(retentionRate.toFixed(1)),
      avgTicketSize: parseFloat(avgTicketSize.toFixed(2)),
      visitFrequency: Math.round(visitFrequency)
    });
  };

  const calculateAverageVisitFrequency = () => {
    if (visits.length < 2) return 0;
    
    const customerDays = new Map();
    
    // Group unique visit days per customer
    visits.forEach(visit => {
      if (visit.customer_id && visit.start_time) {
        const dateStr = new Date(visit.start_time).toISOString().split('T')[0];
        
        if (!customerDays.has(visit.customer_id)) {
          customerDays.set(visit.customer_id, new Set());
        }
        customerDays.get(visit.customer_id).add(dateStr);
      }
    });
    
    let totalDays = 0;
    let intervalCount = 0;
    
    // Calculate intervals between unique days
    customerDays.forEach((dateSet, customerId) => {
      const dates = Array.from(dateSet)
        .map(str => new Date(str))
        .sort((a, b) => a - b);
      
      if (dates.length > 1) {
        for (let i = 1; i < dates.length; i++) {
          const days = (dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24);
          totalDays += days;
          intervalCount++;
        }
      }
    });
    
    // If we have valid intervals, return average
    if (intervalCount > 0) {
      return Math.round(totalDays / intervalCount);
    }
    
    return 30; // Monthly default
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f9c8b" />
        <Text style={styles.loadingText}>Loading Statistics...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1f9c8b"]}
          />
        }
      >
        {/* PROFESSIONAL HEADER */}
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
                <MaterialIcons name="analytics" size={14} color="#fff" />
                <Text style={styles.adminBadgeText}>ANALYTICS DASHBOARD</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Business Analytics</Text>
            <Text style={styles.title}>Performance Dashboard</Text>
            <Text style={styles.subtitle}>
              Real-time business insights and performance metrics
            </Text>
          </View>
        </View>

        {/* ENHANCED KPI SECTION */}
        <View style={styles.enhancedKpiSection}>
          <Text style={styles.enhancedKpiTitle}>Business Performance Dashboard</Text>
          
          {/* REVENUE & GROWTH ROW */}
          <View style={styles.kpiRow}>
            <KPICard 
              title="Monthly Revenue"
              value={`€${parseFloat(monthlyRevenue[0]?.revenue || 0).toFixed(0)}`}
              change={kpiData.revenueGrowth || 0}
              icon="euro"
              isCurrency={true}
              subtitle="vs last month"
            />
            
            <KPICard 
              title="Customer Growth"
              value={`+${newCustomersThisMonth || 0}`}
              change={kpiData.customerGrowth || 0}
              icon="people"
              subtitle="new customers"
            />
          </View>
          
          {/* EFFICIENCY ROW */}
          <View style={styles.kpiRow}>
            <KPICard 
              title="Efficiency Score"
              value={`${(kpiData.efficiencyScore || 0).toFixed(0)}%`}
              icon="speed"
              showProgress={true}
              progress={(kpiData.efficiencyScore || 0) / 100}
              subtitle="based on visit duration"
              color="#1f9c8b"
            />
            
            <KPICard 
              title="Retention Rate"
              value={`${(kpiData.retentionRate || 0).toFixed(1)}%`}
              icon="loyalty"
              subtitle="customer loyalty"
              color="#1f9c8b"
            />
          </View>
          
          {/* OPERATIONAL ROW */}
          <View style={styles.kpiRow}>
            <KPICard 
              title="Avg Ticket Size"
              value={`€${(kpiData.avgTicketSize || 0).toFixed(2)}`}
              icon="receipt"
              subtitle="per service"
              color="#1f9c8b"
            />
            
            <KPICard 
              title="Visit Frequency"
              value={`${kpiData.visitFrequency || 30} days`}
              icon="update"
              subtitle="between services"
              color="#1f9c8b"
            />
          </View>
          
          {/* QUICK INSIGHTS */}
          <View style={styles.insightsContainer}>
            <Text style={styles.insightsTitle}>Quick Insights</Text>
            <View style={styles.insightsGrid}>
              <InsightCard 
                icon="emoji-events"
                title="Best Performing"
                value={bestTechnician}
                color="#1f9c8b"
              />
              <InsightCard 
                icon="star"
                title="Top Service"
                value={topService}
                color="#1f9c8b"
              />
            </View>
          </View>
        </View>

        {/* REVENUE SUMMARY SECTION */}
        {revenueStats && (
          <Section title="Revenue Summary">
            <View style={styles.revenueGrid}>
              <RevenueCard 
                title="Total Revenue" 
                value={`€${parseFloat(revenueStats.total_revenue || 0).toFixed(2)}`}
                icon="euro"
              />
              <RevenueCard 
                title="This Year" 
                value={`€${parseFloat(yearRevenue).toFixed(2)}`}
                icon="calendar-today"
              />
              <RevenueCard 
                title="Avg Price" 
                value={`€${parseFloat(revenueStats.avg_price || 0).toFixed(2)}`}
                icon="trending-up"
              />
              <RevenueCard 
                title="Completed" 
                value={revenueStats.completed_appointments || 0}
                icon="check-circle"
              />
            </View>
          </Section>
        )}

        {/* REVENUE TRENDS CHART */}
        <Section title="Revenue Trends">
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartMainTitle}>Monthly Revenue Performance</Text>
            </View>
            
            <View style={styles.chartCard}>
              {/* Chart Header with Stats and Time Filter */}
              <View style={styles.chartTopBar}>
                <View style={styles.chartStatsHeader}>
                  <View style={styles.chartStatItem}>
                    <Text style={styles.chartStatLabel}>Current Month</Text>
                    <Text style={styles.chartStatValue}>
                      €{parseFloat(monthlyRevenue[0]?.revenue || 0).toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.chartStatItem}>
                    <Text style={styles.chartStatLabel}>Growth</Text>
                    <View style={styles.growthContainer}>
                      <MaterialIcons 
                        name={kpiData.revenueGrowth > 0 ? "trending-up" : "trending-down"} 
                        size={16} 
                        color={kpiData.revenueGrowth > 0 ? "#1f9c8b" : "#e74c3c"} 
                      />
                      <Text style={[
                        styles.chartStatValue, 
                        { 
                          color: kpiData.revenueGrowth > 0 ? "#1f9c8b" : "#e74c3c",
                          fontSize: 20
                        }
                      ]}>
                        {kpiData.revenueGrowth > 0 ? '+' : ''}{kpiData.revenueGrowth}%
                      </Text>
                    </View>
                  </View>
                </View>
                
                {/* Time Filter Dropdown */}
                <View style={styles.filterContainer}>
                  <TouchableOpacity 
                    style={styles.timeFilterButton}
                    onPress={() => setShowTimeFilter(!showTimeFilter)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.timeFilterText}>
                      {timePeriod === '3months' ? 'Last 3 Months' : 
                      timePeriod === '6months' ? 'Last 6 Months' :
                      timePeriod === '1year' ? 'Last 12 Months' : 'All Time'}
                    </Text>
                    <MaterialIcons 
                      name={showTimeFilter ? "arrow-drop-up" : "arrow-drop-down"} 
                      size={20} 
                      color="#1f9c8b" 
                    />
                  </TouchableOpacity>
                  
                  {/* Dropdown Menu */}
                  {showTimeFilter && (
                    <View style={styles.dropdownMenu}>
                      <TouchableOpacity 
                        style={[
                          styles.dropdownItem,
                          timePeriod === '3months' && styles.dropdownItemActive
                        ]}
                        onPress={() => {
                          setTimePeriod('3months');
                          setShowTimeFilter(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          timePeriod === '3months' && styles.dropdownItemTextActive
                        ]}>
                          Last 3 Months
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[
                          styles.dropdownItem,
                          timePeriod === '6months' && styles.dropdownItemActive
                        ]}
                        onPress={() => {
                          setTimePeriod('6months');
                          setShowTimeFilter(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          timePeriod === '6months' && styles.dropdownItemTextActive
                        ]}>
                          Last 6 Months
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[
                          styles.dropdownItem,
                          timePeriod === '1year' && styles.dropdownItemActive
                        ]}
                        onPress={() => {
                          setTimePeriod('1year');
                          setShowTimeFilter(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          timePeriod === '1year' && styles.dropdownItemTextActive
                        ]}>
                          Last 12 Months
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[
                          styles.dropdownItem,
                          timePeriod === 'all' && styles.dropdownItemActive
                        ]}
                        onPress={() => {
                          setTimePeriod('all');
                          setShowTimeFilter(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          timePeriod === 'all' && styles.dropdownItemTextActive
                        ]}>
                          All Time
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
              
              {/* Chart Visualization */}
              {monthlyRevenue.length > 0 ? (
                <View style={styles.chartVisualization}>
                  {/* Y-axis labels */}
                  <View style={styles.yAxisContainer}>
                    {[3, 2, 1, 0].map((multiplier) => {
                      const filteredData = getFilteredMonthlyRevenue();
                      const maxRevenue = Math.max(...filteredData.map(m => parseFloat(m.revenue || 0)));
                      const value = Math.round((maxRevenue / 3) * multiplier);
                      return (
                        <Text key={multiplier} style={styles.yAxisLabel}>
                          €{value.toLocaleString()}
                        </Text>
                      );
                    })}
                  </View>
                  
                  {/* Chart Bars */}
                  <View style={styles.chartBarsContainer}>
                    {getFilteredMonthlyRevenue().map((month, index) => {
                      const filteredData = getFilteredMonthlyRevenue();
                      const maxRevenue = Math.max(...filteredData.map(m => parseFloat(m.revenue || 0)));
                      const height = maxRevenue > 0 ? (parseFloat(month.revenue || 0) / maxRevenue) * 100 : 0;
                      const isCurrentMonth = isMonthCurrentMonth(month.month);
                      
                      // Calculate growth from previous month
                      const prevRevenue = index < filteredData.length - 1 ? 
                        parseFloat(filteredData[index + 1]?.revenue || 0) : 0;
                      const growth = prevRevenue > 0 ? 
                        ((parseFloat(month.revenue || 0) - prevRevenue) / prevRevenue * 100).toFixed(1) : 0;
                      
                      // Format month name
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      const [year, monthNum] = month.month.split('-');
                      const monthName = monthNames[parseInt(monthNum) - 1];
                      const displayYear = year !== new Date().getFullYear().toString() ? ` '${year.slice(2)}` : '';
                      
                      return (
                        <View key={index} style={styles.chartColumn}>
                          {/* Tooltip on hover/touch */}
                          <TouchableOpacity 
                            style={styles.barTooltip}
                            activeOpacity={0.8}
                            onPress={() => {
                              setSelectedBarIndex(index);
                              setShowRevenueDetails(true);
                            }}
                          >
                            <View style={styles.tooltipContent}>
                              <Text style={styles.tooltipMonth}>{monthName} {year}</Text>
                              <Text style={styles.tooltipRevenue}>
                                €{parseFloat(month.revenue || 0).toLocaleString()}
                              </Text>
                              {growth !== 0 && (
                                <View style={styles.tooltipGrowth}>
                                  <MaterialIcons 
                                    name={growth > 0 ? "arrow-upward" : "arrow-downward"} 
                                    size={12} 
                                    color={growth > 0 ? "#1f9c8b" : "#e74c3c"} 
                                  />
                                  <Text style={[
                                    styles.tooltipGrowthText,
                                    { color: growth > 0 ? "#1f9c8b" : "#e74c3c" }
                                  ]}>
                                    {growth > 0 ? '+' : ''}{growth}%
                                  </Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                          
                          {/* Bar with gradient effect */}
                          <View 
                            style={[
                              styles.revenueBar,
                              { 
                                height: `${height}%`,
                                backgroundColor: isCurrentMonth ? '#1f9c8b' : '#babdbf',
                              }
                            ]}
                          >
                            {/* Gradient overlay */}
                            <View style={[
                              styles.barGradient,
                              { 
                                backgroundColor: isCurrentMonth ? 
                                  'rgba(31, 156, 139, 0.2)' : 
                                  'rgba(52, 152, 219, 0.2)'
                              }
                            ]} />
                            
                            {/* Bar value label - only show if bar is tall enough */}
                            {height > 20 && (
                              <Text style={styles.barValue}>
                                €{parseFloat(month.revenue || 0).toFixed(0)}
                              </Text>
                            )}
                          </View>
                          
                          {/* X-axis label */}
                          <Text style={[
                            styles.xAxisLabel,
                            isCurrentMonth && styles.currentMonthLabel
                          ]}>
                            {monthName}{displayYear}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={styles.noChartData}>
                  <MaterialIcons name="show-chart" size={50} color="#ddd" />
                  <Text style={styles.noChartDataText}>No revenue data available</Text>
                  <Text style={styles.noChartDataSubtext}>Revenue data will appear here as services are completed</Text>
                </View>
              )}
              
              {/* Chart Footer */}
              <View style={styles.chartFooter}>
                <View style={styles.legendContainer}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#1f9c8b' }]} />
                    <Text style={styles.legendText}>Current Month</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#babdbf' }]} />
                    <Text style={styles.legendText}>Previous Months</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Section>

        {/* OVERVIEW - ENHANCED DESIGN */}
        <Section title="Business Overview">
          <View style={styles.overviewGrid}>
            <OverviewCard 
              icon="people"
              title="Customers"
              value={customers.length}
              color="#1f9c8b"
              subtitle="Active accounts"
            />
            
            <OverviewCard 
              icon="engineering"
              title="Technicians"
              value={technicians.length}
              color="#1f9c8b"
              subtitle="Team members"
            />
            
            <OverviewCard 
              icon="event"
              title="Appointments"
              value={appointments.length}
              color="#1f9c8b"
              subtitle="Total scheduled"
            />
            
            <OverviewCard 
              icon="today"
              title="Today's Visits"
              value={todayAppointments.length}
              color="#1f9c8b"
              subtitle="Services today"
            />
            
            <OverviewCard 
              icon="request-quote"
              title="Today's Requests"
              value={todayRequests}
              color="#1f9c8b"
              subtitle="New inquiries"
            />
            
            <OverviewCard 
              icon="check-circle"
              title="Completion Rate"
              value={`${visits.length > 0 ? Math.round((completedAppointments.length / visits.length) * 100) : 0}%`}
              color="#1f9c8b"
              subtitle="Services completed"
            />
          </View>
        </Section>

        {/* REVENUE BY SERVICE TYPE - ENHANCED */}
        <EnhancedSection 
          title="Revenue by Service Type" 
          icon="category"
        >
          <View style={styles.serviceTypeGrid}>
            {revenueByService.map((service, index) => {
              const percentage = revenueStats?.total_revenue ? 
                (parseFloat(service.total_revenue || 0) / parseFloat(revenueStats.total_revenue) * 100).toFixed(1) : 0;
              
              return (
                <ServiceTypeCard
                  key={service.service_type}
                  name={service.service_type || "Unknown"}
                  revenue={parseFloat(service.total_revenue || 0)}
                  appointments={service.appointment_count || 0}
                  percentage={percentage}
                  index={index}
                />
              );
            })}
          </View>
        </EnhancedSection>


        {/* TOP TECHNICIANS BY REVENUE - ENHANCED */}
        <EnhancedSection 
          title="Top Technicians" 
          icon="engineering"
        >
          <View style={styles.techniciansList}>
            {technicianRevenue.slice(0, 5).map((tech, index) => (
              <TechnicianCard
                key={tech.technician_id}
                rank={index + 1}
                name={tech.technician_name || "Unknown"}
                revenue={parseFloat(tech.total || 0)}
                index={index}
              />
            ))}
          </View>
        </EnhancedSection>

        {/* TOP CUSTOMERS - ENHANCED */}
        <EnhancedSection 
          title="Top Customers" 
          icon="star"
        >
          <View style={styles.customersList}>
            {topCustomers.slice(0, 5).map((customer, index) => (
              <CustomerCard
                key={customer.customer_id}
                rank={index + 1}
                name={customer.customer_name || "Unknown"}
                revenue={parseFloat(customer.total_spent || 0)}
                visits={customer.appointment_count || 0}
                index={index}
              />
            ))}
          </View>
        </EnhancedSection>

        {/* APPOINTMENTS BY STATUS - ENHANCED */}
        <EnhancedSection 
          title="Appointment Status" 
          icon="pie-chart"
        >
          <View style={styles.statusContainer}>
            <View style={styles.statusChartContainer}>
              {/* Pie chart visualization (simplified) */}
              <View style={styles.pieChart}>
                {Object.entries(appointmentsByStatus).map(([status, count], index) => {
                  const total = Object.values(appointmentsByStatus).reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
                  const colors = ['#1f9c8b', '#95a5a6', '#b9cd63'];
                  
                  return (
                    <View 
                      key={status} 
                      style={[
                        styles.pieSegment,
                        { 
                          backgroundColor: colors[index % colors.length],
                          width: `${percentage}%`
                        }
                      ]} 
                    />
                  );
                })}
              </View>
              
              <View style={styles.statusStats}>
                <Text style={styles.statusTotal}>{appointments.length}</Text>
                <Text style={styles.statusLabel}>Total Appointments</Text>
              </View>
            </View>
            
            <View style={styles.statusList}>
              {Object.entries(appointmentsByStatus).map(([status, count], index) => {
                const total = Object.values(appointmentsByStatus).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
                const colors = ['#1f9c8b', '#95a5a6', '#b9cd63'];
                
                return (
                  <StatusItem
                    key={status}
                    status={status}
                    count={count}
                    percentage={percentage}
                    color={colors[index % colors.length]}
                  />
                );
              })}
            </View>
          </View>
        </EnhancedSection>

        {/* APPOINTMENTS BY SERVICE TYPE - ENHANCED */}
        <EnhancedSection 
          title="Service Distribution" 
          icon="business-center"
        >
          <View style={styles.serviceDistribution}>
            {Object.entries(appointmentsByService).map(([type, count], index) => {
              const total = Object.values(appointmentsByService).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
              const colors = ['#1f9c8b'];
              
              return (
                <ServiceDistributionItem
                  key={type}
                  type={type}
                  count={count}
                  percentage={percentage}
                  color={colors[index % colors.length]}
                  index={index}
                />
              );
            })}
          </View>
        </EnhancedSection>

        {/* PROFESSIONAL FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Business Analytics Dashboard</Text>
          <Text style={styles.footerSubtext}>
            Version 1.0 • Data updated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
          <Text style={styles.footerCopyright}>
            © {new Date().getFullYear()} Pest-Free. All rights reserved.
          </Text>
        </View>
      </ScrollView>
      
      {/* Revenue Details Modal */}
      {showRevenueDetails && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Revenue Details</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowRevenueDetails(false);
                  setSelectedBarIndex(null);
                }}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {/* Selected Month Details (if a bar was clicked) */}
            {selectedBarIndex !== null && monthlyRevenue[selectedBarIndex] && (
              <View style={styles.selectedMonthCard}>
                <View style={styles.monthHeader}>
                  <MaterialIcons name="calendar-today" size={24} color="#1f9c8b" />
                  <View style={styles.monthInfo}>
                    <Text style={styles.monthName}>
                      {formatMonth(monthlyRevenue[selectedBarIndex].month)}
                    </Text>
                    <Text style={styles.monthRevenue}>
                      €{parseFloat(monthlyRevenue[selectedBarIndex].revenue || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.monthStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Services Completed</Text>
                    <Text style={styles.statValue}>
                      {monthlyRevenue[selectedBarIndex].appointments || 0}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Avg. Revenue/Service</Text>
                    <Text style={styles.statValue}>
                      €{revenueStats?.avg_price ? parseFloat(revenueStats.avg_price).toFixed(2) : '0.00'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            
            {/* Full Revenue Table */}
            <ScrollView style={styles.revenueTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'center' }]}>Month</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Revenue</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Services</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Growth</Text>
              </View>
              
              {monthlyRevenue.map((month, index) => {
                const prevRevenue = index < monthlyRevenue.length - 1 ? 
                  parseFloat(monthlyRevenue[index + 1]?.revenue || 0) : 0;
                const growth = prevRevenue > 0 ? 
                  ((parseFloat(month.revenue || 0) - prevRevenue) / prevRevenue * 100).toFixed(1) : 0;
                
                return (
                  <TouchableOpacity 
                    key={index}
                    style={[
                      styles.tableRow,
                      selectedBarIndex === index && styles.tableRowSelected
                    ]}
                    onPress={() => setSelectedBarIndex(index)}
                  >
                    <Text style={[styles.tableCell, { flex: 2, textAlign: 'center' }]}>
                      {formatMonth(month.month)}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1, fontWeight: '600', textAlign: 'center' }]}>
                      €{parseFloat(month.revenue || 0).toLocaleString()}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
                      {month.appointments || 0}
                    </Text>
                    <Text style={[
                      styles.tableCell, 
                      { 
                        flex: 1,
                        color: growth > 0 ? '#2ecc71' : growth < 0 ? '#e74c3c' : '#95a5a6',
                        textAlign: 'center'
                      }
                    ]}>
                      {growth > 0 ? '+' : ''}{growth}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            {/* Modal Footer - REMOVED Export Data, Center Close button */}
            <View style={[styles.modalFooter, { justifyContent: 'center' }]}>
              <TouchableOpacity 
                style={[styles.closeModalButton, { width: '60%' }]}
                onPress={() => {
                  setShowRevenueDetails(false);
                  setSelectedBarIndex(null);
                }}
              >
                <Text style={styles.closeModalText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

/* =======================
   COMPONENTS
   ======================= */

function ChartCard({ title, children }) {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      {children}
    </View>
  );
}

function KPICard({ title, value, change, icon, subtitle, showProgress = false, progress = 0, color = "#1f9c8b", isCurrency = false }) {
  const getTrendIcon = (value) => {
    if (value > 0) return 'trending-up';
    if (value < 0) return 'trending-down';
    return 'trending-flat';
  };

  const getColorForValue = (value) => {
    if (value > 0) return '#1f9c8b';
    if (value < 0) return '#e74c3c';
    return '#95a5a6';
  };

  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiHeader}>
        <View style={[styles.kpiIconContainer, { backgroundColor: `${color}20` }]}>
          <MaterialIcons name={icon} size={20} color={color} />
        </View>
        <View style={styles.kpiTitleContainer}>
          <Text style={styles.kpiCardTitle}>{title}</Text>
          {subtitle && <Text style={styles.kpiSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      
      <Text style={[styles.kpiCardValue, { color }]}>{value}</Text>
      
      {change !== undefined && (
        <View style={styles.changeContainer}>
          <MaterialIcons 
            name={getTrendIcon(change)} 
            size={16} 
            color={getColorForValue(change)} 
          />
          <Text style={[styles.changeText, { color: getColorForValue(change) }]}>
            {change > 0 ? '+' : ''}{change}%
          </Text>
        </View>
      )}
      
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${(progress || 0) * 100}%`,
                  backgroundColor: color
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {(progress || 0) < 0.5 ? 'Needs improvement' : (progress || 0) < 0.8 ? 'Good' : 'Excellent'}
          </Text>
        </View>
      )}
    </View>
  );
}

function InsightCard({ icon, title, value, color }) {
  return (
    <View style={styles.insightCard}>
      <View style={[styles.insightIconContainer, { backgroundColor: `${color}20` }]}>
        <MaterialIcons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={[styles.insightValue, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RevenueCard({ title, value, icon }) {
  return (
    <View style={styles.revenueCard}>
      <MaterialIcons name={icon} size={24} color="#1f9c8b" />
      <Text style={styles.revenueValue}>{value}</Text>
      <Text style={styles.revenueLabel}>{title}</Text>
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function OverviewCard({ icon, title, value, color, subtitle, trend }) {
  return (
    <View style={styles.overviewCard}>
      {/* Icon Container */}
      <View style={[styles.overviewIconContainer, { backgroundColor: `${color}15` }]}>
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
      
      {/* Content */}
      <View style={styles.overviewContent}>
        <Text style={styles.overviewTitle}>{title}</Text>
        <Text style={[styles.overviewValue, { color }]}>{value}</Text>
        <Text style={styles.overviewSubtitle}>{subtitle}</Text>
      </View>
      
      {/* Trend Badge */}
      {trend && (
        <View style={styles.trendBadge}>
          <Text style={styles.trendText}>{trend}</Text>
        </View>
      )}
    </View>
  );
}

function EnhancedSection({ title, children, icon, action }) {
  return (
    <View style={styles.enhancedSection}>
      <View style={styles.enhancedSectionHeader}>
        <View style={styles.sectionTitleRow}>
          {icon && (
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name={icon} size={20} color="#1f9c8b" />
            </View>
          )}
          <Text style={styles.enhancedSectionTitle}>{title}</Text>
        </View>
        {action && (
          <TouchableOpacity style={styles.sectionAction}>
            {action}
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function formatMonth(monthString) {
  if (!monthString) return "Unknown";
  const [year, month] = monthString.split('-');
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatServiceType(serviceType) {
  if (!serviceType) return "Unknown";
  
  // Define custom mappings for specific service types
  const serviceMappings = {
    'myocide': 'Myocide',
    'rodenticide': 'Rodenticide',
    'fumigation': 'Fumigation',
    'disinfection': 'Disinfection',
    'sanitization': 'Sanitization',
    'inspection': 'Inspection',
    'maintenance': 'Maintenance',
    'consultation': 'Consultation',
  };
  
  // Check if we have a custom mapping
  const lowerType = serviceType.toLowerCase();
  if (serviceMappings[lowerType]) {
    return serviceMappings[lowerType];
  }
  
  // Default: Capitalize first letter of each word
  return serviceType
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function ServiceTypeCard({ name, revenue, appointments, percentage, index }) {
  const colors = ['#1f9c8b'];
  const icons = ['pest-control-rodent', 'clean-hands', 'bug-report', 'star', 'build'];
  
  // Format the service name
  const formattedName = formatServiceType(name);
  
  return (
    <View style={styles.serviceTypeCard}>
      <View style={styles.serviceTypeHeader}>
        <View style={[styles.serviceTypeIcon, { backgroundColor: `${colors[index % colors.length]}15` }]}>
          <MaterialIcons 
            name={icons[index % icons.length] || 'category'} 
            size={20} 
            color={colors[index % colors.length]} 
          />
        </View>
        <View style={styles.serviceTypeInfo}>
          <Text style={styles.serviceTypeName}>{formattedName}</Text> 
          <Text style={styles.serviceTypeMeta}>{appointments} services</Text>
        </View>
      </View>
      
      <View style={styles.serviceTypeStats}>
        <Text style={[styles.serviceTypeRevenue, { color: colors[index % colors.length] }]}>
          €{revenue.toLocaleString()}
        </Text>
        <View style={styles.percentageBadge}>
          <Text style={styles.percentageText}>{percentage}%</Text>
        </View>
      </View>
      
      {/* Progress bar */}
      <View style={styles.progressBarBackground}>
        <View 
          style={[
            styles.progressBarFill,
            { 
              width: `${percentage}%`,
              backgroundColor: colors[index % colors.length]
            }
          ]} 
        />
      </View>
    </View>
  );
}

export const incrementTodayRequests = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `todayRequests_${today}`;
    const current = await AsyncStorage.getItem(key);
    const currentCount = current ? parseInt(current) : 0;
    const newCount = currentCount + 1;
    await AsyncStorage.setItem(key, newCount.toString());
    console.log(`➕ Incremented today's requests to ${newCount}`);
    return newCount;
  } catch (error) {
    console.error("Error incrementing today's requests:", error);
    return 0;
  }
};

function TechnicianCard({ rank, name, revenue, index }) {
  const colors = ['#1f9c8b'];
  const rankColors = ['#1f9c8b', '#bdc3c7'];
  
  return (
    <TouchableOpacity style={styles.technicianCard}>
      <View style={styles.technicianRank}>
        <View style={[styles.rankBadge, { backgroundColor: rankColors[rank - 1] || '#95a5a6' }]}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>
      </View>
      
      <View style={styles.technicianInfo}>
        <Text style={styles.technicianName}>{name}</Text>
        <Text style={styles.technicianRole}>Senior Technician</Text>
      </View>
      
      <View style={styles.technicianRevenue}>
        <Text style={[styles.revenueAmount, { color: colors[index % colors.length] }]}>
          €{revenue.toLocaleString()}
        </Text>
        <MaterialIcons name="trending-up" size={16} color="#1f9c8b" />
      </View>
    </TouchableOpacity>
  );
}

function CustomerCard({ rank, name, revenue, visits, index }) {
  const colors = ['#1f9c8b'];
  
  return (
    <TouchableOpacity style={styles.customerCard}>
      <View style={styles.customerAvatar}>
        <Text style={[styles.avatarText, { color: colors[index % colors.length] }]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.customerInfo}>
        <Text style={styles.customerName} numberOfLines={1}>{name}</Text>
        <View style={styles.customerMeta}>
          <MaterialIcons name="event" size={12} color="#95a5a6" />
          <Text style={styles.customerMetaText}>{visits} visits</Text>
        </View>
      </View>
      
      <View style={styles.customerRevenue}>
        <Text style={[styles.customerRevenueAmount, { color: colors[index % colors.length] }]}>
          €{revenue.toLocaleString()}
        </Text>
        <View style={styles.revenueBadge}>
          <Text style={styles.revenueBadgeText}>Top {rank}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function StatusItem({ status, count, percentage, color }) {
  const statusIcons = {
    'completed': 'check-circle',
    'scheduled': 'schedule',
    'in-progress': 'hourglass-empty',
    'cancelled': 'cancel',
    'pending': 'pending'
  };
  
  return (
    <View style={styles.statusItem}>
      <View style={styles.statusLeft}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <MaterialIcons 
          name={statusIcons[status.toLowerCase()] || 'help-outline'} 
          size={16} 
          color={color} 
        />
        <Text style={styles.statusName}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
      </View>
      
      <View style={styles.statusRight}>
        <Text style={styles.statusCount}>{count}</Text>
        <Text style={styles.statusPercentage}>{percentage}%</Text>
      </View>
    </View>
  );
}

function ServiceDistributionItem({ type, count, percentage, color, index }) {
  const icons = ['pest-control-rodent', 'clean-hands', 'bug-report', 'star', 'build',];
  
  // Format the service type name
  const formattedType = formatServiceType(type);
  
  return (
    <View style={styles.distributionItem}>
      <View style={styles.distributionLeft}>
        <View style={[styles.distributionIcon, { backgroundColor: `${color}15` }]}>
          <MaterialIcons 
            name={icons[index % icons.length] || 'category'} 
            size={16} 
            color={color} 
          />
        </View>
        <Text style={styles.distributionType} numberOfLines={1} ellipsizeMode="tail">
          {formattedType}
        </Text>
      </View>
      
      <View style={styles.distributionMiddle}>
        <View style={styles.distributionBar}>
          <View 
            style={[
              styles.distributionBarFill,
              { 
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: color
              }
            ]} 
          />
        </View>
      </View>
      
      {/* Adjusted for better spacing */}
      <View style={styles.distributionRight}>
        <Text style={styles.distributionCount}>{count}</Text>
        <Text style={[styles.distributionPercentage, { color }]}>{percentage}%</Text>
      </View>
    </View>
  );
}

/* =======================
   STYLES
   ======================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 16,
    fontWeight: "500"
  },
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
    flex: 1,
    marginLeft: 10,
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
    marginLeft: 12,
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
  footer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 24,
    marginBottom: 8,
    backgroundColor: "#fff",
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
    textAlign: 'center',
  },
  footerCopyright: {
    fontSize: 11,
    color: "#aaa",
    fontFamily: 'System',
  },
  
  // ENHANCED KPI STYLES
  enhancedKpiSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  enhancedKpiTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  kpiTitleContainer: {
    flex: 1,
  },
  kpiCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  kpiSubtitle: {
    fontSize: 11,
    color: '#7f8c8d',
    marginTop: 2,
  },
  kpiCardValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e8e8e8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    color: '#7f8c8d',
    marginTop: 4,
    textAlign: 'center',
  },
  insightsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  insightCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  insightIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 11,
    color: '#7f8c8d',
    marginBottom: 4,
    textAlign: 'center',
  },
  insightValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
    fontSize: 14,
  },
  
  // EXISTING STYLES
  section: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#2c3e50"
  },
  revenueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  revenueCard: {
    width: "48%",
    backgroundColor: "#f0f9f8",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  revenueValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f9c8b",
    marginTop: 8,
  },
  revenueLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  statCard: {
    alignItems: "center",
    marginBottom: 12
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f9c8b"
  },
  statLabel: {
    fontSize: 13,
    color: "#666"
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowLabel: {
    color: "#555",
    flex: 1,
    fontSize: 14,
  },
  rowValue: {
    fontWeight: "600",
    color: "#1f9c8b",
    textAlign: "right",
    fontSize: 14,
  },
  techCard: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  techName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    color: "#2c3e50"
  },
  subSectionTitle: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#555"
  },
  chartContainer: {
    marginBottom: 16,
  },
  chartHeader: {
    marginBottom: 12,
    marginHorizontal: 0,
  },
  chartMainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    paddingHorizontal: 4,
  },
  filterContainer: {
    alignItems: 'flex-end',
  },
  timeFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9f8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1f2eb',
    minWidth: 130, // Ensure consistent width
  },
  timeFilterText: {
    fontSize: 14,
    color: '#1f9c8b',
    fontWeight: '600',
    marginRight: 4,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden', // Ensure content stays inside
  },
  chartStatsHeader: {
    flex: 1,
    marginRight: 16,
  },
  chartTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  chartStatItem: {
    marginBottom: 8,
  },
   chartStatLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 4,
    fontWeight: '500',
  },
  chartStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
  },
   growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartVisualization: {
    flexDirection: 'row',
    height: 240,
    marginBottom: 20,
  },
  yAxisContainer: {
    width: 60,
    justifyContent: 'space-between',
    paddingBottom: 30,
    paddingRight: 8,
  },
  yAxisLabel: {
    fontSize: 12,
    color: '#95a5a6',
    fontWeight: '500',
    textAlign: 'right',
  },
  chartBarsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e8e8e8',
    paddingLeft: 12,
    paddingRight: 4,
    paddingBottom: 30,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    position: 'relative',
    marginHorizontal: 2,
  },
  barTooltip: {
    position: 'absolute',
    top: -60,
    zIndex: 10,
  },
  tooltipContent: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipMonth: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
 tooltipRevenue: {
    color: '#1f9c8b',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  tooltipGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tooltipGrowthText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  revenueBar: {
    width: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  barGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 6,
  },
  barValue: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  xAxisLabel: {
    position: 'absolute',
    bottom: -25,
    fontSize: 12,
    color: '#95a5a6',
    fontWeight: '500',
  },
  currentMonthLabel: {
    color: '#1f9c8b',
    fontWeight: '700',
  },
  noChartData: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noChartDataText: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 12,
    fontWeight: '600',
  },
  noChartDataSubtext: {
    fontSize: 13,
    color: '#bdc3c7',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 45,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  dropdownItemActive: {
    backgroundColor: '#f0f9f8',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#1f9c8b',
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
  },
  selectedMonthCard: {
    margin: 20,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthInfo: {
    marginLeft: 12,
  },
  monthName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  monthRevenue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f9c8b',
  },
  monthStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  revenueTable: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e8e8e8',
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableRowSelected: {
    backgroundColor: '#f0f9f8',
    borderRadius: 8,
    marginVertical: 2,
  },
  tableCell: {
    fontSize: 14,
    color: '#555',
    textAlign: 'left',
    paddingHorizontal: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  closeModalButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f9c8b',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  closeModalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  overviewCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    position: 'relative',
    overflow: 'hidden',
  },
  overviewIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewContent: {
    flex: 1,
  },
  overviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },

  // If you want an even more premium look, add gradient backgrounds:
  overviewCardPremium: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    position: 'relative',
    overflow: 'hidden',
  },
  overviewCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  enhancedSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  enhancedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0f9f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  enhancedSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
  },
  sectionAction: {
    padding: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#1f9c8b',
    fontWeight: '600',
  },

  // SERVICE TYPE CARD STYLES
  serviceTypeGrid: {
    gap: 12,
  },
  serviceTypeCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  serviceTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceTypeInfo: {
    flex: 1,
  },
  serviceTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  serviceTypeMeta: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  serviceTypeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceTypeRevenue: {
    fontSize: 20,
    fontWeight: '700',
  },
  percentageBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#e8e8e8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // TECHNICIAN CARD STYLES
  techniciansList: {
    gap: 12,
  },
  technicianCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  technicianRank: {
    marginRight: 12,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rankText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  technicianInfo: {
    flex: 1,
  },
  technicianName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  technicianRole: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  technicianRevenue: {
    alignItems: 'flex-end',
  },
  revenueAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },

  // CUSTOMER CARD STYLES
  customersList: {
    gap: 12,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  customerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerMetaText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  customerRevenue: {
    alignItems: 'flex-end',
  },
  customerRevenueAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  revenueBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  revenueBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2c3e50',
  },

  // APPOINTMENT STATUS STYLES
  statusContainer: {
    gap: 20,
  },
  statusChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  pieChart: {
    flexDirection: 'row',
    height: 80,
    width: 80,
    borderRadius: 40,
    overflow: 'hidden',
    transform: [{ rotate: '-90deg' }],
  },
  pieSegment: {
    height: '100%',
  },
  statusStats: {
    alignItems: 'center',
  },
  statusTotal: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  statusList: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  statusName: {
    fontSize: 15,
    color: '#2c3e50',
    marginLeft: 8,
    flex: 1,
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    minWidth: 30,
    textAlign: 'right',
  },
  statusPercentage: {
    fontSize: 14,
    color: '#7f8c8d',
    minWidth: 50,
    textAlign: 'right',
  },

  // SERVICE DISTRIBUTION STYLES
  serviceDistribution: {
    gap: 12,
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  distributionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 7, // INCREASED from 2 to 3 for more text space
    marginRight: 8,
  },
  distributionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    flexShrink: 0, // Prevents icon from shrinking
  },
  distributionType: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2c3e50',
    flex: 1,
    flexShrink: 1, // Allows text to shrink if needed
  },
  distributionMiddle: {
    flex: 3, // INCREASED from 3 to maintain balance
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
    flex: 1.5, // REDUCED from flex: 1 to make room for text
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minWidth: 90, // Increased minimum width
    paddingLeft: 8,
  },
  distributionCount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    minWidth: 30, // Fixed width for count
    textAlign: 'center',
  },
  distributionPercentage: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 45, // Fixed width for percentage
    textAlign: 'right',
  },
});