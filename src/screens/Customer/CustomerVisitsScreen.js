// CustomerVisitsScreen.js - FIXED VERSION
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Alert,
} from "react-native";
import apiService from "../../services/apiService";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import * as Sharing from "expo-sharing";
import * as FileSystem from 'expo-file-system/legacy';
import { formatTimeInGreece, formatDateInGreece } from "../../utils/timeZoneUtils";

export default function CustomerVisitsScreen({ 
  onSelectVisit, 
  onBack
  // REMOVE: navigation from props
}) {

  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visits, setVisits] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);

  const loadVisits = async () => {
    try {
      const res = await apiService.getCustomerVisitHistory();
      
      console.log("📋 API Response:", JSON.stringify(res, null, 2));
      
      if (res?.success) {
        let visits = res.visits || [];
        
        // CREATE A UNIQUE KEY FOR EACH ITEM
        const getItemKey = (item) => {
          const idFields = ['visitId', 'id', 'visit_id', 'log_id'];
          for (const field of idFields) {
            if (item[field]) return `${field}_${item[field]}`;
          }
          // Fallback to timestamp
          const timestamp = item.startTime || item.created_at || item.service_start_time;
          if (timestamp) {
            // Remove problematic characters
            return `time_${String(timestamp).replace(/[^a-zA-Z0-9]/g, '_')}`;
          }
          return null;
        };
        
        // REMOVE DUPLICATES
        const uniqueVisits = [];
        const seenKeys = new Set();
        
        visits.forEach((item, index) => {
          const key = getItemKey(item) || `index_${index}`;
          
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            // Add the key to the item for debugging
            item._key = key;
            uniqueVisits.push(item);
          } else {
            console.warn(`⚠️ Removed duplicate with key: ${key}`, item);
          }
        });
        
        console.log(`✅ Removed ${visits.length - uniqueVisits.length} duplicates`);
        console.log(`📊 Unique visits: ${uniqueVisits.length}`);
        
        // DEBUG: Log all unique items
        uniqueVisits.forEach((item, idx) => {
          console.log(`Unique ${idx}: key=${item._key}, service=${item.serviceType || item.service_type}, time=${item.startTime}`);
        });
        
        setVisits(uniqueVisits);
      } else {
        Alert.alert("Error", res?.error || "Failed to load visit history");
        setVisits([]);
      }
    } catch (error) {
      console.error("Load visits error:", error);
      Alert.alert("Error", "Failed to load visits");
      setVisits([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVisits();
  };

  const formatTime24WithSuffix = (dateString) => {
    if (!dateString) return "—";
    return formatTimeInGreece(dateString);
  };


  // Download PDF report
  const downloadPDFReport = async (visit) => {
    try {
      setDownloadingId(visit.visitId); // Use visit.visitId
      
      const reportId = visit.visitId; // Use visit.visitId
      
      if (!reportId) {
        Alert.alert("Error", "No report ID found for this visit");
        return;
      }
      
      const token = apiService.getCurrentToken();
      if (!token) {
        Alert.alert("Error", "Authentication required. Please login again.");
        return;
      }
      
      const dateStr = visit.startTime ? 
        new Date(visit.startTime).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0];
      
      const safeName = (visit.customer_name || visit.customerName || 'customer')
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/^_+|_+$/g, '');
      
      const fileName = `Service_Report_${safeName}_${dateStr}.pdf`;
      
      const API_BASE_URL = apiService.API_BASE_URL || "http://192.168.1.79:3000/api";
      const pdfUrl = `${API_BASE_URL}/reports/pdf/${reportId}`;
      
      console.log("📥 Downloading PDF:", {
        url: pdfUrl,
        serviceType: visit.serviceType || visit.workType,
        visitId: reportId
      });
      
      const downloadResult = await FileSystem.downloadAsync(
        pdfUrl,
        FileSystem.documentDirectory + fileName,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
      );
      
      console.log("✅ Download result:", {
        status: downloadResult.status,
        uri: downloadResult.uri
      });
      
      if (downloadResult.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: "application/pdf",
            dialogTitle: "Service Report",
            UTI: "com.adobe.pdf",
          });
        } else {
          Alert.alert(
            "Download Complete",
            `The PDF report has been downloaded to:\n${downloadResult.uri}`,
            [{ text: "OK" }]
          );
        }
      } else {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }
      
    } catch (error) {
      console.error("❌ PDF download error:", error);
      Alert.alert(
        "Download Failed",
        error.message || "The report could not be downloaded."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const generateUniqueKey = (item, index) => {
    // Try all possible ID fields
    const possibleIds = [
      item.visitId,
      item.id,
      item.visit_id,
      item.log_id,
      item.appointmentId,
      item.appointment_id
    ];
    
    for (const id of possibleIds) {
      if (id) return `key_${id}`;
    }
    
    // Generate a stable key using data properties
    const timestamp = item.startTime || item.created_at || item.service_start_time;
    if (timestamp) {
      return `key_${timestamp}_${index}`;
    }
    
    // Last resort: index-based with component mount time
    return `key_${index}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleViewDetails = (visit) => {
    console.log("🔍 handleViewDetails called with visit:", visit);

    const visitId = visit.visitId || visit.id || visit.visit_id;

    if (!visitId) {
      console.error("❌ No visitId found in visit object:", visit);
      Alert.alert("Error", "Could not find visit ID. Please try again.");
      return;
    }

    onSelectVisit({
      visit_id: visitId,
      service_type:
        visit.serviceType ||
        visit.work_type ||
        visit.workType ||
        "myocide",
      customerName:
        visit.customer_name ||
        visit.customerName ||
        "Customer",
      technicianName:
        visit.technicianName ||
        visit.technician_name ||
        "Technician",
      startTime:
        visit.startTime ||
        visit.start_time ||
        visit.created_at
    });
  };

  const renderVisitItem = ({ item }) => {
    // Debug time for non-myocide services
    if (item.serviceType && 
        !item.serviceType.includes('myocide') && 
        !item.serviceType.includes('scheduled')) {
      console.log("🔍 Visit time debug:", {
        serviceType: item.serviceType,
        startTime: item.startTime,
        formatted: formatTimeInGreece(item.startTime)
      });
    }

    return (
      <TouchableOpacity
        style={styles.visitCard}
        onPress={() => handleViewDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.visitHeader}>
          <View style={[styles.serviceTypeBadge, 
            { backgroundColor: getServiceColor(item.serviceType || item.workType) }]}>
            <MaterialIcons 
              name={getServiceIcon(item.serviceType || item.workType)} 
              size={12} 
              color="#fff" 
            />
            <Text style={styles.serviceTypeText}>
              {formatServiceType(item.serviceType || item.workType)}
            </Text>
          </View>
          <View style={styles.visitStatus}>
            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.statusText}>Completed</Text>
          </View>
        </View>

        <View style={styles.visitDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="calendar-today" size={16} color="#666" />
            <Text style={styles.detailText}>
              {/* UPDATE THIS LINE: */}
              {item.startTime 
                ? formatDateInGreece(item.startTime)
                : 'Date not available'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={16} color="#666" />
            <Text style={styles.detailText}>
              {/* UPDATE THIS LINE: */}
              {item.startTime
                ? formatTimeInGreece(item.startTime)
                : 'Time not available'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="person" size={16} color="#666" />
            <Text style={styles.detailText}>{item.technicianName || 'Technician'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="category" size={16} color="#666" />
            <Text style={styles.detailText}>
              Service: {formatServiceType(item.serviceType || item.workType)}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerActions}>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => handleViewDetails(item)}
            >
              <Text style={styles.viewButtonText}>View Report</Text>
              <MaterialIcons name="visibility" size={16} color="#1f9c8b" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => downloadPDFReport(item)}
              disabled={downloadingId === item.visitId}
            >
              {downloadingId === item.visitId ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="picture-as-pdf" size={16} color="#fff" />
                  <Text style={styles.downloadButtonText}>Download PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f9c8b" />
        <Text style={styles.loadingText}>Loading Visits...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onBack}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#1f9c8b" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>All Service Visits</Text>
          <Text style={styles.headerSubtitle}>
            Tap any visit to view full report
          </Text>
        </View>
        
        <View style={styles.headerStats}>
          <Text style={styles.visitsCount}>{visits.length}</Text>
          <Text style={styles.visitsLabel}>Total</Text>
        </View>
      </View>

      {/* INFO BANNER */}
      <View style={styles.infoBanner}>
        <MaterialIcons name="info" size={18} color="#1f9c8b" />
        <Text style={styles.infoText}>
          Tap "View Report" to see details or "Download PDF" to save
        </Text>
      </View>

      {/* CONTENT */}
      {visits.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="history" size={64} color="#e0e0e0" />
          <Text style={styles.emptyStateTitle}>No Visits Found</Text>
          <Text style={styles.emptyStateText}>
            There are no completed service visits to display yet.
          </Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <MaterialIcons name="refresh" size={18} color="#1f9c8b" />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(item, index) => generateUniqueKey(item, index)}
          renderItem={renderVisitItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#1f9c8b"]}
              tintColor="#1f9c8b"
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Service History</Text>
              <Text style={styles.listSubtitle}>
                All completed service visits
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ===== UPDATED HELPER FUNCTIONS =====
const getServiceColor = (serviceType) => {
  // All service types use the same beautiful blue-green color
  return '#1f9c8b';
};

const getServiceIcon = (serviceType) => {
  const type = String(serviceType || '').toLowerCase().trim();
  
  // Map service types to icons
  if (type.includes('myocide') || type.includes('scheduled')) {
    return 'pest-control-rodent'; // This is the computer mouse
    // OR for rodent mouse, you could use:
    // return 'mouse'; // This might be rodent mouse in some icon sets
  } else if (type.includes('disinfection')) {
    return 'clean-hands';
  } else if (type.includes('insecticide')) {
    return 'bug-report';
  } else if (type.includes('special')) {
    return 'star';
  } else if (type.includes('inspection')) {
    return 'search';
  } else if (type.includes('emergency')) {
    return 'exclamation-triangle';
  } else if (type.includes('installation')) {
    return 'tools';
  } else if (type.includes('follow-up') || type.includes('followup')) {
    return 'redo';
  }
  
  return 'clipboard-check';
};

const formatServiceType = (serviceType) => {
  const type = String(serviceType || '').toLowerCase().trim();
  
  // Map service types to display names
  if (type.includes('myocide') || type.includes('scheduled')) {
    return 'Myocide Service';
  } else if (type.includes('disinfection')) {
    return 'Disinfection Service';
  } else if (type.includes('insecticide')) {
    return 'Insecticide Service';
  } else if (type.includes('special')) {
    return 'Special Service';
  } else if (type.includes('inspection')) {
    return 'Inspection Service';
  } else if (type.includes('emergency')) {
    return 'Emergency Service';
  } else if (type.includes('installation')) {
    return 'Installation Service';
  } else if (type.includes('follow-up') || type.includes('followup')) {
    return 'Follow-up Service';
  } else if (type.includes('regular')) {
    return 'Regular Service';
  }
  
  // If we don't recognize it, capitalize it
  return type.charAt(0).toUpperCase() + type.slice(1) + ' Service';
};

// Styles remain the same as previous
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
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1f9c8b',
    fontWeight: '600',
    marginLeft: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  headerStats: {
    alignItems: 'center',
    paddingLeft: 16,
  },
  visitsCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f9c8b',
  },
  visitsLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 156, 139, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(31, 156, 139, 0.2)',
  },
  infoText: {
    fontSize: 13,
    color: '#1f9c8b',
    marginLeft: 8,
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  listHeader: {
    paddingVertical: 20,
    paddingHorizontal: 4,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  visitCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  serviceTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  visitStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  visitDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
    paddingVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 12,
    flex: 1,
  },
  cardFooter: {
    paddingTop: 16,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 156, 139, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  viewButtonText: {
    fontSize: 14,
    color: '#1f9c8b',
    fontWeight: '600',
    marginRight: 8,
    flex: 1,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f9c8b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 110,
    justifyContent: 'center',
  },
  downloadButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 156, 139, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#1f9c8b',
    fontWeight: '600',
    marginLeft: 8,
  },
});