import React from 'react';
import { Polyline } from 'react-native-maps';

const TRAFFIC_COLORS = {
  free_flow: '#34C759',    // Green
  light: '#FFCC00',         // Yellow
  moderate: '#FF9500',      // Orange
  heavy: '#FF3B30',         // Red
  severe: '#8B0000'         // Dark Red
};

/**
 * TrafficOverlay component
 * Displays traffic conditions on route using colored segments
 */
export default function TrafficOverlay({ trafficData, visible = true }) {
  if (!visible || !trafficData || trafficData.length === 0) {
    return null;
  }

  return (
    <>
      {trafficData.map((segment, index) => {
        if (!segment.startLocation || !segment.endLocation) {
          return null;
        }

        const color = TRAFFIC_COLORS[segment.congestionLevel] || TRAFFIC_COLORS.free_flow;

        return (
          <Polyline
            key={`traffic-${index}`}
            coordinates={[
              {
                latitude: segment.startLocation.latitude,
                longitude: segment.startLocation.longitude
              },
              {
                latitude: segment.endLocation.latitude,
                longitude: segment.endLocation.longitude
              }
            ]}
            strokeColor={color}
            strokeWidth={6}
            zIndex={5}
          />
        );
      })}
    </>
  );
}

// Export traffic colors for use in legend
export { TRAFFIC_COLORS };
