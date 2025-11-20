import * as Location from 'expo-location';

/**
 * Request location permissions
 * @returns {Promise<boolean>} - true if granted, false otherwise
 */
export async function requestLocationPermissions() {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (foregroundStatus !== 'granted') {
      console.warn('Location permission not granted');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return false;
  }
}

/**
 * Start watching position with high accuracy
 * @param {Function} onPositionUpdate - Callback (position) => void
 * @returns {Promise<Object>} - Subscription object with remove() method
 */
export async function watchPosition(onPositionUpdate) {
  const hasPermission = await requestLocationPermissions();
  
  if (!hasPermission) {
    throw new Error('Location permission not granted');
  }

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000, // Update every 1 second for better real-time tracking
      distanceInterval: 3, // Or every 3 meters
      mayShowUserSettingsDialog: true,
    },
    (location) => {
      console.log('[Location] Position update:', {
        lat: location.coords.latitude.toFixed(6),
        lon: location.coords.longitude.toFixed(6),
        accuracy: location.coords.accuracy?.toFixed(2),
        speed: location.coords.speed?.toFixed(2),
        heading: location.coords.heading?.toFixed(1),
      });
      onPositionUpdate(location);
    }
  );

  return subscription;
}

/**
 * Get current position once
 * @returns {Promise<Object>} - Location object
 */
export async function getCurrentPosition() {
  const hasPermission = await requestLocationPermissions();
  
  if (!hasPermission) {
    throw new Error('Location permission not granted');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return location;
}

/**
 * Calculate heading from two consecutive positions
 * @param {Object} from - {latitude, longitude}
 * @param {Object} to - {latitude, longitude}
 * @returns {number} - Heading in degrees (0-360)
 */
export function calculateHeading(from, to) {
  const lat1 = from.latitude * Math.PI / 180;
  const lat2 = to.latitude * Math.PI / 180;
  const deltaLon = (to.longitude - from.longitude) * Math.PI / 180;

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}
