import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * OrbitMarker component
 * Displays a custom marker on the map to indicate user location
 *
 * - Orbit icon centered in the SVG
 * - Outer ring centered on the orbit
 * - Glow centered on both, not clipped
 */
export default function OrbitMarker({
  color = '#10B981',
  size = 40,
}) {
  // How much bigger the glow is than the SVG icon (in pixels)
  const glowPadding = 16;              // tweak this to grow/shrink the glow
  const glowSize = size + glowPadding; // outer RN container & glow circle size

  // Simple SVG coordinate system
  const VIEWBOX_SIZE = 100;
  const CENTER = VIEWBOX_SIZE / 2; // 50,50 is the center

  // Original Lucide orbit SVG is centered around (12, 12) in a 24x24 box
  const ORIGINAL_VIEWBOX_X = 12;
  const ORIGINAL_VIEWBOX_Y = 12;

  // How large the orbit icon appears inside the 100x100 viewBox
  const ICON_SCALE = 3.0; // increase/decrease to change icon size relative to ring

  // Ring radius in viewBox units; chosen to sit just inside the glow
  const RING_RADIUS = VIEWBOX_SIZE * 0.34; // 34 in a 100x100 viewBox
  const RING_STROKE_WIDTH = 4; // in viewBox units; tweak by eye

  return (
    <View style={[styles.container, { width: glowSize, height: glowSize }]}>
      {/* Glow: centered, no transforms, large enough not to clip */}
      <View
        style={[
          styles.glowEffect,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: `${color}40`, // 25% opacity
          },
        ]}
      />

      {/* Centered SVG icon + ring */}
      <View
        style={[
          styles.innerContainer,
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
          style={styles.svg}
        >
          {/* Outer ring, centered on the orbit */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RING_RADIUS}
            stroke={color}
            strokeWidth={RING_STROKE_WIDTH}
            fill="none"
          />

          {/* Orbit arcs */}
          <Path
            d="M20.341 6.484A10 10 0 0 1 10.266 21.85"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`translate(${CENTER}, ${CENTER}) scale(${ICON_SCALE}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
          />
          <Path
            d="M3.659 17.516A10 10 0 0 1 13.74 2.152"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`translate(${CENTER}, ${CENTER}) scale(${ICON_SCALE}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
          />

          {/* Center circle */}
          <Circle
            cx="12"
            cy="12"
            r="3"
            fill={color}
            transform={`translate(${CENTER}, ${CENTER}) scale(${ICON_SCALE}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
          />

          {/* Satellite circles */}
          <Circle
            cx="19"
            cy="5"
            r="2"
            fill={color}
            transform={`translate(${CENTER}, ${CENTER}) scale(${ICON_SCALE}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
          />
          <Circle
            cx="5"
            cy="19"
            r="2"
            fill={color}
            transform={`translate(${CENTER}, ${CENTER}) scale(${ICON_SCALE}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible', // allows glow to extend past bounds
  },
  glowEffect: {
    position: 'absolute',
  },
  innerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  svg: {
    backgroundColor: 'transparent',
  },
});
