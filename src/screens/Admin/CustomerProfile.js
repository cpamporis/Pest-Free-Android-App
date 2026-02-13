//Admin/CustomerProfile.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Image
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import apiService from "../../services/apiService";
import ReportScreen from "../Technician/ReportScreen";
import SwipeableVisitRow from '../../components/SwipeableVisitRow';
import pestfreeLogo from "../../../assets/pestfree_logo.png";

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

  useEffect(() => {
    if (!customerId) return;
    loadCustomer();
  }, [customerId]);

  async function loadCustomer() {
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

      let customerVisits = [];
      try {
        // DIRECT APPROACH: Get appointments and resolve their visits
        console.log("🔍 Fetching customer appointments...");
        const appointmentsRes = await apiService.request(
          "GET", 
          `/appointments/customer/${customerId}`
        );
        
        console.log("📥 Appointments response:", appointmentsRes);
        
        if (appointmentsRes?.success && Array.isArray(appointmentsRes.visits)) {
          console.log(`📊 Found ${appointmentsRes.visits.length} appointments`);
          
          // Resolve each appointment to a visit/report
          for (const appointment of appointmentsRes.visits) {
            try {
              const visitId = appointment.visitId || appointment.id;
              
              if (visitId) {
                console.log(`🔍 Looking for report for visit: ${visitId}`);
                
                // Try to get visit report
                const reportRes = await apiService.request(
                  "GET",
                  `/reports/visit/${visitId}`
                );
                
                if (reportRes?.success && reportRes.report) {
                  console.log(`✅ Found report for ${visitId}`);
                  customerVisits.push({
                    visitId: reportRes.report.visitId || visitId,
                    appointmentId: appointment.id || visitId,
                    serviceType: reportRes.report.serviceType || appointment.service_type || 'myocide',
                    startTime: reportRes.report.start_time || reportRes.report.service_start_time || appointment.appointment_date,
                    appointmentDate: reportRes.report.date || appointment.appointment_date,
                    technicianName: reportRes.report.technician_name || reportRes.report.technicianName || "N/A",
                    status: appointment.status || 'completed',
                    duration: reportRes.report.duration,
                    source: 'report'
                  });
                } else {
                  // Fallback: use appointment data
                  console.log(`⚠️ No report for ${visitId}, using appointment data`);
                  customerVisits.push({
                    visitId: visitId,
                    appointmentId: appointment.id,
                    serviceType: appointment.service_type || 'myocide',
                    startTime: appointment.appointment_date,
                    appointmentDate: appointment.appointment_date,
                    technicianName: "Technician not recorded",
                    status: appointment.status || 'completed',
                    duration: 0,
                    source: 'appointment'
                  });
                }
              }
            } catch (visitErr) {
              console.warn(`⚠️ Error processing appointment ${appointment.id}:`, visitErr.message);
            }
          }
        }
        
        console.log(`✅ Loaded ${customerVisits.length} visits from appointments`);
        
      } catch (err) {
        console.error("❌ Failed to load customer visits:", err.message);
      }

      // Remove duplicates and sort
      const uniqueVisitsMap = new Map();
      customerVisits.forEach(visit => {
        if (visit.visitId && !uniqueVisitsMap.has(visit.visitId)) {
          uniqueVisitsMap.set(visit.visitId, visit);
        }
      });

      const sortedVisits = Array.from(uniqueVisitsMap.values()).sort((a, b) => {
        const dateA = new Date(a.appointmentDate || a.startTime || 0);
        const dateB = new Date(b.appointmentDate || b.startTime || 0);
        return dateB - dateA;
      });

      console.log(`✅ Final: ${sortedVisits.length} visits for customer`);
      console.log("📊 Service types:", sortedVisits.map(v => v.serviceType));
      
      setVisits(sortedVisits);

      try {
        const revenue = await apiService.getRevenueByCustomer(customerId);
        setCustomerRevenue(revenue);
        console.log("💰 Customer revenue loaded:", revenue);
      } catch (err) {
        console.error("❌ Failed to load customer revenue:", err);
      }

    } catch (e) {
      console.error("❌ CustomerProfile load error:", e);
    } finally {
      setLoading(false);
    }
  }

  const handleVisitPress = (visit) => {
    console.log("📄 Opening report from CustomerProfile:", visit);
    
    setReportData({
      visitId: visit.visitId,
      serviceType: visit.serviceType || "myocide",
      customerName: profileCustomer?.customerName,
      technicianName: visit.technicianName || "N/A",
      appointmentId: visit.appointmentId
    });
    
    setShowReport(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f9c8b" />
          <Text style={styles.loadingText}>Loading customer profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ENTIRE CONTENT IS NOW SCROLLABLE */}
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
                console.log("🔙 Going back to CustomerProfile");
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
                    <Text style={styles.adminBadgeText}>CUSTOMER PROFILE</Text>
                  </View>
                </View>
              </View>

              <View style={styles.headerContent}>
                <Text style={styles.welcomeText}>Customer Details</Text>
                <Text style={styles.title}>{profileCustomer?.customerName || "Customer"}</Text>
                <Text style={styles.subtitle}>
                  View complete customer information and service history
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
                <Text style={styles.statLabel}>Maps</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <MaterialIcons name="location-pin" size={18} color="#1f9c8b" />
                </View>
                <Text style={styles.statNumber}>{stations.length}</Text>
                <Text style={styles.statLabel}>Stations</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                  <MaterialIcons name="history" size={18} color="#1f9c8b" />
                </View>
                <Text style={styles.statNumber}>{visits.length}</Text>
                <Text style={styles.statLabel}>Services</Text>
              </View>
            </View>

            {/* CUSTOMER REVENUE */}
            {customerRevenue && (
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <MaterialIcons name="euro" size={20} color="#2c3e50" />
                  <Text style={styles.sectionTitle}>Customer Revenue</Text>
                </View>
              </View>
            )}

            {customerRevenue && (
              <View style={styles.card}>
                <View style={styles.revenueGrid}>
                  
                  <View style={styles.revenueCard}>
                    <MaterialIcons name="euro" size={24} color="#1f9c8b" />
                    <Text style={styles.revenueValue}>
                      €{parseFloat(customerRevenue.total_revenue || 0).toFixed(2)}
                    </Text>
                    <Text style={styles.revenueLabel}>Total Revenue</Text>
                  </View>

                  <View style={styles.revenueCard}>
                    <MaterialIcons name="check-circle" size={24} color="#1f9c8b" />
                    <Text style={styles.revenueValue}>
                      {customerRevenue.appointment_count || 0}
                    </Text>
                    <Text style={styles.revenueLabel}>Completed Services</Text>
                  </View>

                </View>
              </View>
            )}

            {/* BASIC INFO */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons name="info" size={20} color="#2c3e50" />
                <Text style={styles.sectionTitle}>Customer Information</Text>
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
                      <Text style={styles.customerMetaText}>ID: {profileCustomer.customerId}</Text>
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
                <Text style={styles.sectionTitle}>Location Maps ({maps.length})</Text>
              </View>
            </View>

            {maps.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <MaterialIcons name="map" size={40} color="#ddd" />
                </View>
                <Text style={styles.emptyStateText}>No maps uploaded</Text>
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
                              Stations: {Array.isArray(map.stations) ? map.stations.length : 0}
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
                <Text style={styles.sectionTitle}>Stations Summary ({stations.length})</Text>
              </View>
            </View>

            {stations.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <MaterialIcons name="location-off" size={40} color="#ddd" />
                </View>
                <Text style={styles.emptyStateText}>No stations recorded</Text>
              </View>
            ) : (
              <View style={styles.card}>
                <View style={styles.stationsGrid}>
                  {["BS", "RM", "ST", "LT"].map(type => {
                    const count = stations.filter(s => s.type === type).length;
                    return (
                      <View key={type} style={styles.stationCard}>
                        <Text style={styles.stationType}>{type}</Text>
                        <Text style={styles.stationCount}>{count}</Text>
                        <Text style={styles.stationLabel}>
                          {type === 'BS' ? 'Bait Station' : 
                           type === 'RM' ? 'Rodent Monitor' : 
                           type === 'ST' ? 'Sticky Trap' : 
                           'Light Trap'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
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
                  <Text style={styles.sectionTitle}>Service History ({visits.length})</Text>
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
                {visits.length} service{visits.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {showServiceHistory && (
              <View style={styles.dropdownContent}>
                {visits.length === 0 ? (
                  <View style={[styles.emptyState, { marginHorizontal: 24 }]}>
                    <View style={styles.emptyIconContainer}>
                      <MaterialIcons name="assignment" size={40} color="#ddd" />
                    </View>
                    <Text style={styles.emptyStateText}>No services recorded</Text>
                  </View>
                ) : (
                  <View style={styles.dropdownListContainer}>
                    <ScrollView 
                      style={styles.dropdownScrollView}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                      {visits.map(visit => (
                        // UPDATED: Pass appointmentId as a prop
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
              <Text style={styles.footerText}>Customer Profile Display</Text>
              <Text style={styles.footerSubtext}>
                  Version 1.0 • Last updated: {new Date().toLocaleDateString()}
              </Text>
              <Text style={styles.footerCopyright}>
                  © {new Date().getFullYear()} Pest-Free. All rights reserved.
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
    flex: 1, // This will make it take available space
    marginLeft: 10, // Add some left margin
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
});