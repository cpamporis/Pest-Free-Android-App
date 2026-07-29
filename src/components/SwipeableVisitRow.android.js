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
import i18n from "../services/i18n";

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
      i18n.t("components.swipeableVisitRow.downloadReport"),
      i18n.t("components.swipeableVisitRow.downloadConfirm", { 
        service: visit.serviceType || i18n.t("components.swipeableVisitRow.service") 
      }),
      [
        { text: i18n.t("components.swipeableVisitRow.cancel"), style: "cancel" },
        { 
          text: i18n.t("components.swipeableVisitRow.download"), 
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

      const token = await apiService.getCurrentToken();

      const customerNameSlug = customerName 
        ? customerName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        : 'customer';

      const serviceType = visit.serviceType || 'service';

      const filename = `report_${customerNameSlug}_${serviceType}_${visit.visitId.substring(0, 8)}.pdf`;

      const lang = i18n.getLocale();

      const url = `${apiService.API_BASE_URL}/reports/pdf/${visit.visitId}?lang=${lang}`;

      const downloadDir = new Directory(Paths.document, 'downloads');

      if (!(await downloadDir.exists)) {
        await downloadDir.create();
      }

      const downloadedFile = await File.downloadFileAsync(
        url,
        new File(downloadDir, filename),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          idempotent: true
        }
      );
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {

        await Sharing.shareAsync(downloadedFile.uri, {
          mimeType: 'application/pdf',
          dialogTitle: i18n.t("components.swipeableVisitRow.downloadReport"),
        });

      } else {

        Alert.alert(
          i18n.t("components.swipeableVisitRow.success"),
          i18n.t("components.swipeableVisitRow.pdfSaved", { path: downloadedFile.uri }),
          [{ text: i18n.t("common.ok") || "OK" }]
        );

      }

    } catch (error) {

      console.error("❌ PDF download error:", error);

      let errorMessage = error.message;

      if (error.message.includes('Network request failed')) {
        errorMessage = i18n.t("components.swipeableVisitRow.errors.network");
      }
      else if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage = i18n.t("components.swipeableVisitRow.errors.auth");
      }
      else if (error.message.includes('404')) {
        errorMessage = i18n.t("components.swipeableVisitRow.errors.notFound");
      }

      Alert.alert(
        i18n.t("components.swipeableVisitRow.downloadFailed"),
        errorMessage
      );

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
                ? i18n.t(`services.${visit.serviceType.toLowerCase()}`)
                : i18n.t("components.swipeableVisitRow.service")}
            </Text>

            <View style={styles.customerMeta}>

              <View style={styles.customerMetaItem}>
                <MaterialIcons name="calendar-today" size={12} color="#666" />
                <Text style={styles.customerMetaText}>
                  {visit.appointmentDate
                    ? new Date(visit.appointmentDate).toLocaleDateString()
                    : i18n.t("components.swipeableVisitRow.unknownDate")}
                </Text>
              </View>

              {visit.duration && (
                <View style={styles.customerMetaItem}>
                  <MaterialIcons name="timer" size={12} color="#666" />
                  <Text style={styles.customerMetaText}>
                    {Math.floor(visit.duration / 60)} {i18n.t("components.swipeableVisitRow.minutes")}
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
              {i18n.t("components.swipeableVisitRow.appointmentId", { 
                id: appointmentId || visit.appointmentId 
              })}
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