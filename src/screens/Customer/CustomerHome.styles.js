//CustomerHome.style.js
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
   notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B6B',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1f9c8b',
  },
  
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  
  // Notifications Section
  notificationCountBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  
  notificationCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  
  notificationsToggleButton: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0f9f8',
  },
  
  notificationsToggleText: {
    color: '#1f9c8b',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
  },
  
  // Empty Notifications
  emptyNotificationsCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  
  emptyNotificationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'System',
  },
  
  emptyNotificationsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'System',
  },
  
  // Notifications List
  notificationsList: {
    marginBottom: 20,
  },
  
  // Notification Card
  notificationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  
  notificationCardUnread: {
    backgroundColor: '#f0f9f8',
    borderColor: '#1f9c8b',
    borderWidth: 1,
  },
  
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  notificationContent: {
    flex: 1,
  },
  
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
    fontFamily: 'System',
  },
  
  notificationDescription: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System',
  },
  
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1f9c8b',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  notificationTime: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'System',
  },
  
  // View All Notifications Button
  viewAllNotificationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  
  viewAllNotificationsText: {
    fontSize: 14,
    color: '#1f9c8b',
    fontWeight: '600',
    marginRight: 8,
    fontFamily: 'System',
  },
  
  // Notifications Preview Card
  notificationsPreviewCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  
  notificationsPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  notificationsPreviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  notificationsPreviewContent: {
    flex: 1,
  },
  
  notificationsPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
    fontFamily: 'System',
  },
  
  notificationsPreviewSubtitle: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System',
  },
  
  // Notification Details Modal
  notificationModalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  
  notificationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  notificationModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  
  notificationModalTitleContainer: {
    flex: 1,
  },
  
  notificationModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    fontFamily: 'System',
  },
  
  notificationModalTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontFamily: 'System',
  },
  
  notificationModalBody: {
    padding: 24,
  },
  
  notificationModalDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 24,
    fontFamily: 'System',
  },
  
  appointmentDetailsSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  
  appointmentDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    fontFamily: 'System',
  },
  
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginLeft: 8,
    marginRight: 8,
    width: 80,
    fontFamily: 'System',
  },
  
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontFamily: 'System',
  },
  
  notificationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  
  notificationActionButton: {
    flex: 1,
    backgroundColor: '#1f9c8b',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  notificationActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'System',
  },
  
  // Refresh Control
  refreshControl: {
    backgroundColor: '#1f9c8b',
  },
  simpleInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333",
    fontFamily: 'System',
    marginBottom: 16,
    minHeight: 56, // Fixed height
  },
  
  simpleTextArea: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333",
    fontFamily: 'System',
    marginBottom: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  
  // Updated date/time dropdown styles
  dateTimeDropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
    minHeight: 56,
  },
  
  dateTimeDropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  
  dateTimeDropdownText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
    fontFamily: 'System'
  },
  
  dateTimeDropdownPlaceholder: {
    fontSize: 16,
    color: "#999",
    marginLeft: 12,
    fontFamily: 'System'
  },
  
  // Date/Time Picker Modal specific styles
  dateTimePickerCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '60%',
  },
  
  dateTimePicker: {
    height: 320,
    width: '100%',
  },
  
  timeList: {
    maxHeight: 300,
  },
  
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  
  timeItemSelected: {
    backgroundColor: '#1f9c8b',
  },
  
  timeItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontFamily: 'System',
  },
  
  timeItemTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  
  modalConfirmButton: {
    backgroundColor: '#1f9c8b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  
  modalConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  
  // Keep all existing styles below (unchanged)
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa"
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa"
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontFamily: 'System'
  },
  scrollView: {
    flex: 1,
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
  headerContent: {
    alignItems: "center"
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)"
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "600",
    color: "#fff",
    fontFamily: 'System'
  },
  welcomeText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
    fontFamily: 'System'
  },
  customerName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
    fontFamily: 'System'
  },
  customerEmail: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontFamily: 'System'
  },
  content: {
    padding: 24,
    paddingTop: 16
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginLeft: 8,
    fontFamily: 'System'
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0"
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  statusText: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
    fontFamily: 'System'
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10
  },
  statusDescription: {
    fontSize: 14,
    color: "#666",
    flex: 1,
    fontFamily: 'System'
  },
  visitMeta: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  visitMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  visitMetaLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    fontFamily: "System",
    width: 120
  },
  visitMetaValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
  },
  visitDateText: {
    fontSize: 14,
    fontWeight: "700", 
    color: "#2c3e50",
    fontFamily: "System",
  },
  visitTimeText: {
    fontSize: 14,
    fontWeight: "400", 
    color: "#2c3e50",
    marginLeft: 6,
    fontFamily: "System",
  },
  
  // Quick Actions
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 12
  },
  quickActionButton: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0"
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    textAlign: "center",
    fontFamily: 'System'
  },
  
  // Expanded Sections
  expandedSection: {
    marginBottom: 24
  },
  
  // Appointments
  emptyStateCard: {
    backgroundColor: "#fff",
    padding: 40,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0"
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'System'
  },
  emptyStateText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    fontFamily: 'System',
    lineHeight: 20
  },
  appointmentsList: {
    marginBottom: 16
  },
  appointmentCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0"
  },
  appointmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  appointmentTimeContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  appointmentTime: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f9c8b",
    marginLeft: 8,
    fontFamily: 'System'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: 'System'
  },
  appointmentService: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
    fontFamily: 'System'
  },
  technicianInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  technicianText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
    fontFamily: 'System'
  },
  appointmentNotes: {
    fontSize: 13,
    color: "#888",
    fontStyle: "italic",
    marginBottom: 16,
    fontFamily: 'System'
  },
  appointmentActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center"
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
    fontFamily: 'System'
  },
  
  // Service Request Form
  serviceRequestCard: {
    marginBottom: 0
  },
  formGroup: {
    marginBottom: 20
  },
  formRow: {
    flexDirection: "row",
    marginBottom: 20
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
    fontFamily: 'System'
  },
  dropdownSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e9ecef"
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  serviceTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  dropdownText: {
    flex: 1
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2c3e50",
    fontFamily: 'System'
  },
  dropdownDescription: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
    fontFamily: 'System'
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: "#999",
    fontFamily: 'System'
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333",
    fontFamily: 'System'
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top"
  },
  urgencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  urgencyOption: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    marginBottom: 8
  },
  urgencyOptionSelected: {
    backgroundColor: "#1f9c8b"
  },
  urgencyContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  urgencyLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: 'System'
  },
  urgencyDescription: {
    fontSize: 12,
    fontFamily: 'System'
  },
  submitButton: {
    backgroundColor: "#1f9c8b",
    padding: 18,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 16,
    shadowColor: "#1f9c8b",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#cccccc",
    shadowColor: "#cccccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: 'System'
  },
  formNote: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    fontFamily: 'System'
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "#0008",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    margin: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3e50",
    fontFamily: 'System'
  },
  modalCloseButton: {
    padding: 4
  },
  modalBody: {
    padding: 24
  },
  modalList: {
    paddingHorizontal: 24,
    paddingBottom: 24
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0"
  },
  modalItemSelected: {
    backgroundColor: "#f0f9f8",
    borderColor: "#1f9c8b"
  },
  modalItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center"
  },
  modalItemContent: {
    flex: 1,
    marginLeft: 16
  },
  modalItemLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2c3e50",
    fontFamily: 'System'
  },
  modalItemLabelSelected: {
    color: "#1f9c8b",
    fontWeight: "600"
  },
  modalItemDescription: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
    fontFamily: 'System'
  },
  modalNote: {
    fontSize: 13,
    color: "#666",
    marginBottom: 20,
    fontFamily: 'System'
  },
  
  // Contact Form Styles
  contactCard: {
    marginBottom: 24
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginLeft: 8,
    fontFamily: 'System'
  },
  contactSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: 'System'
  },
  phoneSection: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },
  phoneHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  phoneTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginLeft: 8,
    fontFamily: 'System'
  },
  phoneButton: {
    backgroundColor: "#1f9c8b",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#1f9c8b",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  phoneNumberText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: 'System'
  },
  phoneNote: {
    fontSize: 13,
    color: "#888",
    fontStyle: "italic",
    fontFamily: 'System'
  },
  emailSection: {
    marginTop: 16
  },
  emailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  emailTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginLeft: 8,
    fontFamily: 'System'
  },
  emailRecipient: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    fontFamily: 'System'
  },
  emailRecipientBold: {
    fontWeight: "700",
    color: "#2c3e50"
  },
  textAreaContainer: {
    alignItems: "flex-start",
    minHeight: 120
  },
  sendButton: {
    backgroundColor: "#1f9c8b",
    padding: 18,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 16,
    shadowColor: "#1f9c8b",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#cccccc",
    shadowColor: "#cccccc",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: 'System'
  },
  emailNote: {
    fontSize: 13,
    color: "#888",
    lineHeight: 20,
    fontFamily: 'System'
  },
  
  // Account Settings Button
  accountButton: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  accountButtonText: {
    color: "#2c3e50",
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 8,
    flex: 1,
    fontFamily: 'System'
  },
  passwordCard: {
    marginBottom: 24
  },
  passwordHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  passwordTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginLeft: 8,
    fontFamily: 'System'
  },
  passwordSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: 'System'
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
    paddingHorizontal: 16,
    paddingVertical: 4
  },
  inputIcon: {
    marginRight: 12
  },
  updateButton: {
    backgroundColor: "#1f9c8b",
    padding: 18,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 16,
    shadowColor: "#1f9c8b",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonDisabled: {
    backgroundColor: "#cccccc",
    shadowColor: "#cccccc",
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: 'System'
  },
  passwordNote: {
    fontSize: 13,
    color: "#888",
    lineHeight: 20,
    fontFamily: 'System'
  },
  logoutButton: {
    backgroundColor: "#1f9c8b",
    padding: 18,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 30,
    shadowColor: "#1f9c8b",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: 'System'
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee"
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    fontFamily: 'System'
  },
  footerCopyright: {
    fontSize: 12,
    color: "#999",
    fontFamily: 'System'
  },
    markAllReadButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f0f9f8',
  },
  markAllReadText: {
    color: '#1f9c8b',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  clearNotificationsButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#ffebee',
  },
  noAppointmentText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#666",
    fontStyle: "italic",
    fontFamily: "System",
  },
  rescheduleInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  rescheduleLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'System',
  },
  rescheduleValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: 'System',
  },
  rescheduleService: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System',
  },
  validUntilText: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
    fontWeight: '500'
  },
  validUntilDate: {
    fontWeight: "700",
    color: "#333", 
  },
  inputError: {
    borderColor: '#F44336',
    backgroundColor: '#FFF5F5',
  },

  validationError: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default styles;