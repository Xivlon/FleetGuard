import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import FleetDashboard from './src/screens/FleetDashboard';
import NavigationScreen from './src/screens/NavigationScreen';
import ReportHazardScreen from './src/screens/ReportHazardScreen';
import { WebSocketProvider } from './src/contexts/WebSocketContext';

const Stack = createStackNavigator();

const COLORS = {
  primary: '#10B981',
  secondary: '#059669',
  background: '#000000',
  card: '#1F1F1F',
  text: '#FFFFFF',
  border: '#10B981',
};

export default function App() {
  return (
    <WebSocketProvider>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: COLORS.primary,
            background: COLORS.background,
            card: COLORS.card,
            text: COLORS.text,
            border: COLORS.border,
            notification: COLORS.primary,
          },
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: COLORS.card,
              borderBottomColor: COLORS.primary,
              borderBottomWidth: 2,
            },
            headerTintColor: COLORS.primary,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 20,
            },
          }}
        >
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
            options={{ title: 'Report Hazard' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </WebSocketProvider>
  );
}
