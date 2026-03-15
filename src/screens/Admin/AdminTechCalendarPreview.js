// AdminTechCalendarPreview.js
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; 
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import apiService from "../../services/apiService";
import i18n from "../../services/i18n";

export default function AdminTechCalendarPreview() {
  const [appointments, setAppointments] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState(null);
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const CALENDAR_START_HOUR = 0;   
  const CALENDAR_END_HOUR = 24;
  const timeScrollRef = useRef(null);
  const [timeScrollReady, setTimeScrollReady] = useState(false);
  const didAutoScrollRef = useRef(false);
  const TIME_ROW_HEIGHT = 70;
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [customers, setCustomers] = useState([]);
  const appointmentCategories = [
    { id: "first_time", label: i18n.t("admin.schedule.appointmentCategory.first_time") },
    { id: "follow_up", label: i18n.t("admin.schedule.appointmentCategory.follow_up") },
    { id: "one_time", label: i18n.t("admin.schedule.appointmentCategory.one_time") },
    { id: "installation", label: i18n.t("admin.schedule.appointmentCategory.installation") },
    { id: "inspection", label: i18n.t("admin.schedule.appointmentCategory.inspection") },
    { id: "emergency", label: i18n.t("admin.schedule.appointmentCategory.emergency") },
    { id: "contract_service", label: i18n.t("admin.schedule.appointmentCategory.contract_service") },
  ];
  const horizontalScrollRef = useRef(null);

  useEffect(() => {
    loadTechnicians();
    loadCustomers();
  }, []);

  useEffect(() => {
    didAutoScrollRef.current = false;
  }, [selectedTech, weekStart]);

  useEffect(() => {
    if (!selectedTech) return;
    loadAppointments();
  }, [selectedTech, weekStart]);

  useEffect(() => {
    if (loading) return;
    if (!timeScrollReady) return;
    if (!timeScrollRef.current) return;
    if (didAutoScrollRef.current) return;

    const todayStr = formatDateLocal(new Date());

    const todaysAppointments = visibleAppointments.filter(a => {
      const d = a.appointment_date || a.date;
      return d === todayStr;
    });

    const firstHour = getFirstAppointmentHour(
      todaysAppointments.length ? todaysAppointments : visibleAppointments
    );

    // Scroll horizontally to today's column
    const today = new Date();
    const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const DAY_COLUMN_WIDTH = 110;

    horizontalScrollRef.current?.scrollTo({
      x: todayIndex * DAY_COLUMN_WIDTH,
      animated: false
    });

    if (firstHour === null) return;

    const scrollIndex = Math.max(firstHour - CALENDAR_START_HOUR, 0);
    const yOffset = scrollIndex * TIME_ROW_HEIGHT;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        timeScrollRef.current?.scrollTo({ y: yOffset, animated: false });
        didAutoScrollRef.current = true;
      });
    });
  }, [loading, timeScrollReady, visibleAppointments]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load technicians
      const techs = await apiService.getTechnicians();
      const techList = Array.isArray(techs) ? techs : techs?.technicians || [];
      
      const formattedTechs = techList.map(t => ({
        id: t.id || t.technicianId,
        name: `${t.firstName || ""} ${t.lastName || ""}`.trim() || t.username || "Technician"
      }));
      
      setTechnicians(formattedTechs);
      if (!selectedTech && formattedTechs.length) {
        setSelectedTech(formattedTechs[0].id);
      }

      // Load appointments
      const from = formatDateLocal(weekStart);
      const to = formatDateLocal(addDays(weekStart, 6));

      const appts = await apiService.getAppointments({
        dateFrom: from,
        dateTo: to,
        technicianId: selectedTech
      });

      const appointmentsArray = Array.isArray(appts) ? appts : appts?.appointments || [];
      const normalized = appointmentsArray.map(a => ({
        ...a,
        appointmentCategory:
          a.appointmentCategory ?? a.appointment_category ?? null,
        serviceType: a.serviceType ?? a.service_type ?? null,
        specialServiceSubtype: 
          a.specialServiceSubtype ?? a.special_service_subtype ?? null,
        // For ALL service types except 'special', otherPestName should contain admin's details
        otherPestName: 
          a.otherPestName ?? a.other_pest_name ?? null,
        disinfection_details: a.disinfection_details ?? null,
        insecticideDetails: 
          a.insecticideDetails ?? a.insecticide_details ?? null,
        // Keep original description for reference
        description: a.description ?? null,
      }));

      setAppointments(normalized);

    } catch (error) {
      console.error("Calendar load error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTechnicians = async () => {
    try {
        const techs = await apiService.getTechnicians();
        const techList = Array.isArray(techs) ? techs : techs?.technicians || [];

        const formattedTechs = techList.map(t => ({
        id: t.id || t.technicianId,
        name:
            `${t.firstName || ""} ${t.lastName || ""}`.trim() ||
            t.username ||
            "Technician"
        }));

        setTechnicians(formattedTechs);


        // 🔥 CRITICAL: set selectedTech ONCE, immediately
        if (formattedTechs.length && !selectedTech) {
        setSelectedTech(formattedTechs[0].id);
        }
    } catch (e) {
        console.error("Failed to load technicians", e);
    }
  };

  const loadCustomers = async () => {
    try {
      const result = await apiService.getCustomers();

      const list = Array.isArray(result)
        ? result.map(c => ({
            id: c.customerId || c.id,
            name: c.customerName || c.name,
            phone: c.telephone || null,
            address: c.address,
            complianceValidUntil:
              c.complianceValidUntil ||
              c.compliance_valid_until ||
              null
          }))
        : [];

      setCustomers(list);
    } catch (e) {
      console.error('Failed to load customers', e);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);

      const from = formatDateLocal(weekStart);
      const to = formatDateLocal(addDays(weekStart, 6));

      const appts = await apiService.getAppointments({
        dateFrom: from,
        dateTo: to,
        technicianId: selectedTech
      });

      const appointmentsArray = Array.isArray(appts)
        ? appts
        : appts?.appointments || [];
      

      const normalized = appointmentsArray.map(a => ({
        ...a,
        appointmentCategory:
          a.appointmentCategory ?? a.appointment_category ?? null,
        serviceType: a.serviceType ?? a.service_type ?? null,
        specialServiceSubtype: 
          a.specialServiceSubtype ?? a.special_service_subtype ?? null,
        otherPestName: 
          a.otherPestName ?? a.other_pest_name ?? null,
        disinfection_details: a.disinfection_details ?? null,
        insecticideDetails: 
          a.insecticideDetails ?? a.insecticide_details ?? null,
      }));

      setAppointments(normalized);

    } catch (error) {
      console.error("Calendar load error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getServiceDetails = (appointment) => {
    if (!appointment) return '—';
    
    const serviceType = 
      appointment.serviceType || 
      appointment.service_type || 
      '';
    
    // For SPECIAL SERVICE: Use customer's otherPestName (this is what customer typed in home screen)
    if (serviceType === 'special') {
      const subtype = appointment.specialServiceSubtype || appointment.special_service_subtype;
      if (subtype === 'other') {
        // For "other" special services, use the customer's description
        return appointment.otherPestName || 
              appointment.other_pest_name || 
              appointment.description || 
              '—';
      }
      return getSpecialServiceLabel(subtype) || subtype || '—';
    }
    
    // For INSECTICIDE and DISINFECTION: Use admin's typed details (from appointment creation or later edits)
    if (serviceType === 'insecticide') {
      // Priority: 1) insecticideDetails, 2) otherPestName (both set by admin), 3) description (customer)
      return appointment.insecticideDetails ||
            appointment.insecticide_details ||
            appointment.otherPestName || 
            appointment.other_pest_name ||
            appointment.description ||
            '—';
    }
    
    if (serviceType === 'disinfection') {
      // Priority: 1) disinfection_details, 2) otherPestName (both set by admin), 3) description (customer)
      return appointment.disinfection_details ||
            appointment.otherPestName || 
            appointment.other_pest_name ||
            appointment.description ||
            '—';
    }
    
    // For MYOCIDE and others: Use admin's typed details or default
    return appointment.otherPestName || 
          appointment.other_pest_name || 
          appointment.description || 
          '—';
  };

const getSpecialServiceLabel = (subtype) => {
  const labels = {
    'grass_cutworm': i18n.t("admin.schedule.specialSubtypes.grass_cutworm"),
    'fumigation': i18n.t("admin.schedule.specialSubtypes.fumigation"),
    'termites': i18n.t("admin.schedule.specialSubtypes.termites"),
    'exclusion': i18n.t("admin.schedule.specialSubtypes.exclusion"),
    'snake_repulsion': i18n.t("admin.schedule.specialSubtypes.snake_repulsion"),
    'bird_control': i18n.t("admin.schedule.specialSubtypes.bird_control"),
    'bed_bugs': i18n.t("admin.schedule.specialSubtypes.bed_bugs"),
    'fleas': i18n.t("admin.schedule.specialSubtypes.fleas"),
    'plant_protection': i18n.t("admin.schedule.specialSubtypes.plant_protection"),
    'palm_weevil': i18n.t("admin.schedule.specialSubtypes.palm_weevil"),
    'other': i18n.t("admin.schedule.specialSubtypes.other")
  };
  return labels[subtype] || subtype;
};

  const handlePreviousWeek = () => {
    const newWeekStart = addDays(weekStart, -7);
    setWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    const newWeekStart = addDays(weekStart, 7);
    setWeekStart(newWeekStart);
  };

  const handleToday = () => {
    setWeekStart(getWeekStart(new Date()));
  };

  const visibleAppointments = appointments.filter(a => {
    const time = getApptTime(a);
    if (!time) return false;

    const hour = parseInt(String(time).split(":")[0], 10);
    return Number.isFinite(hour) && hour >= CALENDAR_START_HOUR && hour < CALENDAR_END_HOUR;
  });

  const getTechnicianName = (appointment) => {
    if (!appointment) return '—';

    const techId =
      appointment.technicianId ||
      appointment.technician_id ||
      appointment.technician ||
      null;

    if (!techId) {
      return appointment.technician_username || '—';
    }

    const tech = technicians.find(
      t => String(t.id) === String(techId)
    );

    return tech?.name || appointment.technician_username || '—';
  };

  const getCustomerLabel = (a) => {
    if (!a) return '—';

    const customerId = a.customerId || a.legacyCustomerKey;

    const customer = customers.find(c => c.id === customerId);

    return (
      customer?.name ||
      a.customer_name ||
      a.customerName ||
      'Unknown Customer'
    );
  };

  const DetailRow = ({ label, children }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, color: '#777', fontWeight: '600' }}>
        {label}
      </Text>
      <Text style={{ fontSize: 14, color: '#333', marginTop: 2 }}>
        {children}
      </Text>
    </View>
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "#1f9c8b";
      case "scheduled":  
        return "#1E88E5";
      case "cancelled":
        return "#bdc3c7";
      default:
        return "#F44336";
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return i18n.t("status.completed");
      case "scheduled":
        return i18n.t("status.scheduled");
      case "cancelled":
        return i18n.t("status.cancelled");
      default:
        return i18n.t("status.unknown") || "Unknown";
    }
  };

  const getServiceLabel = (serviceType, specialSubtype, otherPestName) => {
  switch (serviceType) {
    case 'myocide':
      return i18n.t("serviceTypes.myocide");
    case 'insecticide':
      return i18n.t("serviceTypes.insecticide");
    case 'disinfection':
      return i18n.t("serviceTypes.disinfection");
    case 'special':
      if (!specialSubtype) return i18n.t("serviceTypes.special");
      
      const subtypeLabels = {
        'grass_cutworm': i18n.t("admin.schedule.specialSubtypes.grass_cutworm"),
        'fumigation': i18n.t("admin.schedule.specialSubtypes.fumigation"),
        'termites': i18n.t("admin.schedule.specialSubtypes.termites"),
        'exclusion': i18n.t("admin.schedule.specialSubtypes.exclusion"),
        'snake_repulsion': i18n.t("admin.schedule.specialSubtypes.snake_repulsion"),
        'bird_control': i18n.t("admin.schedule.specialSubtypes.bird_control"),
        'bed_bugs': i18n.t("admin.schedule.specialSubtypes.bed_bugs"),
        'fleas': i18n.t("admin.schedule.specialSubtypes.fleas"),
        'plant_protection': i18n.t("admin.schedule.specialSubtypes.plant_protection"),
        'palm_weevil': i18n.t("admin.schedule.specialSubtypes.palm_weevil"),
        'other': otherPestName ? `${i18n.t("admin.schedule.specialSubtypes.other")}: ${otherPestName}` : i18n.t("admin.schedule.specialSubtypes.other")
      };
      
      return subtypeLabels[specialSubtype] || specialSubtype;
    default:
      return serviceType || '—';
  }
};

  const getCustomerPhone = (appointment) => {
    if (!appointment) return '—';

    const customerId = appointment.customerId || appointment.legacyCustomerKey;
    const customer = customers.find(c => c.id === customerId);

    return customer?.phone || '—';
  };

  const getLastCompletedVisit = (appointment) => {
    if (!appointment) return null;

    const customerId = appointment.customerId || appointment.legacyCustomerKey;
    if (!customerId) return null;

    const completed = appointments
      .filter(a =>
        (a.customerId === customerId || a.legacyCustomerKey === customerId) &&
        a.status === 'completed' &&
        a.date
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return completed[0] || null;
  };

  const getComplianceStatus = (appointment) => {
    const customerId = appointment?.customerId || appointment?.legacyCustomerKey;
    const customer = customers.find(c => c.id === customerId);

    if (!customer?.complianceValidUntil) {
      return { status: 'unknown', label: i18n.t("admin.calendar.compliance.unknown") };
    }

    const validUntil = new Date(customer.complianceValidUntil);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (validUntil >= today) {
      return { status: 'valid', label: i18n.t("admin.calendar.compliance.valid") };
    }   

    return { status: 'expired', label: i18n.t("admin.calendar.compliance.expired") };
  };

  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function formatDateLocal(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getApptTime(a) {
    return (
        a.appointment_time ||
        a.time ||
        a.scheduledTime ||
        a.scheduled_time ||
        ""
    );
  }  

  function getFirstAppointmentHour(appts) {
    if (!Array.isArray(appts) || appts.length === 0) return null;

    const hours = appts
        .map(a => {
        const t = getApptTime(a);
        if (!t) return null;
        const h = parseInt(String(t).split(":")[0], 10);
        return Number.isFinite(h) ? h : null;
        })
        .filter(h => h !== null)
        .sort((a, b) => a - b);

    return hours.length ? hours[0] : null;
  }

  function formatTimeHHMM(time) {
    if (!time) return "";

    // Handles: "09:30", "09:30:00", "09:30:00.000Z"
    const match = time.match(/^(\d{1,2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : time;
  }

  function formatDatePretty(dateStr) {
    if (!dateStr) return '—';

    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  function getAppointmentCategoryLabel(categoryId) {
    const cat = appointmentCategories.find(c => c.id === categoryId);
    return cat?.label || '—';
  }

  const HOURS = Array.from(
    { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR },
    (_, i) => i + CALENDAR_START_HOUR
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f9c8b" />
        <Text style={styles.loadingText}>{i18n.t("admin.calendar.loading")}</Text>
      </SafeAreaView>
    );
  }

    return (
    <View style={styles.container}>
      {/* Fixed header section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.brandContainer}>
            <View style={styles.badge}>
              <MaterialIcons name="calendar-view-week" size={14} color="#fff" />
              <Text style={styles.badgeText}>{i18n.t("admin.calendar.header.badge")}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.subtitle}>
            {i18n.t("admin.calendar.header.subtitle")}
          </Text>
        </View>

        {/* WEEK NAVIGATION */}
        <View style={styles.weekNavigation}>
          <View style={styles.weekNavSide}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={handlePreviousWeek}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chevron-left" size={20} color="#fff" />
              <Text style={styles.navButtonText}>{i18n.t("admin.calendar.navigation.prev")}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekNavCenter}>
            <TouchableOpacity
              style={styles.currentWeekButton}
              onPress={handleToday}
              activeOpacity={0.7}
            >
              <MaterialIcons name="today" size={16} color="#fff" />
              <Text style={styles.currentWeekText} numberOfLines={1}>
                {i18n.t("admin.calendar.navigation.weekOf", {
                  start: weekStart.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  }),
                  end: addDays(weekStart, 6).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                })}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekNavSide}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={handleNextWeek}
              activeOpacity={0.7}
            >
              <Text style={styles.navButtonText}>{i18n.t("admin.calendar.navigation.next")}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Scrollable top section */}
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* TECHNICIAN FILTER */}
        <View style={styles.sectionHeader}>
          <MaterialIcons name="filter-alt" size={20} color="#2c3e50" />
          <Text style={styles.sectionTitle}>{i18n.t("admin.calendar.filter.title")}</Text>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.technicianFilter}
          contentContainerStyle={styles.technicianFilterContent}
        >
          {technicians.map(tech => (
            <TouchableOpacity
              key={tech.id}
              style={[
                styles.techChip,
                selectedTech === tech.id && styles.techChipActive
              ]}
              onPress={() => setSelectedTech(tech.id)}
              activeOpacity={0.7}
            >
              <FontAwesome5 
                name="user-cog" 
                size={14} 
                color={selectedTech === tech.id ? "#fff" : "#1f9c8b"} 
              />
              <Text 
                style={[
                  styles.techChipText,
                  selectedTech === tech.id && styles.techChipTextActive
                ]}
                numberOfLines={1}
              >
                {tech.name}
              </Text>
              {selectedTech === tech.id && (
                <MaterialIcons name="check" size={14} color="#fff" style={styles.techCheck} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* STATUS LEGEND */}
        <View style={styles.sectionHeader}>
          <MaterialIcons name="legend-toggle" size={20} color="#2c3e50" />
          <Text style={styles.sectionTitle}>{i18n.t("admin.calendar.legend.title")}</Text>
        </View>

        <View style={styles.legendContainer}>
          {['scheduled', 'completed', 'cancelled'].map(status => (
            <View key={status} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: getStatusColor(status) }]} />
              <Text style={styles.legendText}>{getStatusLabel(status)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Fixed height calendar section */}
      <View style={styles.calendarSection}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="grid-view" size={20} color="#2c3e50" />
          <Text style={styles.sectionTitle}>{i18n.t("admin.calendar.schedule.title")}</Text>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#1f9c8b" />
            ) : (
              <MaterialIcons name="refresh" size={18} color="#1f9c8b" />
            )}
          </TouchableOpacity>
        </View>

        {/* CALENDAR GRID */}
        <View style={styles.calendarWrapper}>
          <ScrollView 
            ref={horizontalScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={true}
            style={styles.calendarHorizontalScroll}
            contentContainerStyle={styles.calendarHorizontalContent}
          >
            <View style={styles.calendarGrid}>
              {/* DAY HEADERS */}
              <View style={styles.dayHeaders}>
                <View style={styles.timeColumnHeader}>
                  <Text style={styles.columnHint}>{i18n.t("admin.calendar.schedule.time")}</Text>
                </View>
                
                {/* Day columns */}
                {Array.from({ length: 7 }).map((_, i) => {
                  const day = addDays(weekStart, i);
                  const isToday = formatDateLocal(new Date()) === formatDateLocal(day);
                  
                  return (
                    <View 
                      key={i} 
                      style={[
                        styles.dayColumn,
                        isToday && styles.todayColumn
                      ]}
                    >
                      <Text style={styles.dayName}>
                        {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                      </Text>
                      <Text style={[
                        styles.dayDate,
                        isToday && styles.todayDate
                      ]}>
                        {day.getDate()}
                      </Text>
                      <Text style={styles.dayMonth}>
                        {day.toLocaleDateString('en-US', { month: 'short' })}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* TIME SLOTS */}
              <ScrollView 
                ref={timeScrollRef}
                style={styles.timeSlotsScroll}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                onLayout={() => setTimeScrollReady(true)}
              >
                {HOURS.map(hour => (
                  <View key={hour} style={styles.timeRow}>
                    {/* Time label */}
                    <View style={styles.timeLabel}>
                      <Text style={styles.timeText}>
                        {hour.toString().padStart(2, '0')}:00
                      </Text>
                    </View>

                    {/* Day cells */}
                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                      const cellDate = formatDateLocal(addDays(weekStart, dayIndex));
                      const cellAppointments = visibleAppointments.filter(a => {
                        const appointmentDate = a.appointment_date || a.date;
                        const appointmentTime = a.appointment_time || a.time;
                        return appointmentDate === cellDate && 
                                parseInt(appointmentTime?.split(":")[0], 10) === hour
                      });

                      return (
                        <View 
                          key={dayIndex} 
                          style={[
                            styles.timeCell,
                            dayIndex < 6 && styles.cellBorderRight
                          ]}
                        >
                          {cellAppointments.map((appointment, idx) => {
                            const statusColor = getStatusColor(appointment.status);
                            return (
                              <TouchableOpacity
                                key={idx}
                                style={[
                                  styles.appointmentBlock,
                                  { backgroundColor: statusColor }
                                ]}
                                activeOpacity={0.8}
                                onPress={() =>
                                  setSelectedAppointment({
                                    ...appointment,
                                    appointmentCategory:
                                      appointment.appointmentCategory ??
                                      appointment.appointment_category ??
                                      null,
                                  })
                                }
                              >
                                <Text style={styles.appointmentCustomer} numberOfLines={1}>
                                  {getCustomerLabel(appointment)}
                                </Text>
                                <Text style={styles.appointmentService} numberOfLines={1}>
                                  {getServiceLabel(appointment.serviceType)}
                                </Text>
                                <Text style={styles.appointmentTime}>
                                  {formatTimeHHMM(getApptTime(appointment))}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
          
          {/* SCROLL HINT */}
          <View style={styles.scrollHintContainer}>
            <MaterialIcons name="swipe" size={16} color="#666" />
            <Text style={styles.scrollHint}>
              {i18n.t("admin.calendar.schedule.scrollHint")}
            </Text>
          </View>
        </View>

        {/* STATISTICS */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{appointments.length}</Text>
            <Text style={styles.statLabel}>{i18n.t("admin.calendar.stats.total")}</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {appointments.filter(a => a.status === 'scheduled').length}
            </Text>
            <Text style={styles.statLabel}>{i18n.t("admin.calendar.stats.scheduled")}</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {appointments.filter(a => a.status === 'completed').length}
            </Text>
            <Text style={styles.statLabel}>{i18n.t("admin.calendar.stats.completed")}</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {appointments.filter(a => a.status === 'cancelled').length}
            </Text>
            <Text style={styles.statLabel}>{i18n.t("admin.calendar.stats.cancelled")}</Text>
          </View>
        </View>
      </View>

      {/* Modal */}
      <Modal
        visible={!!selectedAppointment}
        transparent
        animationType="fade"
      >
        {selectedAppointment && (
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedAppointment(null)}
          >
            <View style={styles.detailsCard}>
              {(() => {
                const compliance = getComplianceStatus(selectedAppointment);
                const colors = {
                  valid: '#1f9c8b',
                  expired: '#F44336',
                  unknown: '#9E9E9E'
                };

                return (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: colors[compliance.status],
                      marginBottom: 8
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                      {compliance.label}
                    </Text>
                  </View>
                );
              })()}

              <Text style={styles.detailsTitle}>{i18n.t("admin.calendar.appointmentDetails.title")}</Text>

              <DetailRow label={i18n.t("admin.calendar.appointmentDetails.date")}>
                {formatDatePretty(selectedAppointment?.date)}
              </DetailRow>

              <DetailRow label={i18n.t("admin.calendar.appointmentDetails.time")}>
                {formatTimeHHMM(selectedAppointment?.time)}
              </DetailRow>

              <DetailRow label={i18n.t("admin.calendar.appointmentDetails.customer")}>
                {getCustomerLabel(selectedAppointment)}
              </DetailRow>

              <DetailRow label={i18n.t("admin.calendar.appointmentDetails.telephone")}>
                {getCustomerPhone(selectedAppointment)}
              </DetailRow>

              <DetailRow label={i18n.t("admin.calendar.appointmentDetails.address")}>
                {(() => {
                  const customerId =
                    selectedAppointment?.customerId ||
                    selectedAppointment?.legacyCustomerKey;

                  const customer = customers.find(c => c.id === customerId);

                  return customer?.address || '—';
                })()}
              </DetailRow>

              {(() => {
                const lastVisit = getLastCompletedVisit(selectedAppointment);
                if (!lastVisit) return null;

                return (
                  <DetailRow label={i18n.t("admin.calendar.appointmentDetails.lastVisit")}>
                    {formatDatePretty(lastVisit.date)}
                    {" • "}
                    {getServiceLabel(lastVisit.serviceType)}
                  </DetailRow>
                );
              })()}

              <DetailRow label={i18n.t("admin.calendar.appointmentDetails.serviceType")}>
                {getServiceLabel(
                  selectedAppointment?.serviceType,
                  selectedAppointment?.specialServiceSubtype,
                  selectedAppointment?.otherPestName
                )}
              </DetailRow>

              <DetailRow label={i18n.t("admin.calendar.appointmentDetails.category")}>
                {getAppointmentCategoryLabel(selectedAppointment.appointmentCategory)}
              </DetailRow>

              <DetailRow label={i18n.t("admin.calendar.appointmentDetails.technician")}>
                {getTechnicianName(selectedAppointment)}
              </DetailRow>

              {/* SPECIAL SERVICE */}
              {selectedAppointment?.serviceType === 'special' && (
                <DetailRow label={i18n.t("admin.calendar.appointmentDetails.specialService")}>
                  {getServiceDetails(selectedAppointment)}
                </DetailRow>
              )}

              {/* INSECTICIDE */}
              {selectedAppointment?.serviceType === 'insecticide' && (
                <DetailRow label={i18n.t("admin.calendar.appointmentDetails.insecticideDetails")}>
                  {getServiceDetails(selectedAppointment)}
                </DetailRow>
              )}

              {/* DISINFECTION */}
              {selectedAppointment?.serviceType === 'disinfection' && (
                <DetailRow label={i18n.t("admin.calendar.appointmentDetails.disinfectionDetails")}>
                  {getServiceDetails(selectedAppointment)}
                </DetailRow>
              )}

              <TouchableOpacity
                style={styles.closeDetailsButton}
                onPress={() => setSelectedAppointment(null)}
              >
                <Text style={styles.closeDetailsText}>{i18n.t("admin.calendar.appointmentDetails.close")}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
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
  
  // HEADER
  header: {
    backgroundColor: "#1f9c8b",
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    fontFamily: 'System',
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
    fontFamily: 'System',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  headerContent: {
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.85,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
    fontFamily: 'System',
  },
  
  // WEEK NAVIGATION
  weekNavigation: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "rgba(255, 255, 255, 0.15)",
  borderRadius: 12,
  paddingVertical: 10,
  paddingHorizontal: 8,
},
weekNavSide: {
  width: 70,
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "stretch",
},

weekNavCenter: {
  flex: 1,
  alignItems: "center",
},

  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 3.5,
    paddingVertical: 3.5,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    zIndex: 2,
  },
  navButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: 'System',
    marginHorizontal: 4,
  },
  currentWeekButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255, 255, 255, 0.25)",
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 10,
  maxWidth: 260,
},

  currentWeekText: {
  color: "#fff",
  fontSize: 13,
  fontWeight: "600",
  marginLeft: 6,
  textAlign: "center",
},
  
  // SECTIONS
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
    marginHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginLeft: 8,
    fontFamily: 'System',
  },
  refreshButton: {
    marginLeft: 'auto',
    padding: 6,
  },
  
  // TECHNICIAN FILTER
  technicianFilter: {
    marginHorizontal: 24,
    marginBottom: 8,
  },
  technicianFilterContent: {
    paddingRight: 24,
  },
  techChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  techChipActive: {
    backgroundColor: "#1f9c8b",
    borderColor: "#1f9c8b",
    shadowColor: "#1f9c8b",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  techChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginLeft: 6,
    fontFamily: 'System',
    maxWidth: 120,
  },
  techChipTextActive: {
    color: "#fff",
  },
  techCheck: {
    marginLeft: 6,
  },
  
  // LEGEND
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#fff",
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: "#666",
    fontFamily: 'System',
  },
  
  // SCROLL CONTAINERS
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  
  // CALENDAR WRAPPER (replaces calendarContainer)
  calendarWrapper: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  
  calendarHorizontalScroll: {
    flex: 1,
  },
  
  calendarHorizontalContent: {
    minWidth: 1000, // Force horizontal scrolling
  },
  
  calendarGrid: {
    minWidth: 1000, // Make sure all days fit
  },
  
  dayHeaders: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fafafa",
  },
  
  timeColumnHeader: {
    width: 70,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  
  dayColumn: {  // Changed from dayHeader to dayColumn
    width: 130, // Fixed width for each day column
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#f0f0f0",
  },
  
  todayColumn: {  // Changed from todayHeader to todayColumn
    backgroundColor: "rgba(31, 156, 139, 0.1)",
  },
  
  columnHint: {
    fontSize: 10,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    fontFamily: 'System',
  },
  
  dayName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1f9c8b",
    textTransform: "uppercase",
    fontFamily: 'System',
    marginBottom: 2,
  },
  
  dayDate: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    fontFamily: 'System',
  },
  
  todayDate: {
    color: "#1f9c8b",
  },
  
  dayMonth: {
    fontSize: 13,
    color: "#666",
    fontFamily: 'System',
    marginTop: 2,
  },
  
  timeSlotsScroll: {
    height: 500, // Fixed height for vertical scrolling
  },
  
  timeRow: {
    flexDirection: "row",
    minHeight: 70,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f9fa",
  },
  
  timeLabel: {
    width: 70,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#f0f0f0",
    backgroundColor: "#fafafa",
  },
  
  timeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    fontFamily: 'System',
  },
  
  timeCell: {
    width: 130, // Same as dayColumn width
    padding: 4,
    backgroundColor: "#fff",
    minHeight: 68,
  },
  
  cellBorderRight: {
    borderRightWidth: 1,
    borderRightColor: "#f8f9fa",
  },
  
  appointmentBlock: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  appointmentCustomer: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    fontFamily: 'System',
    marginBottom: 2,
  },
  
  appointmentService: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.9)",
    fontFamily: 'System',
    marginBottom: 2,
  },
  
  appointmentTime: {
    fontSize: 9,
    color: "rgba(255, 255, 255, 0.8)",
    fontFamily: 'System',
  },
  
  // SCROLL HINT
  scrollHintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  
  scrollHint: {
    fontSize: 12,
    color: "#666",
    fontFamily: 'System',
    marginLeft: 6,
    textAlign: "center",
  },
  
  // STATISTICS
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f9c8b",
    fontFamily: 'System',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#666",
    fontFamily: 'System',
  },
  detailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginTop: '30%',
    borderRadius: 16,
    padding: 20,
    elevation: 6,
  },

  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1f9c8b',
  },

  closeDetailsButton: {
    marginTop: 20,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#1f9c8b',
    borderRadius: 20,
  },

  closeDetailsText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  appointmentCategory: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.85,
    fontWeight: '600',
  },
  calendarSection: {
  flex: 1,
  backgroundColor: '#f8f9fa',
  paddingTop: 8,
},

scrollContainer: {
  maxHeight: '35%',
},

calendarWrapper: {
  marginHorizontal: 24,
  marginBottom: 16,
  backgroundColor: "#fff",
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#f0f0f0",
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 3,
  overflow: "hidden",
  height: 400,
},
});