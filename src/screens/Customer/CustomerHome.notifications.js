//CustomerHome.notifications.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiService from "../../services/apiService";
import { Alert } from "react-native";

// Storage keys
export const NOTIFICATIONS_STORAGE_KEY = "@PestFree_CustomerNotifications";
export const NOTIFICATIONS_READ_STORAGE_KEY = "@PestFree_ReadNotifications";

// Notification types
export const notificationTypes = {
  APPOINTMENT_CREATED: {
    type: "appointment_created",
    icon: "event-available",
    color: "#1f9c8b",
    title: "New Appointment Scheduled",
    description: "An appointment has been scheduled for you",
  },
  APPOINTMENT_UPDATED: {
    type: "appointment_updated",
    icon: "edit-calendar",
    color: "#1f9c8b",
    title: "Appointment Updated",
    description: "Your appointment details have been updated",
  },
  APPOINTMENT_DELETED: {
    type: "appointment_deleted",
    icon: "event-busy",
    color: "#F44336",
    title: "Appointment Cancelled",
    description: "An appointment has been cancelled",
  },
  APPOINTMENT_COMPLETED: {
    type: "appointment_completed",
    icon: "check-circle",
    color: "#1f9c8b",
    title: "Appointment Completed",
    description: "A service appointment has been completed",
  },
  SERVICE_REQUEST_ACCEPTED: {
    type: "service_request_accepted",
    icon: "check",
    color: "#1f9c8b",
    title: "Service Request Accepted",
    description: "Your service request has been accepted",
  },
  SERVICE_REQUEST_DECLINED: {
    type: "service_request_declined",
    icon: "close",
    color: "#F44336",
    title: "Service Request Declined",
    description: "Your service request has been declined",
  },
};

  const formatTimeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
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
      
      // Return default mock notifications
      return [
        {
          id: '1',
          type: 'appointment_created',
          title: 'New Appointment Scheduled',
          description: 'Myocide service scheduled for today at 14:00',
          appointmentId: 'app_001',
          appointmentDate: new Date().toISOString().split('T')[0],
          appointmentTime: '14:00',
          serviceType: 'Myocide',
          technician: 'Christos Pamp',
          isRead: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
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
      console.log("📢 Loading notifications from API...");
      
      const result = await apiService.getCustomerNotifications();
      
      if (result?.success) {
        // First, get read notifications from storage
        const storedReadNotificationsJson = await AsyncStorage.getItem(NOTIFICATIONS_READ_STORAGE_KEY);
        const storedReadNotifications = storedReadNotificationsJson ? JSON.parse(storedReadNotificationsJson) : [];
        
        // Combine stored read notifications with newly fetched ones
        const combinedReadIds = [...new Set([...storedReadNotifications, ...readNotificationIds])];
        
        // Mark notifications as read based on combined list
        const notificationsWithReadStatus = result.notifications.map(notification => {
          const isRead =
            notification.status === "read" ||
            !!notification.readAt ||
            combinedReadIds.includes(notification.id);

          return {
            ...notification,

            // ✅ Normalize body text for UI
            description: notification.description ?? notification.message ?? "",

            // ✅ Normalize read flag
            isRead
          };
        });
        
        setNotifications(notificationsWithReadStatus);
        
        // Calculate unread count
        const unreadCount = notificationsWithReadStatus.filter(n => !n.isRead).length;
        setNotificationCount(unreadCount);
        
        // Save current read status to storage
        await AsyncStorage.setItem(
          NOTIFICATIONS_READ_STORAGE_KEY,
          JSON.stringify(combinedReadIds)
        );
        
      } else {
        // Fallback to stored notifications
        console.warn("⚠️ API failed, using stored notifications");
        const storedReadNotificationsJson = await AsyncStorage.getItem(NOTIFICATIONS_READ_STORAGE_KEY);
        const storedReadNotifications = storedReadNotificationsJson ? JSON.parse(storedReadNotificationsJson) : [];
        
        // If we have stored mock notifications, use them
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
      // Use stored notifications as last resort
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
        console.log("✅ markNotificationAsRead API result:", result);
        
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
    console.log("DEBUG: markAllNotificationsAsRead FUNCTION STARTED");
    
    Alert.alert(
      "Mark All as Read",
      "Mark all notifications as read?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Mark All", 
          onPress: async () => {
            console.log("DEBUG: User confirmed Mark All");
            try {
              console.log("DEBUG: Marking all as read...");
              
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
                console.log("✅ API mark all as read result:", result);
                
                if (!result?.success) {
                  console.warn("⚠️ API call to mark all as read failed");
                }
              } catch (apiError) {
                console.error("❌ API error marking all as read:", apiError);
                // Continue anyway - local state is already updated
              }
              
              console.log("✅ All notifications marked as read");
              
            } catch (error) {
              console.error("❌ Error marking all as read:", error);
              Alert.alert("Error", "Failed to mark all notifications as read");
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
            "Clear All Notifications",
            "Are you sure you want to clear all notifications?",
            [
              { text: "Cancel", style: "cancel" },
              { 
                text: "Clear All", 
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