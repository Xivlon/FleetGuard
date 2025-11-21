import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
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

/**
 * Helper function to get user initials from user object
 * @param {Object} user - User object with optional firstName, lastName, and email
 * @returns {string} Two-letter initials or single letter from email, defaults to 'U'
 */
function getInitials(user) {
  if (!user) return 'U';
  
  const firstInitial = user.firstName?.[0];
  const lastInitial = user.lastName?.[0];
  
  if (firstInitial && lastInitial) {
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }
  if (user.email?.[0]) {
    return user.email[0].toUpperCase();
  }
  return 'U';
}

/**
 * UserIcon component displays user initials in a circular badge
 * @param {Object} props - Component props
 * @param {Object} props.user - User object to extract initials from
 * @returns {React.Component} Circular icon with user initials
 */
function UserIcon({ user }) {
  return (
    <View style={styles.userIconContainer}>
      <Text style={styles.userIconText}>{getInitials(user)}</Text>
    </View>
  );
}

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
              headerRight: () => (
                <View style={styles.headerIconButton}>
                  <UserIcon user={user} />
                </View>
              ),
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
              // Main app screens - Start with Navigation as initial screen
              <>
                <Stack.Screen
                  name="Navigation"
                  component={NavigationScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="FleetDashboard"
                  component={FleetDashboard}
                  options={{ title: 'Fleet Dashboard' }}
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
  },
  headerIconButton: {
    marginRight: 12,
  },
  userIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  userIconText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
