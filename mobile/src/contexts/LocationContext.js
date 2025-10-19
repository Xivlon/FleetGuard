import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';
import { watchPosition } from '../services/location';

const LocationContext = createContext(null);

export const LocationProvider = ({ children, vehicleId, sendVehiclePosition }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('checking'); // 'checking', 'granted', 'denied', 'unavailable'
  const [isWatching, setIsWatching] = useState(false);
  const subscriptionRef = useRef(null);
  const lastPositionRef = useRef(null);

  // Request permissions on mount
  useEffect(() => {
    requestPermissions();
  }, []);

  // Start watching when we have permissions
  useEffect(() => {
    if (permissionStatus === 'granted' && !isWatching && vehicleId && sendVehiclePosition) {
      startWatching();
    }
    
    return () => {
      stopWatching();
    };
  }, [permissionStatus, vehicleId, sendVehiclePosition]);

  const requestPermissions = async () => {
    try {
      setPermissionStatus('checking');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        setPermissionStatus('granted');
      } else {
        setPermissionStatus('denied');
      }
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      setPermissionStatus('unavailable');
    }
  };

  const startWatching = async () => {
    if (isWatching || !vehicleId || !sendVehiclePosition) return;

    try {
      const subscription = await watchPosition((location) => {
        const { latitude, longitude, coords } = location;
        const position = {
          latitude: coords?.latitude || latitude,
          longitude: coords?.longitude || longitude,
        };
        
        setCurrentLocation(position);
        
        // Calculate heading if we have previous position
        let heading = coords?.heading;
        if (!heading && lastPositionRef.current) {
          heading = calculateHeading(lastPositionRef.current, position);
        }
        
        // Send position to backend via WebSocket
        sendVehiclePosition(
          vehicleId,
          position.latitude,
          position.longitude,
          coords?.speed || 0,
          heading || 0
        );
        
        lastPositionRef.current = position;
      });
      
      subscriptionRef.current = subscription;
      setIsWatching(true);
    } catch (error) {
      console.error('Failed to start location watching:', error);
      if (error.message.includes('permission')) {
        setPermissionStatus('denied');
      }
    }
  };

  const stopWatching = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setIsWatching(false);
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const retryPermissions = async () => {
    await requestPermissions();
    if (permissionStatus === 'granted') {
      startWatching();
    }
  };

  return (
    <LocationContext.Provider value={{
      currentLocation,
      permissionStatus,
      isWatching,
      requestPermissions: retryPermissions,
      openSettings,
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
};

// Helper function to calculate heading
function calculateHeading(from, to) {
  const lat1 = from.latitude * Math.PI / 180;
  const lat2 = to.latitude * Math.PI / 180;
  const deltaLon = (to.longitude - from.longitude) * Math.PI / 180;

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}
