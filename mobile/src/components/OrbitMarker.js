import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * OrbitMarker component
 * Displays a custom marker on the map to indicate user location
 *
 * IMPORTANT: SVG rendering can be unreliable in react-native-maps Marker components.
 * This component uses a fallback approach with proper container sizing and visibility properties.
 */
export default function OrbitMarker({ color = '#10B981', size = 40 }) {
  console.log('[OrbitMarker] Rendering with color:', color, 'size:', size);

  // Calculate border width for glow effect
  const borderWidth = Math.max(2, size * 0.05);
  const glowSize = size + 8;

  // Original viewBox coordinates from orbit.svg (Lucide orbit icon)
  // The orbit icon is centered at (12, 12) in the 24x24 SVG viewBox
  const ORIGINAL_VIEWBOX_X = 10;
  const ORIGINAL_VIEWBOX_Y = 12;

  // Icon positioning and scale within the normalized viewBox
  // The new SVG is already centered and properly sized at 24x24
  // We use a 150x150 viewBox and center the icon within it
  const VIEWBOX_SIZE = 150;
  const ICON_TRANSLATE_X = VIEWBOX_SIZE / 1.5; // Center position in viewBox
  const ICON_TRANSLATE_Y = VIEWBOX_SIZE / 1.5; // Center position in viewBox
  // Scale factor: We want the icon to be approximately 60px in the 150x150 viewBox
  // 60 / 24 (original SVG size) = 2.5 (target size / original size)
  const ICON_SCALE = 2.5;
  // Border circle radius: approximately 64% of the viewBox radius for good visual balance
  const BORDER_RADIUS = VIEWBOX_SIZE * 0.32; // 48px in a 150x150 viewBox

  return (
    <View style={[styles.container, { width: glowSize, height: glowSize }]}>
      {/* Outer glow effect for better visibility */}
      <View style={[
        styles.glowEffect,
        {
          width: glowSize,
          height: glowSize,
          borderRadius: glowSize / 2,
          backgroundColor: `${color}40`, // 25% opacity
        }
      ]} />

      {/* Inner container for SVG with proper centering */}
      <View style={[
        styles.innerContainer,
        {
          width: size,
          height: size,
        }
      ]}>
        {/* Inner SVG icon with both circle border and orbit symbol */}
        <Svg
          width={size}
          height={size}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          style={styles.svg}
        >

          {/* Outer circle border with visible fill */}
          <Circle
            cx={VIEWBOX_SIZE / 2}
            cy={VIEWBOX_SIZE / 2}
            r={BORDER_RADIUS}
            stroke={color}
            strokeWidth={borderWidth * 1.5}
            fill="none"
          />

          {/* Inner orbit icon - scaled and centered */}
          {/* Orbit arcs */}
          <Path
            d="M20.341 6.484A10 10 0 0 1 10.266 21.85"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`translate(${ICON_TRANSLATE_X}, ${ICON_TRANSLATE_Y}) scale(${ICON_SCALE}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
          />
          <Path
            d="M3.659 17.516A10 10 0 0 1 13.74 2.152"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`translate(${ICON_TRANSLATE_X}, ${ICON_TRANSLATE_Y}) scale(${ICON_SCALE}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
          />
          {/* Center circle */}
          <Circle
            cx="12"
            cy="12"
            r="3"
            fill={color}
            transform={`translate(${ICON_TRANSLATE_X}, ${ICON_TRANSLATE_Y}) scale(${ICON_SCALE}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
          />
          {/* Satellite circles */}
          <Circle
            cx="19"
            cy="5"
            r="2"
            fill={color}
            transform={`translate(${ICON_TRANSLATE_X}, ${ICON_TRANSLATE_Y}) scale(${ICON_SCALE}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
          />
          <Circle
            cx="5"
            cy="19"
            r="2"
            fill={color}
            transform={`translate(${ICON_TRANSLATE_X}, ${ICON_TRANSLATE_Y}) scale(${ICON_SCALE}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
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
    overflow: 'visible', // Critical: allows glow effect to be visible
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
    elevation: 5, // Critical for Android visibility
  },
  svg: {
    backgroundColor: 'transparent',
  },
});
