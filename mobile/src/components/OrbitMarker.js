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

          {/* Orbit arcs - original Lucide paths with transforms applied */}
          <Path
            d="M 75.023 33.452 A 30 30 0 0 1 44.798 79.55"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M 24.977 66.548 A 30 30 0 0 1 55.22 20.456"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Center circle */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r="9"
            fill={color}
          />

          {/* Satellites */}
          <Circle
            cx="71"
            cy="29"
            r="6"
            fill={color}
          />
          <Circle
            cx="29"
            cy="71"
            r="6"
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
