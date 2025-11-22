import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export default function OrbitMarker({
  color = '#10B981',
  size = 40,
}) {
  // Slightly larger glow container than the SVG icon
  const glowPadding = 16;              // you can tweak this
  const glowSize = size + glowPadding; // outer container and glow size

  // Simple SVG coordinate system
  const VIEWBOX_SIZE = 100;
  const CENTER = VIEWBOX_SIZE / 2; // 50,50

  // Original Lucide orbit icon center (24x24 icon)
  const ORIGINAL_VIEWBOX_X = 12;
  const ORIGINAL_VIEWBOX_Y = 12;

  // How large the orbit icon appears inside the 100x100 viewBox
  const ICON_SCALE = 3.0;

  // Ring radius in viewBox units
  const RING_RADIUS = VIEWBOX_SIZE * 0.34; // tweak if needed
  const RING_STROKE_WIDTH = 4;

  return (
    <View style={[styles.container, { width: glowSize, height: glowSize }]}>
      {/* Glow: full-size circle, centered, no transforms */}
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

      {/* Centered SVG icon + ring */}
      <View
        style={[
          styles.iconContainer,
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
          {/* Outer ring, centered on orbit */}
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
  // This is what react-native-maps (or your parent) sees as "the marker view"
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible', // allow glow to extend
  },
  // Full-size glow, sitting directly under iconContainer
  glow: {
    position: 'absolute',
  },
  // Holds the SVG, centered inside container
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
