import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useWebSocket } from '../contexts/WebSocketContext';

const COLORS = {
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#1F1F1F',
  text: '#FFFFFF',
  primary: '#10B981',
};

/**
 * ConnectivityBanner
 * Shows connectivity status and provides actions for offline/VPN issues
 */
export default function ConnectivityBanner() {
  const { connected } = useWebSocket();
  const [dismissed, setDismissed] = useState(false);
  const [showVPNHint, setShowVPNHint] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);

  // Reset dismissal when connection is restored
  useEffect(() => {
    if (connected) {
      setDismissed(false);
      setShowVPNHint(false);
      setRetryAttempts(0);
    }
  }, [connected]);

  // Show VPN hint after multiple retry attempts
  useEffect(() => {
    if (retryAttempts >= 2 && !connected) {
      setShowVPNHint(true);
    }
  }, [retryAttempts, connected]);

  const handleRetry = () => {
    setRetryAttempts((prev) => prev + 1);
    // Force reconnection by reloading the app or context
    // The WebSocketContext will automatically attempt to reconnect
    console.log('Retrying connection...');
  };

  const handleOpenTunnelInstructions = () => {
    // Open link to documentation about Expo Tunnel mode
    const url = 'https://docs.expo.dev/more/expo-cli/#tunneling';
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log('Cannot open URL:', url);
      }
    });
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Don't show if connected or dismissed
  if (connected || dismissed) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.title}>🔌 Connection Issue</Text>
        <Text style={styles.message}>
          {showVPNHint
            ? 'Unable to connect to backend. If you\'re on a VPN, LAN discovery may be blocked. Consider using Expo Tunnel mode.'
            : 'Unable to connect to the backend server. Check your internet connection.'}
        </Text>
        
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.retryButton]}
            onPress={handleRetry}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
          
          {showVPNHint && (
            <TouchableOpacity
              style={[styles.button, styles.tunnelButton]}
              onPress={handleOpenTunnelInstructions}
            >
              <Text style={styles.buttonText}>Tunnel Mode Info</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.button, styles.dismissButton]}
            onPress={handleDismiss}
          >
            <Text style={styles.buttonText}>Dismiss</Text>
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
    zIndex: 1000,
    elevation: 1000,
  },
  banner: {
    backgroundColor: COLORS.error,
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
  tunnelButton: {
    backgroundColor: COLORS.warning,
  },
  dismissButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
