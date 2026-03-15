//CustomerHome.notifications.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiService from "../../services/apiService";
import { Alert } from "react-native";
import i18n from "../../services/i18n";

// Storage keys
export const NOTIFICATIONS_STORAGE_KEY = "@PestFree_CustomerNotifications";
export const NOTIFICATIONS_READ_STORAGE_KEY = "@PestFree_ReadNotifications";

// Notification types
export const notificationTypes = {
  APPOINTMENT_CREATED: {
    type: "appointment_created",
    icon: "event-available",
    color: "#1f9c8b",
    getTitle: () => i18n.t("customer.notificationTypes.appointment_created.title"),
    getDescription: () => i18n.t("customer.notificationTypes.appointment_created.description"),
  },
  APPOINTMENT_UPDATED: {
    type: "appointment_updated",
    icon: "edit-calendar",
    color: "#1f9c8b",
    getTitle: () => i18n.t("customer.notificationTypes.appointment_updated.title"),
    getDescription: () => i18n.t("customer.notificationTypes.appointment_updated.description"),
  },
  APPOINTMENT_DELETED: {
    type: "appointment_deleted",
    icon: "event-busy",
    color: "#F44336",
    getTitle: () => i18n.t("customer.notificationTypes.appointment_deleted.title"),
    getDescription: () => i18n.t("customer.notificationTypes.appointment_deleted.description"),
  },
  APPOINTMENT_COMPLETED: {
    type: "appointment_completed",
    icon: "check-circle",
    color: "#1f9c8b",
    getTitle: () => i18n.t("customer.notificationTypes.appointment_completed.title"),
    getDescription: () => i18n.t("customer.notificationTypes.appointment_completed.description"),
  },
  SERVICE_REQUEST_ACCEPTED: {
    type: "service_request_accepted",
    icon: "check",
    color: "#1f9c8b",
    getTitle: () => i18n.t("customer.notificationTypes.service_request_accepted.title"),
    getDescription: () => i18n.t("customer.notificationTypes.service_request_accepted.description"),
  },
  SERVICE_REQUEST_DECLINED: {
    type: "service_request_declined",
    icon: "close",
    color: "#F44336",
    getTitle: () => i18n.t("customer.notificationTypes.service_request_declined.title"),
    getDescription: () => i18n.t("customer.notificationTypes.service_request_declined.description"),
  },
  RESCHEDULE_DECLINED: {
    type: "reschedule_declined",
    icon: "event-busy",
    color: "#F44336",
    getTitle: () => i18n.t("customer.notificationTypes.reschedule_declined.title"),
    getDescription: () => i18n.t("customer.notificationTypes.reschedule_declined.description"),
  },
};

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return i18n.t("customer.common.justNow");
    if (diffMins < 60) return i18n.t("customer.common.minutesAgo", { count: diffMins });
    if (diffHours < 24) return i18n.t("customer.common.hoursAgo", { count: diffHours });
    if (diffDays < 7) return i18n.t("customer.common.daysAgo", { count: diffDays });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStoredNotifications = async () => {
    try {
      const storedNotificationsJson = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (storedNotificationsJson) {
        return JSON.parse(storedNotificationsJson);
      }
    } catch (error) {
      console.error("Failed to get stored notifications:", error);
    }
    
    // Return default mock notifications with translations
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    return [
      {
        id: '1',
        type: 'appointment_created',
        title: i18n.t("customer.notificationTypes.appointment_created.title"),
        description: i18n.t("customer.notificationTypes.appointment_created.description") + ' ' + 
                    i18n.t("customer.common.today") + ' 14:00',
        appointmentId: 'app_001',
        appointmentDate: now.toISOString().split('T')[0],
        appointmentTime: '14:00',
        serviceType: 'myocide',
        technician: 'Christos Pamp',
        isRead: false,
        createdAt: twoHoursAgo.toISOString()
      }
    ];
  };

  const saveNotificationsToStorage = async (notifications) => {
    try {
      await AsyncStorage.setItem(
        NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(notifications)
      );
    } catch (error) {
      console.error("Failed to save notifications to storage:", error);
    }
  };

    // Load notifications from API
  const loadNotifications = async ({
    setNotifications,
    setNotificationCount,
    setLastFetchTime,
    readNotificationIds = []
  }) => {
    try {

      const result = await apiService.getCustomerNotifications();
      
      if (result?.success) {
        const storedReadNotificationsJson = await AsyncStorage.getItem(NOTIFICATIONS_READ_STORAGE_KEY);
        const storedReadNotifications = storedReadNotificationsJson ? JSON.parse(storedReadNotificationsJson) : [];
        
        const combinedReadIds = [...new Set([...storedReadNotifications, ...readNotificationIds])];
        
        // Process notifications with translations
        const notificationsWithReadStatus = result.notifications.map(notification => {
          const isRead = notification.status === "read" || !!notification.readAt || combinedReadIds.includes(notification.id);
          
          // Find notification type template
          const typeTemplate = Object.values(notificationTypes).find(nt => nt.type === notification.type);
          
          let title = notification.title;
          let description = notification.description ?? notification.message ?? "";
          
          // If we have a template and no custom title/description, use translations
          if (typeTemplate) {
            title = typeTemplate.getTitle();
            
            // If description is empty or default, use template description
            if (!description || description.includes('appointment') || description.includes('service')) {
              description = typeTemplate.getDescription();
              
              // Add date/time if available
              if (notification.appointmentDate) {
                const dateStr = new Date(notification.appointmentDate).toLocaleDateString('el-GR');
                description += ` ${dateStr}`;
                if (notification.appointmentTime) {
                  description += ` ${i18n.t('customer.common.at')} ${notification.appointmentTime}`;
                }
              }
            }
          }
          
          return {
            ...notification,
            title,
            description,
            isRead
          };
        });
        
        setNotifications(notificationsWithReadStatus);
        
        const unreadCount = notificationsWithReadStatus.filter(n => !n.isRead).length;
        setNotificationCount(unreadCount);
        
        await AsyncStorage.setItem(
          NOTIFICATIONS_READ_STORAGE_KEY,
          JSON.stringify(combinedReadIds)
        );
        
      } else {
        // Fallback to stored notifications
        console.warn("⚠️ API failed, using stored notifications");
        const storedReadNotificationsJson = await AsyncStorage.getItem(NOTIFICATIONS_READ_STORAGE_KEY);
        const storedReadNotifications = storedReadNotificationsJson ? JSON.parse(storedReadNotificationsJson) : [];
        
        const mockNotifications = await getStoredNotifications();
        const notificationsWithReadStatus = mockNotifications.map(notification => ({
          ...notification,
          isRead: storedReadNotifications.includes(notification.id) || false
        }));
        
        setNotifications(notificationsWithReadStatus);
        setNotificationCount(notificationsWithReadStatus.filter(n => !n.isRead).length);
      }
      
      setLastFetchTime(new Date());
      
    } catch (error) {
      console.error("Failed to load notifications:", error);
      const storedReadNotificationsJson = await AsyncStorage.getItem(NOTIFICATIONS_READ_STORAGE_KEY);
      const storedReadNotifications = storedReadNotificationsJson ? JSON.parse(storedReadNotificationsJson) : [];
      
      const mockNotifications = await getStoredNotifications();
      const notificationsWithReadStatus = mockNotifications.map(notification => ({
        ...notification,
        isRead: storedReadNotifications.includes(notification.id) || false
      }));
      
      setNotifications(notificationsWithReadStatus);
      setNotificationCount(notificationsWithReadStatus.filter(n => !n.isRead).length);
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async ({
        notificationId,
        notifications,
        setNotifications,
        setNotificationCount
    }) => {

      try {
        // First check if the notification is already read
        const notification = notifications.find(n => n.id === notificationId);
        
        if (notification && !notification.isRead) {
          // Update local state
          setNotifications(prev => 
            prev.map(notif => 
              notif.id === notificationId ? { ...notif, isRead: true } : notif
            )
          );
          
          // Update unread count
          setNotificationCount(prev => Math.max(0, prev - 1));
        }
        
        // Get current read notifications from storage
        const readNotificationsJson = await AsyncStorage.getItem(NOTIFICATIONS_READ_STORAGE_KEY);
        const readNotifications = readNotificationsJson ? JSON.parse(readNotificationsJson) : [];
        
        // Add this notification ID if not already there
        if (!readNotifications.includes(notificationId)) {
          readNotifications.push(notificationId);
          await AsyncStorage.setItem(
            NOTIFICATIONS_READ_STORAGE_KEY,
            JSON.stringify(readNotifications)
          );
        }
        
        // Call API to mark as read
        const result = await apiService.markNotificationAsRead(notificationId);
        
        if (!result?.success) {
          console.warn("API call to mark notification as read failed");
        }
        
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async ({
    notifications,
    setNotifications,
    setNotificationCount
  }) => {
    
    Alert.alert(
      i18n.t("customer.modals.markAllRead.title") || "Mark All as Read",
      i18n.t("customer.modals.markAllRead.message") || "Mark all notifications as read?",
      [
        { text: i18n.t("customer.modals.markAllRead.cancel") || "Cancel", style: "cancel" },
        { 
          text: i18n.t("customer.modals.markAllRead.confirm") || "Mark All", 
          onPress: async () => {
            try {
              
              // Get all notification IDs
              const allNotificationIds = notifications.map(n => n.id);
              
              // Update local state immediately
              const updatedNotifications = notifications.map(notification => ({
                ...notification,
                isRead: true
              }));
              
              setNotifications(updatedNotifications);
              setNotificationCount(0);
              
              // Save all IDs to read storage
              await AsyncStorage.setItem(
                NOTIFICATIONS_READ_STORAGE_KEY,
                JSON.stringify(allNotificationIds)
              );
              
              // Call API to mark all as read
              try {
                const result = await apiService.markAllNotificationsAsRead();

                if (!result?.success) {
                  console.warn("⚠️ API call to mark all as read failed");
                }
              } catch (apiError) {
                console.error("❌ API error marking all as read:", apiError);
                // Continue anyway - local state is already updated
              }
            } catch (error) {
              console.error("❌ Error marking all as read:", error);
              Alert.alert(i18n.t("common.error"), i18n.t("customer.notifications.markAllReadError") || "Failed to mark all notifications as read");
            }
          }
        }
      ]
    );
  };

       // Clear all notifications
  const clearAllNotifications = async ({
            setNotifications,
            setNotificationCount
            }) => {

          Alert.alert(
            i18n.t("customer.modals.clearAll.title") || "Clear All Notifications",
            i18n.t("customer.modals.clearAll.message") || "Are you sure you want to clear all notifications?",
            [
              { text: i18n.t("customer.modals.clearAll.cancel") || "Cancel", style: "cancel" },
              { 
                text: i18n.t("customer.modals.clearAll.confirm") || "Clear All", 
                style: "destructive",
                onPress: async () => {
                  try {
                    // Clear local state
                    setNotifications([]);
                    setNotificationCount(0);
                    
                    // Clear storage
                    await AsyncStorage.setItem(NOTIFICATIONS_READ_STORAGE_KEY, JSON.stringify([]));
                    
                    // Call API
                    await apiService.clearAllNotifications();
                    
                  } catch (error) {
                    console.error("Failed to clear notifications:", error);
                  }
                }
              }
            ]
          );
  };

export {
  loadNotifications,
  getStoredNotifications,
  saveNotificationsToStorage,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  formatTimeAgo,
};