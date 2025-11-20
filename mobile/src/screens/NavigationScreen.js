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
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { watchPosition, calculateHeading } from '../services/location';
import TrafficOverlay from '../components/TrafficOverlay';
import ObstacleMarkers from '../components/ObstacleMarkers';
import WaypointMarker from '../components/WaypointMarker';
import MinecraftClock from '../components/MinecraftClock';
import WaypointModal from '../components/WaypointModal';

const COLORS = {
  primary: '#10B981',
  secondary: '#059669',
  background: '#000000',
  card: '#1F1F1F',
  text: '#FFFFFF',
  border: '#10B981',
  routeColor: '#10B981',
  userLocation: '#10B981',
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
  const { hazards, obstacles, waypoints, backendUrl, routes, sendVehiclePosition } = useWebSocket();
  const { currentLocation, permissionStatus, requestPermissions, openSettings } = useLocation();
  const { token } = useAuth();
  const [startLat, setStartLat] = useState('37.7749');
  const [startLon, setStartLon] = useState('-122.4194');
  const [endLat, setEndLat] = useState('37.7849');
  const [endLon, setEndLon] = useState('-122.4094');
  const [useMyLocation, setUseMyLocation] = useState(true);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [vehicleId] = useState('demo-vehicle');
  const [followMe, setFollowMe] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [isRerouting, setIsRerouting] = useState(false);
  const [waypointModalVisible, setWaypointModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [dangerAlertShown, setDangerAlertShown] = useState(new Set());
  const mapRef = useRef(null);
  const lastPositionRef = useRef(null);
  const initialCameraSetRef = useRef(false);

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

  // Location tracking effect - starts immediately, not just when route exists
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
          
          // Immediately center on user location on first update
          if (!initialCameraSetRef.current && mapRef.current) {
            mapRef.current.animateCamera({
              center: currentPosition,
              heading: heading || 0,
              pitch: 45,
              zoom: 16,
            }, { duration: 1000 });
            initialCameraSetRef.current = true;
          }
          
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
    
    // Start tracking immediately, not waiting for route
    startLocationTracking();
    
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [followMe, vehicleId, sendVehiclePosition]);

  // Auto-rerouting effect - monitors obstacles and traffic
  useEffect(() => {
    if (!route || isRerouting || !userLocation) return;

    const checkAndReroute = async () => {
      const routeObstacles = checkObstaclesOnRoute();
      const hasSevereTraffic = checkSevereTrafficOnRoute();

      // Only reroute if we have critical obstacles or severe traffic
      const criticalObstacles = routeObstacles.filter(
        o => o.severity === 'critical' || o.severity === 'high'
      );

      if (criticalObstacles.length > 0) {
        Alert.alert(
          'Route Obstacle Detected',
          `${criticalObstacles.length} ${criticalObstacles.length > 1 ? 'obstacles' : 'obstacle'} detected on your route. Recalculating...`,
          [{ text: 'OK' }]
        );
        setIsRerouting(true);

        // Get destination from route
        const destination = route.coordinates?.[route.coordinates.length - 1];
        if (destination) {
          const normalizedDest = normalizeCoord(destination);
          await calculateRoute();
        }
      } else if (hasSevereTraffic) {
        Alert.alert(
          'Heavy Traffic Detected',
          'Severe traffic detected on your route. Recalculating for faster route...',
          [{ text: 'OK' }]
        );
        setIsRerouting(true);
        await calculateRoute();
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkAndReroute, 30000);

    // Also check immediately
    checkAndReroute();

    return () => clearInterval(interval);
  }, [route, obstacles, userLocation, isRerouting]);

  const calculateRoute = async () => {
    // Check if we should use current location
    let startCoords;
    if (useMyLocation && currentLocation) {
      startCoords = currentLocation;
    } else if (useMyLocation && permissionStatus === 'denied') {
      Alert.alert(
        'Location Permission Required',
        'Please grant location permission to use your current location as the start point.',
        [
          { text: 'Open Settings', onPress: openSettings },
          { text: 'Retry', onPress: requestPermissions },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    } else if (useMyLocation && !currentLocation) {
      Alert.alert(
        'Location Unavailable',
        'Waiting for location... Please try again in a moment.',
        [
          { text: 'Use Manual Coordinates', onPress: () => setUseMyLocation(false) },
          { text: 'OK' }
        ]
      );
      return;
    } else {
      // Use manual coordinates
      startCoords = {
        latitude: parseFloat(startLat),
        longitude: parseFloat(startLon),
      };
    }

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/routes/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: startCoords,
          end: {
            latitude: parseFloat(endLat),
            longitude: parseFloat(endLon),
          },
          vehicleId: vehicleId,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate route');
      }
      
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
      Alert.alert('Error', error.message || 'Failed to calculate route. Please try again.');
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

  const checkObstaclesOnRoute = () => {
    if (!route || !obstacles) return [];

    const routeObstacles = [];
    obstacles.forEach(obstacle => {
      if (obstacle.status !== 'active') return;

      route.coordinates?.forEach(coord => {
        const normalized = normalizeCoord(coord);
        if (!normalized) return;

        const distance = calculateDistance(
          normalized,
          obstacle.location
        );
        if (distance <= (obstacle.radius || 100)) {
          routeObstacles.push({ ...obstacle, distance });
        }
      });
    });

    return routeObstacles.filter((o, i, arr) =>
      arr.findIndex(x => x.id === o.id) === i
    );
  };

  const checkSevereTrafficOnRoute = () => {
    if (!route || !route.trafficData) return false;

    // Check if more than 30% of route segments have severe or heavy traffic
    const severeSegments = route.trafficData.filter(
      segment => segment.congestionLevel === 'severe' || segment.congestionLevel === 'heavy'
    );

    return severeSegments.length > route.trafficData.length * 0.3;
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

  // Handle map long press to create waypoint
  const handleMapLongPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    setWaypointModalVisible(true);
  };

  // Submit waypoint to backend
  const handleWaypointSubmit = async (waypointData) => {
    try {
      const response = await fetch(`${backendUrl}/api/waypoints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(waypointData)
      });

      if (!response.ok) {
        throw new Error('Failed to create waypoint');
      }

      const data = await response.json();
      console.log('Waypoint created:', data);
      Alert.alert('Success', 'Waypoint created successfully!');
    } catch (error) {
      console.error('Error creating waypoint:', error);
      throw error;
    }
  };

  // Check for danger waypoint proximity and alert
  useEffect(() => {
    if (!userLocation || !waypoints) return;

    const dangerWaypoints = waypoints.filter(w => w.type === 'danger');

    dangerWaypoints.forEach(waypoint => {
      const distance = calculateDistance(userLocation, waypoint.location);
      const radius = waypoint.notificationRadius || 500;
      const resetRadius = radius * 2;

      // If within notification radius and not already shown
      if (distance <= radius && !dangerAlertShown.has(waypoint.id)) {
        Alert.alert(
          '⚠️ Danger Zone Alert',
          `${waypoint.name || 'Danger waypoint'} ahead!\n\nDistance: ${Math.round(distance)}m\n${waypoint.description ? '\n' + waypoint.description : ''}`,
          [{ text: 'OK' }]
        );
        setDangerAlertShown(prev => new Set(prev).add(waypoint.id));
      }

      // Reset alert when moving away (2x radius)
      if (distance > resetRadius && dangerAlertShown.has(waypoint.id)) {
        setDangerAlertShown(prev => {
          const newSet = new Set(prev);
          newSet.delete(waypoint.id);
          return newSet;
        });
      }
    });
  }, [userLocation, waypoints]);

  const routeHazards = route ? checkHazardsOnRoute() : [];
  const routeObstaclesOnPath = route ? checkObstaclesOnRoute() : [];

  // Default map region - prefer current location if available
  const mapRegion = currentLocation ? {
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : route ? {
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
      {/* Location Status Indicator */}
      <View style={styles.locationStatusBar}>
        <View style={styles.locationStatusContent}>
          <Text style={styles.locationStatusText}>
            📍 Location: {
              permissionStatus === 'checking' ? 'Checking...' :
              permissionStatus === 'granted' && currentLocation ? 'Active' :
              permissionStatus === 'granted' && !currentLocation ? 'Searching...' :
              permissionStatus === 'denied' ? 'Denied' :
              'Unavailable'
            }
          </Text>
          {permissionStatus === 'denied' && (
            <View style={styles.permissionActions}>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={openSettings}
              >
                <Text style={styles.permissionButtonText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestPermissions}
              >
                <Text style={styles.permissionButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.inputContainer}>
        {/* Toggle for using my location */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setUseMyLocation(!useMyLocation)}
          >
            <View style={[styles.checkbox, useMyLocation && styles.checkboxChecked]}>
              {useMyLocation && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.toggleLabel}>Use my location as start</Text>
          </TouchableOpacity>
        </View>

        {!useMyLocation && (
          <>
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
          </>
        )}

        {useMyLocation && currentLocation && (
          <View style={styles.currentLocationDisplay}>
            <Text style={styles.label}>Current Location (Start)</Text>
            <Text style={styles.coordText}>
              {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </Text>
          </View>
        )}

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
          {routeObstaclesOnPath.length > 0 && (
            <Text style={styles.warningText}>
              🚧 {routeObstaclesOnPath.length} obstacle(s) on path
            </Text>
          )}
          {route.trafficData && route.trafficData.length > 0 && (
            <Text style={styles.routeInfoText}>
              🚦 Traffic data available
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
          initialRegion={currentLocation || mapRegion}
          customMapStyle={darkMapStyle}
          onLongPress={handleMapLongPress}
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
              pinColor={COLORS.userLocation}
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

          {/* Traffic Overlay */}
          {route && route.trafficData && (
            <TrafficOverlay trafficData={route.trafficData} visible={true} />
          )}

          {/* Obstacle Markers with Red Zones */}
          <ObstacleMarkers
            obstacles={obstacles || []}
            onObstaclePress={(obstacle) => {
              Alert.alert(
                `${obstacle.type.replace('_', ' ')} - ${obstacle.severity}`,
                obstacle.description || 'No description available',
                [
                  { text: 'OK' },
                  { text: 'Report Location Issue', onPress: () => navigation.navigate('ReportHazard') }
                ]
              );
            }}
          />

          {/* Waypoint Markers */}
          <WaypointMarker
            waypoints={waypoints || []}
            onWaypointPress={(waypoint) => {
              Alert.alert(
                `${waypoint.type.replace('_', ' ').toUpperCase()}`,
                `${waypoint.name ? waypoint.name + '\n\n' : ''}${waypoint.description || 'No description available'}`,
                [{ text: 'OK' }]
              );
            }}
          />
        </MapView>

        {/* Minecraft-style Clock */}
        <MinecraftClock />

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

      {/* Waypoint Creation Modal */}
      <WaypointModal
        visible={waypointModalVisible}
        location={selectedLocation}
        onClose={() => setWaypointModalVisible(false)}
        onSubmit={handleWaypointSubmit}
      />
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
  locationStatusBar: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  locationStatusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationStatusText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  permissionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  permissionButtonText: {
    color: COLORS.background,
    fontSize: 11,
    fontWeight: 'bold',
  },
  toggleContainer: {
    marginBottom: 12,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  currentLocationDisplay: {
    marginBottom: 12,
  },
  coordText: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: 'monospace',
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
