import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { useWebSocket } from '../contexts/WebSocketContext';
import { watchPosition, calculateHeading } from '../services/location';

const COLORS = {
  primary: '#10B981',
  secondary: '#059669',
  background: '#000000',
  card: '#1F1F1F',
  text: '#FFFFFF',
  border: '#10B981',
  routeColor: '#10B981',
};

// Helper function to normalize coordinates from either array [lng, lat] or object {latitude, longitude}
const normalizeCoord = (coord) => {
  if (!coord) return null;
  
  // If it's already an object with latitude and longitude, return it
  if (typeof coord === 'object' && coord.latitude !== undefined && coord.longitude !== undefined) {
    return { latitude: coord.latitude, longitude: coord.longitude };
  }
  
  // If it's an array [lng, lat], convert to object
  if (Array.isArray(coord) && coord.length >= 2) {
    return { latitude: coord[1], longitude: coord[0] };
  }
  
  return null;
};

export default function NavigationScreen({ navigation }) {
  const { hazards, backendUrl, routes, sendVehiclePosition } = useWebSocket();
  const [startLat, setStartLat] = useState('37.7749');
  const [startLon, setStartLon] = useState('-122.4194');
  const [endLat, setEndLat] = useState('37.7849');
  const [endLon, setEndLon] = useState('-122.4094');
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [vehicleId] = useState('demo-vehicle');
  const [followMe, setFollowMe] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [isRerouting, setIsRerouting] = useState(false);
  const mapRef = useRef(null);
  const lastPositionRef = useRef(null);

  useEffect(() => {
    if (routes[vehicleId]) {
      const newRoute = routes[vehicleId];
      const routeChanged = !route || 
        route.timestamp !== newRoute.timestamp ||
        route.coordinates?.length !== newRoute.coordinates?.length;
      
      if (routeChanged) {
        // If we have an existing route and it changed, we're receiving a re-route
        if (route && route.timestamp !== newRoute.timestamp) {
          console.log('Route updated - re-routing complete');
        }
        
        setRoute(newRoute);
        setIsRerouting(false);
        
        // If following and new route arrives, fit camera to route
        if (followMe && mapRef.current && newRoute.coordinates?.length > 0) {
          setTimeout(() => {
            mapRef.current?.fitToCoordinates(
              newRoute.coordinates.map(coord => normalizeCoord(coord)).filter(c => c),
              {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
              }
            );
          }, 100);
        }
      }
    }
  }, [routes, vehicleId]);

  // Location tracking effect
  useEffect(() => {
    let subscription = null;
    
    const startLocationTracking = async () => {
      try {
        subscription = await watchPosition((location) => {
          const { latitude, longitude, coords } = location;
          const currentPosition = {
            latitude: coords?.latitude || latitude,
            longitude: coords?.longitude || longitude,
          };
          
          setUserLocation(currentPosition);
          
          // Calculate heading if we have a previous position
          let heading = coords?.heading;
          if (!heading && lastPositionRef.current) {
            heading = calculateHeading(lastPositionRef.current, currentPosition);
          }
          
          // Send position to backend
          sendVehiclePosition(
            vehicleId,
            currentPosition.latitude,
            currentPosition.longitude,
            coords?.speed || 0,
            heading || 0
          );
          
          lastPositionRef.current = currentPosition;
          
          // Follow user if enabled
          if (followMe && mapRef.current) {
            mapRef.current.animateCamera({
              center: currentPosition,
              heading: heading || 0,
              pitch: 45,
              zoom: 16,
            }, { duration: 500 });
          }
        });
        
        setLocationSubscription(subscription);
      } catch (error) {
        console.error('Failed to start location tracking:', error);
        Alert.alert('Location Error', 'Failed to access location services. Please enable location permissions.');
      }
    };
    
    if (route) {
      startLocationTracking();
    }
    
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [route, followMe, vehicleId, sendVehiclePosition]);

  const calculateRoute = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/routes/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: {
            latitude: parseFloat(startLat),
            longitude: parseFloat(startLon),
          },
          end: {
            latitude: parseFloat(endLat),
            longitude: parseFloat(endLon),
          },
          vehicleId: vehicleId,
        }),
      });

      const data = await response.json();
      setRoute(data);
      setCurrentStep(0);
      
      if (data.fallback) {
        Alert.alert(
          'Using Fallback Routing',
          'GraphHopper API not configured. Using simple routing. Add GRAPHHOPPER_API_KEY for full features.'
        );
      }
    } catch (error) {
      console.error('Route calculation error:', error);
      Alert.alert('Error', 'Failed to calculate route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkHazardsOnRoute = () => {
    if (!route) return [];
    
    const routeHazards = [];
    hazards.forEach(hazard => {
      route.coordinates?.forEach(coord => {
        const normalized = normalizeCoord(coord);
        if (!normalized) return;
        
        const distance = calculateDistance(
          normalized,
          hazard.location
        );
        if (distance < 500) {
          routeHazards.push({ ...hazard, distance });
        }
      });
    });
    
    return routeHazards.filter((h, i, arr) => 
      arr.findIndex(x => x.id === h.id) === i
    );
  };

  const calculateDistance = (point1, point2) => {
    const R = 6371000;
    const lat1 = point1.latitude * Math.PI / 180;
    const lat2 = point2.latitude * Math.PI / 180;
    const deltaLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const deltaLon = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const routeHazards = route ? checkHazardsOnRoute() : [];

  const mapRegion = route ? {
    latitude: (parseFloat(startLat) + parseFloat(endLat)) / 2,
    longitude: (parseFloat(startLon) + parseFloat(endLon)) / 2,
    latitudeDelta: Math.abs(parseFloat(endLat) - parseFloat(startLat)) * 2 || 0.1,
    longitudeDelta: Math.abs(parseFloat(endLon) - parseFloat(startLon)) * 2 || 0.1,
  } : {
    latitude: parseFloat(startLat),
    longitude: parseFloat(startLon),
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Start Location</Text>
        <View style={styles.coordRow}>
          <TextInput
            style={styles.input}
            value={startLat}
            onChangeText={setStartLat}
            placeholder="Latitude"
            placeholderTextColor="#666"
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            value={startLon}
            onChangeText={setStartLon}
            placeholder="Longitude"
            placeholderTextColor="#666"
            keyboardType="numeric"
          />
        </View>

        <Text style={styles.label}>End Location</Text>
        <View style={styles.coordRow}>
          <TextInput
            style={styles.input}
            value={endLat}
            onChangeText={setEndLat}
            placeholder="Latitude"
            placeholderTextColor="#666"
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            value={endLon}
            onChangeText={setEndLon}
            placeholder="Longitude"
            placeholderTextColor="#666"
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          style={styles.calculateButton}
          onPress={calculateRoute}
          disabled={loading}
        >
          <Text style={styles.calculateButtonText}>
            {loading ? 'Calculating...' : 'Calculate Route'}
          </Text>
        </TouchableOpacity>
      </View>

      {route && (
        <View style={styles.routeInfoContainer}>
          <Text style={styles.routeInfoText}>
            Distance: {(route.distance / 1000).toFixed(2)} km
          </Text>
          <Text style={styles.routeInfoText}>
            Duration: {(route.duration / 60000).toFixed(0)} min
          </Text>
          {routeHazards.length > 0 && (
            <Text style={styles.warningText}>
              ⚠️ {routeHazards.length} hazard(s) on route
            </Text>
          )}
        </View>
      )}

      {isRerouting && (
        <View style={styles.reroutingBanner}>
          <ActivityIndicator color={COLORS.primary} size="small" />
          <Text style={styles.reroutingText}>Recalculating route...</Text>
        </View>
      )}

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          region={mapRegion}
          customMapStyle={darkMapStyle}
        >
          <UrlTile
            urlTemplate="https://api.maptiler.com/maps/streets-v4/style.json?key=r8Q0yFYWmx1aKjnjs4Ff"
            maximumZ={19}
            flipY={false}
          />
          <Marker
            coordinate={{
              latitude: parseFloat(startLat),
              longitude: parseFloat(startLon),
            }}
            title="Start"
            pinColor={COLORS.primary}
          />
          <Marker
            coordinate={{
              latitude: parseFloat(endLat),
              longitude: parseFloat(endLon),
            }}
            title="Destination"
            pinColor={COLORS.secondary}
          />

          {userLocation && (
            <Marker
              coordinate={userLocation}
              title="Your Location"
              pinColor="#3B82F6"
              anchor={{ x: 0.5, y: 0.5 }}
            />
          )}

          {route && route.coordinates && (
            <Polyline
              coordinates={route.coordinates
                .map(coord => normalizeCoord(coord))
                .filter(coord => coord !== null)}
              strokeColor={COLORS.routeColor}
              strokeWidth={4}
            />
          )}

          {routeHazards.map(hazard => (
            <Marker
              key={hazard.id}
              coordinate={{
                latitude: hazard.location.latitude,
                longitude: hazard.location.longitude,
              }}
              title={hazard.type}
              description={hazard.description}
              pinColor="#EF4444"
            />
          ))}
        </MapView>

        {route && (
          <TouchableOpacity
            style={styles.followMeButton}
            onPress={() => setFollowMe(!followMe)}
          >
            <Text style={styles.followMeButtonText}>
              {followMe ? '📍 Following' : '📍 Follow Me'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {route && route.instructions && route.instructions.length > 0 && (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Turn-by-Turn</Text>
          <ScrollView style={styles.instructionsList}>
            {route.instructions.map((instruction, index) => (
              <View
                key={index}
                style={[
                  styles.instructionItem,
                  index === currentStep && styles.instructionItemActive
                ]}
              >
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.instructionContent}>
                  <Text style={styles.instructionText}>
                    {instruction.text}
                  </Text>
                  {instruction.distance > 0 && (
                    <Text style={styles.instructionDistance}>
                      {(instruction.distance / 1000).toFixed(1)} km
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
          
          {currentStep < route.instructions.length - 1 && (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setCurrentStep(currentStep + 1)}
            >
              <Text style={styles.nextButtonText}>Next Step</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#10B981' }] },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2C2C2C' }],
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  inputContainer: {
    padding: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  label: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  coordRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  calculateButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  calculateButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  routeInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  routeInfoText: {
    color: COLORS.text,
    fontSize: 14,
  },
  warningText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  instructionsContainer: {
    maxHeight: 200,
    backgroundColor: COLORS.card,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
    padding: 12,
  },
  instructionsTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instructionsList: {
    maxHeight: 120,
  },
  instructionItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 8,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  instructionItemActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  instructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  instructionContent: {
    flex: 1,
  },
  instructionText: {
    color: COLORS.text,
    fontSize: 14,
  },
  instructionDistance: {
    color: COLORS.primary,
    fontSize: 12,
    marginTop: 4,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  nextButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  reroutingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    gap: 8,
  },
  reroutingText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  followMeButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  followMeButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
