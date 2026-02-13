// components/SwipeableVisitRow.js - UPDATED
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { MaterialIcons } from '@expo/vector-icons';
import apiService from '../services/apiService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function SwipeableVisitRow({ 
  visit, 
  onPress,
  customerName,
  isNested = false,
  appointmentId
}) {
  const swipeableRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isAlertVisible, setIsAlertVisible] = useState(false); // Track alert visibility
  
  const handleDownloadPDF = async () => {
    // Close swipeable first
    swipeableRef.current?.close();
    
    // Set alert as visible
    setIsAlertVisible(true);
    
    Alert.alert(
      "Download Report",
      `Download PDF report for ${visit.serviceType || 'service'}?`,
      [
        { 
          text: "Cancel", 
          style: "cancel", 
          onPress: () => {
            setIsAlertVisible(false);
            console.log("❌ Download cancelled by user");
          }
        },
        { 
          text: "Download", 
          style: "default",
          onPress: async () => {
            if (isAlertVisible) {
              setIsAlertVisible(false);
              try {
                await downloadPDF();
              } catch (error) {
                console.error("❌ Download error:", error);
              }
            }
          }
        }
      ],
      {
        // Add onDismiss callback for when alert is dismissed by tapping outside
        onDismiss: () => {
          setIsAlertVisible(false);
          console.log("❌ Alert dismissed (tapped outside)");
        }
      }
    );
  };

  const downloadPDF = async () => {
    // Double-check we're not already downloading
    if (isDownloading) {
      console.log("⚠️ Download already in progress");
      return;
    }
    
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      console.log("📥 Starting PDF download for:", visit.visitId);
      
      const token = apiService.getCurrentToken();
      const customerNameSlug = customerName 
        ? customerName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        : 'customer';
      const serviceType = visit.serviceType || 'service';
      const filename = `report_${customerNameSlug}_${serviceType}_${visit.visitId.substring(0, 8)}.pdf`;
      
      const url = `${apiService.API_BASE_URL}/reports/pdf/${visit.visitId}`;
      
      const getDownloadDirectory = () => {
        if (FileSystem.documentDirectory) {
          return FileSystem.documentDirectory;
        }
        if (FileSystem.cacheDirectory) {
          return FileSystem.cacheDirectory;
        }
        throw new Error("No suitable directory available for download");
      };
      
      const downloadDir = getDownloadDirectory();
      const fileUri = downloadDir + filename;
      
      console.log("📥 Downloading from:", url);
      console.log("💾 Saving to:", fileUri);
      
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        },
      );

      const { uri } = await downloadResumable.downloadAsync();
      
      console.log("✅ PDF downloaded to:", uri);
      
      const canShare = await Sharing.isAvailableAsync();
      
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Download Report',
          UTI: 'com.adobe.pdf'
        });
        
      } else {
        Alert.alert(
          "Success", 
          `PDF saved to: ${uri}`,
          [{ text: "OK" }]
        );
      }
      
    } catch (error) {
      console.error("❌ PDF download error:", error);
      
      let errorMessage = error.message;
      
      if (error.message.includes('Network request failed')) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage = "Authentication error. Please log in again.";
      } else if (error.message.includes('404')) {
        errorMessage = "Report not found on server.";
      } else if (error.message.includes('Document directory not available')) {
        errorMessage = "Storage permission required. Please check app permissions.";
      }
      
      Alert.alert(
        "Download Failed", 
        errorMessage,
        [{ text: "OK" }]
      );
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const renderRightActions = () => {
    return (
      <View style={styles.rightActionContainer}>
        {isDownloading ? (
          <View style={[styles.pdfButton, styles.pdfButtonDownloading]}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.pdfButtonText}>
              {Math.round(downloadProgress * 100)}%
            </Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.pdfButton}
            onPress={handleDownloadPDF}
            activeOpacity={0.7}
            disabled={isDownloading}
          >
            <View style={styles.pdfButtonContent}>
              <MaterialIcons name="picture-as-pdf" size={22} color="#fff" />
              <Text style={styles.pdfButtonText}>PDF</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      containerStyle={styles.swipeableContainer}
    >
      <TouchableOpacity
        style={[
          styles.customerCard,
          isNested && styles.visitRowNested
        ]}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View style={styles.customerHeader}>
          <View style={styles.customerAvatar}>
            <MaterialIcons name="assignment" size={22} color="#fff" />
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {visit.serviceType
                ? visit.serviceType.charAt(0).toUpperCase() + visit.serviceType.slice(1)
                : "Service"}
            </Text>
            <View style={styles.customerMeta}>
              <View style={styles.customerMetaItem}>
                <MaterialIcons name="calendar-today" size={12} color="#666" />
                <Text style={styles.customerMetaText}>
                  {visit.appointmentDate
                    ? new Date(visit.appointmentDate).toLocaleDateString()
                    : "Unknown date"}
                </Text>
              </View>
              {visit.duration && (
                <View style={styles.customerMetaItem}>
                  <MaterialIcons name="timer" size={12} color="#666" />
                  <Text style={styles.customerMetaText}>
                    {Math.floor(visit.duration / 60)} min
                  </Text>
                </View>
              )}
              {visit.technicianName && (
                <View style={styles.customerMetaItem}>
                  <MaterialIcons name="person" size={12} color="#666" />
                  <Text style={styles.customerMetaText}>
                    {visit.technicianName}
                  </Text>
                </View>
              )}
            </View>
            {/* APPOINTMENT ID SECTION */}
            {(appointmentId || visit.appointmentId) && (
              <View style={styles.appointmentIdContainer}>
                <MaterialIcons name="fingerprint" size={10} color="#888" />
                <Text style={styles.appointmentIdText}>
                  Appointment ID: {appointmentId || visit.appointmentId}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.chevronContainer}>
            <MaterialIcons name="chevron-right" size={22} color="#1f9c8b" />
            <MaterialIcons name="swipe" size={12} color="#1f9c8b" style={{ marginTop: 2 }} />
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeableContainer: {
    marginBottom: 8,
  },
  customerCard: {
    backgroundColor: "#fff",
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
  visitRowNested: {
    backgroundColor: "#fafafa",
  },
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
  chevronContainer: {
    alignItems: "center",
  },
  // APPOINTMENT ID STYLES
  appointmentIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  appointmentIdText: {
    fontSize: 11,
    color: "#888",
    marginLeft: 4,
    fontFamily: 'System',
    fontStyle: 'italic',
  },
  rightActionContainer: {
    width: 100,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfButton: {
    width: 80,
    height: '100%',
    backgroundColor: '#1f9c8b',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pdfButtonDownloading: {
    backgroundColor: '#666',
  },
  pdfButtonContent: {
    alignItems: 'center',
  },
  pdfButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
    fontFamily: 'System',
  },
});