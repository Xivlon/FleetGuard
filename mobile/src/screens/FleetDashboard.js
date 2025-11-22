import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { useWebSocket } from '../contexts/WebSocketContext';

const COLORS = {
  primary: '#10B981',
  secondary: '#059669',
  background: '#000000',
  card: '#1F1F1F',
  text: '#FFFFFF',
  border: '#10B981',
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};

export default function FleetDashboard({ navigation }) {
  const { vehicles, hazards, connected, backendUrl } = useWebSocket();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [timeFilter, setTimeFilter] = useState('24');
  const [severityFilter, setSeverityFilter] = useState('all');

  const mapRegion = {
    latitude: vehicles.length > 0 ? vehicles[0].location.latitude : 37.7749,
    longitude: vehicles.length > 0 ? vehicles[0].location.longitude : -122.4194,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  const filteredHazards = hazards.filter(hazard => {
    if (severityFilter !== 'all' && hazard.severity !== severityFilter) {
      return false;
    }
    
    if (timeFilter !== 'all') {
      const now = new Date();
      const hazardTime = new Date(hazard.timestamp);
      const hoursDiff = (now - hazardTime) / (1000 * 60 * 60);
      if (hoursDiff > parseInt(timeFilter)) {
        return false;
      }
    }
    
    return true;
  });

  const getHazardColor = (severity) => {
    switch (severity) {
      case 'high': return COLORS.high;
      case 'medium': return COLORS.medium;
      case 'low': return COLORS.low;
      default: return COLORS.medium;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {connected ? '● Connected' : '○ Disconnected'}
        </Text>
        <Text style={styles.statusText}>
          Vehicles: {vehicles.length} | Hazards: {filteredHazards.length}
        </Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={mapRegion}
          customMapStyle={darkMapStyle}
        >
          <UrlTile
            urlTemplate="https://api.maptiler.com/maps/streets-v4/style.json?key=r8Q0yFYWmx1aKjnjs4Ff"
            maximumZ={19}
            flipY={false}
          />
          {vehicles.map(vehicle => (
            <Marker
              key={vehicle.id}
              coordinate={{
                latitude: vehicle.location.latitude,
                longitude: vehicle.location.longitude,
              }}
              title={vehicle.name}
              description={`Speed: ${vehicle.speed || 0} km/h`}
              pinColor={COLORS.primary}
              onPress={() => setSelectedVehicle(vehicle)}
            />
          ))}

          {filteredHazards.map(hazard => (
            <Marker
              key={hazard.id}
              coordinate={{
                latitude: hazard.location.latitude,
                longitude: hazard.location.longitude,
              }}
              title={hazard.type}
              description={hazard.description}
              pinColor={getHazardColor(hazard.severity)}
            />
          ))}
        </MapView>
      </View>

      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Time:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['1', '6', '12', '24', 'all'].map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                timeFilter === filter && styles.filterButtonActive
              ]}
              onPress={() => setTimeFilter(filter)}
            >
              <Text style={[
                styles.filterButtonText,
                timeFilter === filter && styles.filterButtonTextActive
              ]}>
                {filter === 'all' ? 'All' : `${filter}h`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>Severity:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'low', 'medium', 'high'].map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                severityFilter === filter && styles.filterButtonActive
              ]}
              onPress={() => setSeverityFilter(filter)}
            >
              <Text style={[
                styles.filterButtonText,
                severityFilter === filter && styles.filterButtonTextActive
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Navigation')}
        >
          <Text style={styles.actionButtonText}>Navigate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.reportButton]}
          onPress={() => navigation.navigate('ReportHazard')}
        >
          <Text style={styles.actionButtonText}>Report Issue</Text>
        </TouchableOpacity>
      </View>

      {selectedVehicle && (
        <View style={styles.vehicleInfoCard}>
          <Text style={styles.vehicleInfoTitle}>{selectedVehicle.name}</Text>
          <Text style={styles.vehicleInfoText}>
            Status: {selectedVehicle.status}
          </Text>
          <Text style={styles.vehicleInfoText}>
            Speed: {selectedVehicle.speed || 0} km/h
          </Text>
          <Text style={styles.vehicleInfoText}>
            Last Update: {new Date(selectedVehicle.lastUpdate).toLocaleTimeString()}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedVehicle(null)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
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
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#10B981' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2C2C2C' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#000000' }],
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  statusText: {
    color: COLORS.text,
    fontSize: 12,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  filtersContainer: {
    padding: 12,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
  },
  filterLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.card,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  reportButton: {
    backgroundColor: COLORS.secondary,
  },
  actionButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  vehicleInfoCard: {
    position: 'absolute',
    bottom: 120,
    left: 12,
    right: 12,
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  vehicleInfoTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  vehicleInfoText: {
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 4,
  },
  closeButton: {
    marginTop: 12,
    padding: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
});
