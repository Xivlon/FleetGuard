import React from 'react';
import { Marker, Circle } from 'react-native-maps';
import { View, StyleSheet } from 'react-native';

const OBSTACLE_COLORS = {
  low: '#FFCC00',
  medium: '#FF9500',
  high: '#FF3B30',
  critical: '#8B0000'
};

const OBSTACLE_ICONS = {
  accident: '🚗💥',
  construction: '🚧',
  road_closure: '🚫',
  debris: '⚠️',
  weather: '🌧️',
  traffic_jam: '🚦',
  other: '⚠️'
};

/**
 * ObstacleMarkers component
 * Displays obstacles as markers with red zones
 */
export default function ObstacleMarkers({ obstacles, onObstaclePress }) {
  if (!obstacles || obstacles.length === 0) {
    return null;
  }

  return (
    <>
      {obstacles.map((obstacle) => {
        if (!obstacle.location) return null;

        const color = OBSTACLE_COLORS[obstacle.severity] || OBSTACLE_COLORS.medium;
        const icon = OBSTACLE_ICONS[obstacle.type] || OBSTACLE_ICONS.other;

        return (
          <View key={obstacle.id}>
            {/* Red zone circle */}
            <Circle
              center={{
                latitude: obstacle.location.latitude,
                longitude: obstacle.location.longitude
              }}
              radius={obstacle.radius || 100}
              fillColor={`${color}40`} // 25% opacity
              strokeColor={color}
              strokeWidth={2}
              zIndex={10}
            />

            {/* Obstacle marker */}
            <Marker
              coordinate={{
                latitude: obstacle.location.latitude,
                longitude: obstacle.location.longitude
              }}
              title={`${obstacle.type.replace('_', ' ')} - ${obstacle.severity}`}
              description={obstacle.description || 'No description'}
              onPress={() => onObstaclePress && onObstaclePress(obstacle)}
              zIndex={11}
            >
              <View style={[styles.markerContainer, { backgroundColor: color }]}>
                <View style={styles.iconContainer}>
                  {icon}
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
  iconContainer: {
    fontSize: 20
  }
});

export { OBSTACLE_COLORS };
