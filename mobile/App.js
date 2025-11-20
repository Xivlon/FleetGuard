import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import FleetDashboard from './src/screens/FleetDashboard';
import NavigationScreen from './src/screens/NavigationScreen';
import ReportHazardScreen from './src/screens/ReportHazardScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import { WebSocketProvider, useWebSocket } from './src/contexts/WebSocketContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { OfflineProvider } from './src/contexts/OfflineContext';
import ConnectivityBanner from './src/components/ConnectivityBanner';
import PermissionBanner from './src/components/PermissionBanner';
import SDKVersionWarning from './src/components/SDKVersionWarning';
import { initSentry } from './src/utils/sentry';
import { registerForPushNotifications, addNotificationReceivedListener, addNotificationResponseListener } from './src/services/notificationService';
import { COLORS } from './src/config/constants';

// Initialize Sentry on app startup (if configured)
initSentry();

const Stack = createStackNavigator();

// Inner component that has access to WebSocket and Auth contexts
function AppContent() {
  const { sendVehiclePosition } = useWebSocket();
  const { isAuthenticated, user, loading, savePushToken } = useAuth();
  const vehicleId = user?.id || 'demo-vehicle';

  // Register for push notifications when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      setupPushNotifications();
    }
  }, [isAuthenticated, user]);

  const setupPushNotifications = async () => {
    try {
      const token = await registerForPushNotifications();
      if (token) {
        await savePushToken(token);
      }

      // Listen for notifications
      const receivedSubscription = addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
      });

      const responseSubscription = addNotificationResponseListener(response => {
        console.log('Notification tapped:', response);
        // Handle notification tap (navigate to specific screen based on type)
      });

      return () => {
        receivedSubscription.remove();
        responseSubscription.remove();
      };
    } catch (error) {
      console.error('Error setting up push notifications:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <LocationProvider vehicleId={vehicleId} sendVehiclePosition={sendVehiclePosition}>
      <View style={styles.container}>
        {/* Connectivity and permission banners */}
        <ConnectivityBanner />
        <PermissionBanner />
        <SDKVersionWarning />

        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle: {
                backgroundColor: COLORS.surface,
              },
              headerTintColor: COLORS.primary,
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
            {/* eslint-disable-next-line no-constant-condition */}
            {false ? (
              // Auth screens (disabled)
              <>
                <Stack.Screen
                  name="Login"
                  component={LoginScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Register"
                  component={RegisterScreen}
                  options={{ title: 'Sign Up' }}
                />
              </>
            ) : (
              // Main app screens
              <>
                <Stack.Screen
                  name="FleetDashboard"
                  component={FleetDashboard}
                  options={{ title: 'Fleet Dashboard' }}
                />
                <Stack.Screen
                  name="Navigation"
                  component={NavigationScreen}
                  options={{ title: 'Navigation' }}
                />
                <Stack.Screen
                  name="ReportHazard"
                  component={ReportHazardScreen}
                  options={{ title: 'Report Hazard/Obstacle' }}
                />
                <Stack.Screen
                  name="Analytics"
                  component={AnalyticsScreen}
                  options={{ title: 'Analytics' }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </LocationProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <OfflineProvider>
        <WebSocketProvider>
          <AppContent />
        </WebSocketProvider>
      </OfflineProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  }
});
