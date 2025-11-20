import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Check if app is running in Expo Go
 * @returns {boolean} - True if running in Expo Go
 */
function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  })
});

/**
 * Register for push notifications
 */
export async function registerForPushNotifications() {
  let token;

  // Set up Android notification channels first (needed for local notifications to work)
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C'
      });

      // Create specific channels for different notification types
      await Notifications.setNotificationChannelAsync('hazard_alert', {
        name: 'Hazard Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF3B30'
      });

      await Notifications.setNotificationChannelAsync('route_update', {
        name: 'Route Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#007AFF'
      });

      await Notifications.setNotificationChannelAsync('arrival', {
        name: 'Arrival Notifications',
        importance: Notifications.AndroidImportance.LOW,
        lightColor: '#34C759'
      });
    } catch (error) {
      console.log('[Notifications] Could not set up notification channels:', error.message);
    }
  }

  // Check if running in Expo Go on Android with SDK 53+
  // Remote push notifications won't work, but local notifications will (channels set up above)
  if (isExpoGo() && Platform.OS === 'android') {
    console.log('[Notifications] Remote push notifications are not supported in Expo Go on Android (SDK 53+).');
    console.log('[Notifications] Local notifications will still work. Use a development build for full push notification support.');
    // Return null gracefully - local notifications will still work
    return null;
  }

  if (Device.isDevice) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted for push notifications');
        return null;
      }

      // Try to get push token, but handle gracefully if it fails in Expo Go
      try {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId
        })).data;
      } catch (error) {
        console.log('[Notifications] Could not get push token (this is expected in Expo Go on Android):', error.message);
        return null;
      }
    } catch (error) {
      console.log('[Notifications] Error during push notification registration:', error.message);
      return null;
    }
  } else {
    console.log('[Notifications] Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Schedule a local notification
 */
export async function scheduleNotification(title, body, data = {}, trigger = null) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true
    },
    trigger: trigger || { seconds: 1 }
  });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get notification badge count
 */
export async function getBadgeCount() {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set notification badge count
 */
export async function setBadgeCount(count) {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(listener) {
  return Notifications.addNotificationReceivedListener(listener);
}

/**
 * Add notification response listener (user tapped on notification)
 */
export function addNotificationResponseListener(listener) {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

/**
 * Show local notification for hazard alert
 */
export async function showHazardAlert(hazard) {
  await scheduleNotification(
    `${hazard.severity} Hazard Alert`,
    `${hazard.type} detected on your route`,
    { type: 'hazard_alert', hazardId: hazard.id }
  );
}

/**
 * Show local notification for route update
 */
export async function showRouteUpdate(message) {
  await scheduleNotification(
    'Route Updated',
    message,
    { type: 'route_update' }
  );
}

/**
 * Show local notification for arrival
 */
export async function showArrivalNotification(destination) {
  await scheduleNotification(
    'Destination Reached',
    `You have arrived at ${destination}`,
    { type: 'arrival' }
  );
}
