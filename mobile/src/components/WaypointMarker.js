import React from 'react';
import { Marker, Circle } from 'react-native-maps';
import { View, Text, StyleSheet } from 'react-native';

const WAYPOINT_COLORS = {
  water_source: '#10B981', // Primary green
  camp: '#059669',         // Secondary green
  viewpoint: '#34D399',    // Light green
  danger: '#EF4444'        // Red (for contrast)
};

const WAYPOINT_ICONS = {
  water_source: '💧',
  camp: '⛺',
  viewpoint: '🔭',
  danger: '💀'
};

const WAYPOINT_LABELS = {
  water_source: 'WATER',
  camp: 'CAMP',
  viewpoint: 'VIEW',
  danger: 'DANGER'
};

/**
 * WaypointMarker component
 * Displays waypoints as markers with special rendering for danger waypoints
 */
export default function WaypointMarker({ waypoints, onWaypointPress }) {
  if (!waypoints || waypoints.length === 0) {
    return null;
  }

  return (
    <>
      {waypoints.map((waypoint) => {
        if (!waypoint.location) return null;

        const color = WAYPOINT_COLORS[waypoint.type] || WAYPOINT_COLORS.viewpoint;
        const icon = WAYPOINT_ICONS[waypoint.type] || WAYPOINT_ICONS.viewpoint;
        const label = WAYPOINT_LABELS[waypoint.type] || WAYPOINT_LABELS.viewpoint;
        const isDanger = waypoint.type === 'danger';

        return (
          <View key={waypoint.id}>
            {/* Notification radius circle for danger waypoints */}
            {isDanger && (
              <Circle
                center={{
                  latitude: waypoint.location.latitude,
                  longitude: waypoint.location.longitude
                }}
                radius={waypoint.notificationRadius || 500}
                fillColor="rgba(239, 68, 68, 0.15)" // Translucent red
                strokeColor={color}
                strokeWidth={2}
                zIndex={5}
              />
            )}

            {/* Waypoint marker */}
            <Marker
              coordinate={{
                latitude: waypoint.location.latitude,
                longitude: waypoint.location.longitude
              }}
              title={waypoint.name || waypoint.type.replace('_', ' ').toUpperCase()}
              description={waypoint.description || 'No description'}
              onPress={() => onWaypointPress && onWaypointPress(waypoint)}
              zIndex={isDanger ? 11 : 8}
            >
              <View style={styles.markerWrapper}>
                <View style={[
                  styles.markerContainer,
                  isDanger ? styles.dangerMarker : { backgroundColor: color }
                ]}>
                  <Text style={styles.iconContainer}>
                    {icon}
                  </Text>
                </View>
                <View style={[
                  styles.labelContainer,
                  { backgroundColor: color }
                ]}>
                  <Text style={styles.labelText}>{label}</Text>
                </View>
              </View>
            </Marker>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  markerWrapper: {
    alignItems: 'center'
  },
  markerContainer: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#10B981', // Green border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5
  },
  dangerMarker: {
    backgroundColor: '#1F1F1F', // Dark background for danger waypoints
    borderColor: '#EF4444',     // Red border
    borderWidth: 3
  },
  iconContainer: {
    fontSize: 20
  },
  labelContainer: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3
  },
  labelText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center'
  }
});

export { WAYPOINT_COLORS, WAYPOINT_ICONS, WAYPOINT_LABELS };
