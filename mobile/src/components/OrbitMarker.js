import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export default function OrbitMarker({
  color = '#10B981',
  size = 40,
}) {
  // Size of the whole marker box that the Marker will render
  const glowPadding = 20;              // how much bigger the glow is than the SVG
  const glowSize = size + glowPadding; // outer container and glow size

  const VIEWBOX_SIZE = 100;
  const CENTER = VIEWBOX_SIZE / 2; // (50, 50)

  const RING_RADIUS = VIEWBOX_SIZE * 0.35;
  const RING_STROKE_WIDTH = 4;

  return (
    <View style={[styles.container, { width: glowSize, height: glowSize }]}>
      {/* Glow: centered, fills the whole container */}
      <View
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: `${color}40`,
          },
        ]}
      />

      {/* Icon: centered square inside the glow */}
      <View
        style={[
          styles.iconBox,
          {
            width: size,
            height: size,
          },
        ]}
      >
        <Svg
          width={size}
          height={size}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        >
          {/* Outer ring */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RING_RADIUS}
            stroke={color}
            strokeWidth={RING_STROKE_WIDTH}
            fill="none"
          />

          {/* Orbit arcs - drawn relative to center */}
          <Path
            d="M 32.1 29.7 A 15 15 0 0 1 34.6 57.8"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M 67.9 70.3 A 15 15 0 0 1 65.4 42.2"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Center circle */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r="4.5"
            fill={color}
          />

          {/* Satellites */}
          <Circle
            cx="60.5"
            cy="39.5"
            r="3"
            fill={color}
          />
          <Circle
            cx="39.5"
            cy="60.5"
            r="3"
            fill={color}
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // This is the view the Map Marker uses
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glow: {
    position: 'absolute',
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
