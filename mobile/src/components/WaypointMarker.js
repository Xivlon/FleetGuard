import React from 'react';
import { Marker, Circle } from 'react-native-maps';
import { View, Text, StyleSheet } from 'react-native';

const WAYPOINT_COLORS = {
  water_source: '#4A90E2',
  camp: '#7ED321',
  viewpoint: '#F5A623',
  danger: '#D0021B'
};

const WAYPOINT_ICONS = {
  water_source: '💧',
  camp: '⛺',
  viewpoint: '🔭',
  danger: '💀'
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
                fillColor="rgba(208, 2, 27, 0.15)" // Translucent red
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
              <View style={[
                styles.markerContainer,
                isDanger ? styles.dangerMarker : { backgroundColor: color }
              ]}>
                <Text style={styles.iconContainer}>
                  {icon}
                </Text>
              </View>
            </Marker>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5
  },
  dangerMarker: {
    backgroundColor: '#fff', // Opaque white background for danger waypoints
    borderColor: '#D0021B',
    borderWidth: 3
  },
  iconContainer: {
    fontSize: 20
  }
});

export { WAYPOINT_COLORS, WAYPOINT_ICONS };
