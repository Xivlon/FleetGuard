import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * SimpleLocationMarker component
 * A simple circular marker to indicate user location without SVG
 * This is a fallback in case SVG rendering is unreliable in react-native-maps
 */
export default function SimpleLocationMarker({ color = '#10B981', size = 40 }) {
  console.log('[SimpleLocationMarker] Rendering with color:', color, 'size:', size);

  return (
    <View style={[styles.container, { width: size + 8, height: size + 8 }]}>
      {/* Outer glow/pulse effect */}
      <View style={[
        styles.outerCircle,
        {
          width: size + 8,
          height: size + 8,
          borderRadius: (size + 8) / 2,
          backgroundColor: `${color}40`, // 25% opacity
        }
      ]} />

      {/* Middle white ring */}
      <View style={[
        styles.middleCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
        }
      ]} />

      {/* Inner dot */}
      <View style={[
        styles.innerCircle,
        {
          width: size * 0.5,
          height: size * 0.5,
          borderRadius: (size * 0.5) / 2,
          backgroundColor: color,
        }
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  outerCircle: {
    position: 'absolute',
  },
  middleCircle: {
    position: 'absolute',
    backgroundColor: 'white',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  innerCircle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
});
