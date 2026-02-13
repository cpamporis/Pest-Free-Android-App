// components/SwipeableVisitRow.android.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import apiService from '../services/apiService';

export default function SwipeableVisitRow({ 
  visit, 
  onPress,
  customerName,
  isNested = false,
  appointmentId
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  
  const handleDownloadPDF = async () => {
    Alert.alert(
      "Download Report",
      `Download PDF report for ${visit.serviceType || 'service'}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Download", 
          onPress: async () => {
            try {
              await downloadPDF();
            } catch (error) {
              console.error("❌ Download error:", error);
            }
          }
        }
      ]
    );
  };

  const downloadPDF = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);

    try {
      console.log("📥 Starting PDF download for:", visit.visitId);
      
      const token = await apiService.getCurrentToken();
      const customerNameSlug = customerName 
        ? customerName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        : 'customer';
      const serviceType = visit.serviceType || 'service';
      const filename = `Report_${customerNameSlug}_${serviceType}_${visit.visitId.substring(0, 8)}.pdf`;
      
      const url = `${apiService.API_BASE_URL}/reports/pdf/${visit.visitId}`;
      
      // Create downloads directory if it doesn't exist
      const downloadDir = new Directory(Paths.document, 'downloads');
      if (!(await downloadDir.exists)) {
        await downloadDir.create();
      }
      
      console.log("📥 Downloading from:", url);
      
      // Use the new File.downloadFileAsync API
      const downloadedFile = await File.downloadFileAsync(url, new File(downloadDir, filename), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        // Allow overwriting if file already exists
        idempotent: true
      });
      
      console.log("✅ PDF downloaded to:", downloadedFile.uri);
      
      const canShare = await Sharing.isAvailableAsync();
      
      if (canShare) {
        await Sharing.shareAsync(downloadedFile.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Download Report',
        });
      } else {
        Alert.alert(
          "Success", 
          `PDF saved to device`,
          [{ text: "OK" }]
        );
      }
      
    } catch (error) {
      console.error("❌ PDF download error:", error);
      
      let errorMessage = error.message;
      if (error.message.includes('Network request failed')) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (error.message.includes('401')) {
        errorMessage = "Authentication error. Please log in again.";
      } else if (error.message.includes('404')) {
        errorMessage = "Report not found.";
      }
      
      Alert.alert("Download Failed", errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.customerCard,
          isNested && styles.visitRowNested
        ]}
        activeOpacity={0.7}
        onPress={onPress}
        onLongPress={handleDownloadPDF}
        delayLongPress={500}
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
            </View>
          </View>
          <View style={styles.actionButtons}>
            {isDownloading ? (
              <ActivityIndicator size="small" color="#1f9c8b" />
            ) : (
              <>
                <TouchableOpacity 
                  onPress={handleDownloadPDF}
                  style={styles.pdfIconButton}
                >
                  <MaterialIcons name="picture-as-pdf" size={22} color="#1f9c8b" />
                </TouchableOpacity>
                <MaterialIcons name="chevron-right" size={22} color="#1f9c8b" />
              </>
            )}
          </View>
        </View>
        {(appointmentId || visit.appointmentId) && (
          <View style={styles.appointmentIdContainer}>
            <MaterialIcons name="fingerprint" size={10} color="#888" />
            <Text style={styles.appointmentIdText}>
              ID: {appointmentId || visit.appointmentId}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  customerCard: {
    padding: 12,
  },
  visitRowNested: {
    backgroundColor: '#fff',
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f9c8b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  customerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  customerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  customerMetaText: {
    fontSize: 11,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pdfIconButton: {
    padding: 4,
  },
  appointmentIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  appointmentIdText: {
    fontSize: 9,
    color: '#888',
    marginLeft: 4,
  },
});