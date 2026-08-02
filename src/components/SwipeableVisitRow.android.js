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

  const [activeDownloadType, setActiveDownloadType] = useState(null);

  const isDownloading = activeDownloadType !== null;

  const normalizedServiceType = String(
    visit.serviceType ??
    visit.service_type ??
    visit.serviceCategory ??
    visit.service_category ??
    ""
  )
    .trim()
    .toLowerCase();

  const isCertificateService =
    normalizedServiceType === "st" ||
    normalizedServiceType.includes("certificate") ||
    normalizedServiceType.includes("certification");

  const certificateVisitDate =
    visit.appointmentDate ??
    visit.appointment_date ??
    visit.startTime ??
    visit.start_time ??
    visit.date ??
    visit.createdAt ??
    visit.created_at ??
    null;

  const getVisitYear = (value) => {
    if (!value) return null;

    const directYear = String(value).match(/^(\d{4})/);

    if (directYear) {
      return Number(directYear[1]);
    }

    const parsedDate = new Date(value);

    return Number.isNaN(parsedDate.getTime())
      ? null
      : parsedDate.getFullYear();
  };

  const certificateYear = getVisitYear(certificateVisitDate);
  const currentYear = new Date().getFullYear();

  const canDownloadCertificate =
    isCertificateService &&
    certificateYear === currentYear;

  const locale = String(i18n.getLocale() || "").toLowerCase();
  const isGreek = locale.startsWith("el") || locale.startsWith("gr");

  const certificateCopy = {
    label: isGreek ? "Πιστοποιητικό" : "Certificate",

    title: isGreek
      ? "Λήψη πιστοποιητικού"
      : "Download Certificate",

    confirmation: isGreek
      ? `Θέλετε να κατεβάσετε το πιστοποιητικό του ${certificateYear};`
      : `Do you want to download the ${certificateYear} certificate?`,

    unavailable: isGreek
      ? "Το πιστοποιητικό είναι διαθέσιμο μόνο για το τρέχον έτος."
      : "The certificate is available only for the current year."
  };

  const handleDownloadPDF = (documentType = "report") => {
  const isCertificate = documentType === "certificate";

    if (isCertificate && !canDownloadCertificate) {
      Alert.alert(
        certificateCopy.title,
        certificateCopy.unavailable
      );
      return;
    }

    const title = isCertificate
      ? certificateCopy.title
      : i18n.t(
          "components.swipeableVisitRow.downloadReport"
        );

    const message = isCertificate
      ? certificateCopy.confirmation
      : i18n.t(
          "components.swipeableVisitRow.downloadConfirm",
          {
            service:
              visit.serviceType ??
              visit.service_type ??
              i18n.t(
                "components.swipeableVisitRow.service"
              )
          }
        );

    Alert.alert(title, message, [
      {
        text: i18n.t(
          "components.swipeableVisitRow.cancel"
        ),
        style: "cancel"
      },
      {
        text: i18n.t(
          "components.swipeableVisitRow.download"
        ),
        onPress: async () => {
          try {
            await downloadPDF(documentType);
          } catch (error) {
            console.error("❌ Download error:", error);
          }
        }
      }
    ]);
  };

  const getTranslatedServiceType = (type) => {
  const typeLower = type?.toLowerCase() || "";

  if (typeLower.includes("myocide")) {
    return i18n.t(
      "components.swipeableVisitRow.serviceTypes.myocide"
    );
  }

  if (
    isCertificateService ||
    typeLower.includes("certificate")
  ) {
    return i18n.t(
      "components.swipeableVisitRow.serviceTypes.certificate"
    );
  }

  if (typeLower.includes("insecticide")) {
    return i18n.t(
      "components.swipeableVisitRow.serviceTypes.insecticide"
    );
  }

  if (typeLower.includes("disinfection")) {
    return i18n.t(
      "components.swipeableVisitRow.serviceTypes.disinfection"
    );
  }

  if (typeLower.includes("special")) {
    return i18n.t(
      "components.swipeableVisitRow.serviceTypes.special"
    );
  }

  return i18n.t(
    "components.swipeableVisitRow.serviceTypes.myocide"
  );
};

  const downloadPDF = async (documentType = "report") => {
    if (isDownloading) return;

    const isCertificate = documentType === "certificate";

    if (isCertificate && !canDownloadCertificate) {
      Alert.alert(
        certificateCopy.title,
        certificateCopy.unavailable
      );
      return;
    }

    setActiveDownloadType(documentType);

    try {
      const visitId =
        visit.visitId ??
        visit.visit_id;

      if (!visitId) {
        throw new Error("Missing visit ID");
      }

      const token = await apiService.getCurrentToken();

      const generatedSlug = customerName
        ? customerName
            .replace(/[^a-z0-9]/gi, "_")
            .toLowerCase()
        : "";

      const customerNameSlug =
        generatedSlug || "customer";

      const reportServiceType =
        visit.serviceType ??
        visit.service_type ??
        "service";

      const shortVisitId =
        String(visitId).substring(0, 8);

      const filename = isCertificate
        ? `certificate_${customerNameSlug}_${certificateYear}_${shortVisitId}.pdf`
        : `report_${customerNameSlug}_${reportServiceType}_${shortVisitId}.pdf`;

      const lang = i18n.getLocale();

      const url = isCertificate
        ? apiService.getCertificatePdfUrl(visitId)
        : `${apiService.API_BASE_URL}/reports/pdf/` +
          `${encodeURIComponent(visitId)}` +
          `?lang=${encodeURIComponent(lang)}`;

      const downloadDir = new Directory(
        Paths.document,
        "downloads"
      );

      if (!(await downloadDir.exists)) {
        await downloadDir.create();
      }

      const downloadedFile =
        await File.downloadFileAsync(
          url,
          new File(downloadDir, filename),
          {
            headers: token
              ? {
                  Authorization: `Bearer ${token}`
                }
              : {},
            idempotent: true
          }
        );

      /*
      * Validate certificates before sharing.
      * This prevents a small JSON error response from being
      * shared as a fake 117-byte PDF.
      */
      if (isCertificate) {
        const bytes = await downloadedFile.bytes();

        const isValidPdf =
          bytes.length >= 5 &&
          bytes[0] === 0x25 && // %
          bytes[1] === 0x50 && // P
          bytes[2] === 0x44 && // D
          bytes[3] === 0x46 && // F
          bytes[4] === 0x2d;   // -

        if (!isValidPdf) {
          let backendMessage =
            "The server did not return a valid certificate PDF";

          try {
            const errorText =
              await downloadedFile.text();

            const errorData = JSON.parse(errorText);

            backendMessage =
              errorData?.error ??
              errorData?.message ??
              backendMessage;
          } catch {
            // Keep the invalid-PDF message.
          }

          try {
            await downloadedFile.delete();
          } catch {
            // Ignore cleanup failure.
          }

          throw new Error(backendMessage);
        }
      }

      const canShare =
        await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(
          downloadedFile.uri,
          {
            mimeType: "application/pdf",
            dialogTitle: isCertificate
              ? certificateCopy.title
              : i18n.t(
                  "components.swipeableVisitRow.downloadReport"
                )
          }
        );
      } else {
        Alert.alert(
          i18n.t(
            "components.swipeableVisitRow.success"
          ),
          i18n.t(
            "components.swipeableVisitRow.pdfSaved",
            {
              path: downloadedFile.uri
            }
          ),
          [
            {
              text:
                i18n.t("common.ok") ||
                "OK"
            }
          ]
        );
      }
    } catch (error) {
      console.error("❌ PDF download error:", error);

      let errorMessage =
        error?.message ||
        "The PDF could not be downloaded";

      if (errorMessage.includes("Network request failed")) {
        errorMessage = i18n.t(
          "components.swipeableVisitRow.errors.network"
        );
      } else if (
        errorMessage.includes("401") ||
        errorMessage.includes("403")
      ) {
        errorMessage = i18n.t(
          "components.swipeableVisitRow.errors.auth"
        );
      } else if (errorMessage.includes("404")) {
        errorMessage = i18n.t(
          "components.swipeableVisitRow.errors.notFound"
        );
      }

      Alert.alert(
        isCertificate
          ? certificateCopy.title
          : i18n.t(
              "components.swipeableVisitRow.downloadFailed"
            ),
        errorMessage
      );
    } finally {
      setActiveDownloadType(null);
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
        onLongPress={() => handleDownloadPDF("report")}
        delayLongPress={500}
      >
        <View style={styles.customerHeader}>

          <View style={styles.customerAvatar}>
            <MaterialIcons name="assignment" size={22} color="#fff" />
          </View>

          <View style={styles.customerInfo}>

            <Text style={styles.customerName}>
              {normalizedServiceType
                ? getTranslatedServiceType(normalizedServiceType)
                : i18n.t(
                    "components.swipeableVisitRow.service"
                  )}
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
            <TouchableOpacity
              onPress={() => handleDownloadPDF("report")}
              style={[
                styles.pdfIconButton,
                isDownloading && styles.disabledIconButton
              ]}
              disabled={isDownloading}
              accessibilityRole="button"
              accessibilityLabel={i18n.t(
                "components.swipeableVisitRow.downloadReport"
              )}
            >
              {activeDownloadType === "report" ? (
                <ActivityIndicator
                  size="small"
                  color="#1f9c8b"
                />
              ) : (
                <MaterialIcons
                  name="picture-as-pdf"
                  size={22}
                  color="#1f9c8b"
                />
              )}
            </TouchableOpacity>

            {canDownloadCertificate && (
              <TouchableOpacity
                onPress={() =>
                  handleDownloadPDF("certificate")
                }
                style={[
                  styles.certificateIconButton,
                  isDownloading && styles.disabledIconButton
                ]}
                disabled={isDownloading}
                accessibilityRole="button"
                accessibilityLabel={certificateCopy.label}
              >
                {activeDownloadType === "certificate" ? (
                  <ActivityIndicator
                    size="small"
                    color="#176f64"
                  />
                ) : (
                  <MaterialIcons
                    name="verified"
                    size={22}
                    color="#176f64"
                  />
                )}
              </TouchableOpacity>
            )}

            <MaterialIcons
              name="chevron-right"
              size={22}
              color="#1f9c8b"
            />
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
  certificateIconButton: {
  padding: 4,
  borderRadius: 6,
  backgroundColor: "#e8f5f2",
},

disabledIconButton: {
  opacity: 0.5,
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