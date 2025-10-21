import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocation } from '../contexts/LocationContext';

const COLORS = {
  warning: '#F59E0B',
  background: '#1F1F1F',
  text: '#FFFFFF',
  primary: '#10B981',
};

/**
 * PermissionBanner
 * Shows when location permissions are denied and provides actions to resolve
 */
export default function PermissionBanner() {
  const { permissionStatus, requestPermissions, openSettings } = useLocation();

  // Only show when permission is denied
  if (permissionStatus !== 'denied') {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.title}>📍 Location Permission Required</Text>
        <Text style={styles.message}>
          FleetNav needs location access to provide navigation and track your vehicle.
          Please grant location permissions to continue.
        </Text>
        
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.retryButton]}
            onPress={requestPermissions}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.settingsButton]}
            onPress={openSettings}
          >
            <Text style={styles.buttonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 999,
  },
  banner: {
    backgroundColor: COLORS.warning,
    padding: 16,
    paddingTop: 50, // Account for status bar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
  },
  settingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
