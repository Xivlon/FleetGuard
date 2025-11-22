import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * OrbitMarker component
 * Displays a custom marker on the map to indicate user location
 *
 * NOTE: This variant supports nudging the RN glow view and the SVG outer ring
 * using either device pixels OR viewBox units (so you can tweak using the same
 * coordinate system as the SVG: ORIGINAL_VIEWBOX_X / ORIGINAL_VIEWBOX_Y).
 */
export default function OrbitMarker({
  color = '#10B981',
  size = 40,
  // Pixel offsets for the RN glow view (easy: provide px)
  glowOffsetX = -14,
  glowOffsetY = -15,
  // Pixel offsets for the SVG outer ring (px). These are converted to viewBox units.
  borderOffsetX = -14.8,
  borderOffsetY = -16,
  // ViewBox unit offsets (use the same coordinate system as the SVG: ORIGINAL_VIEWBOX_X/Y)
  glowOffsetUnitsX = 0,
  glowOffsetUnitsY = 0,
  borderOffsetUnitsX = 0,
  borderOffsetUnitsY = 0,
}) {
  console.log(
    '[OrbitMarker] color:',
    color,
    'size:',
    size,
    'glowOffsetX(px):',
    glowOffsetX,
    'glowOffsetY(px):',
    glowOffsetY,
    'glowOffsetUnitsX:',
    glowOffsetUnitsX,
    'glowOffsetUnitsY:',
    glowOffsetUnitsY,
    'borderOffsetX(px):',
    borderOffsetX,
    'borderOffsetY(px):',
    borderOffsetY,
    'borderOffsetUnitsX:',
    borderOffsetUnitsX,
    'borderOffsetUnitsY:',
    borderOffsetUnitsY
  );

  // Calculate border width for glow effect
  const borderWidth = Math.max(2, size * 0.05);
  const glowSize = size + 0;

  // Original viewBox coordinates from orbit.svg (Lucide orbit icon)
  // Using 27 as the reference point for positioning (intentionally set for proper alignment)
  const ORIGINAL_VIEWBOX_X = 25;
  const ORIGINAL_VIEWBOX_Y = 25;

  // Icon positioning and scale within the normalized viewBox
  const VIEWBOX_SIZE = 100;
  const ICON_TRANSLATE_X = VIEWBOX_SIZE / 1.5; // where the orbit is placed in viewBox units
  const ICON_TRANSLATE_Y = VIEWBOX_SIZE / 1.5;
  const ICON_SCALE = 2.5;
  const BORDER_RADIUS = VIEWBOX_SIZE * 0.32; // 32 in a 100 viewBox

  // Map viewBox units -> pixels for the current rendered size
  const unitToPixel = size / VIEWBOX_SIZE;
  const viewCenter = VIEWBOX_SIZE / 2;

  // Base offset (units) from the viewBox center to where the icon is placed
  const baseOffsetUnitsX = ICON_TRANSLATE_X - viewCenter;
  const baseOffsetUnitsY = ICON_TRANSLATE_Y - viewCenter;

  // Combine base offset with user-supplied unit nudges for the glow (in viewBox units)
  const totalGlowOffsetUnitsX = baseOffsetUnitsX + (glowOffsetUnitsX || 0);
  const totalGlowOffsetUnitsY = baseOffsetUnitsY + (glowOffsetUnitsY || 0);

  // Convert the total unit offset to pixels, then add any pixel-based tweak the user passed
  const glowTranslateX = totalGlowOffsetUnitsX * unitToPixel + (glowOffsetX || 0);
  const glowTranslateY = totalGlowOffsetUnitsY * unitToPixel + (glowOffsetY || 0);

  // Convert pixel border offsets into viewBox units (so we can add them to cx/cy)
  const borderOffsetUnitsFromPxX = (borderOffsetX || 0) / (unitToPixel || 1);
  const borderOffsetUnitsFromPxY = (borderOffsetY || 0) / (unitToPixel || 1);

  // Final ring center in viewBox units: ICON_TRANSLATE + user unit offsets + converted pixel offsets
  const ringCx = ICON_TRANSLATE_X + (borderOffsetUnitsX || 0) + borderOffsetUnitsFromPxX;
  const ringCy = ICON_TRANSLATE_Y + (borderOffsetUnitsY || 0) + borderOffsetUnitsFromPxY;

  return (
    <View style={[styles.container, { width: glowSize, height: glowSize }]}>
      {/* Outer glow effect for better visibility.
          This view is translated so its center aligns with the orbit SVG center (ICON_TRANSLATE_*),
          but you can nudge it either in viewBox units (glowOffsetUnitsX/Y) or in pixels
          (glowOffsetX/glowOffsetY). */}
      <View
        style={[
          styles.glowEffect,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: `${color}40`, // 25% opacity
            transform: [{ translateX: glowTranslateX }, { translateY: glowTranslateY }],
          },
        ]}
      />

      {/* Inner container for SVG with proper centering */}
      <View
        style={[
          styles.innerContainer,
          {
            width: size,
            height: size,
          },
        ]}
      >
        {/* Inner SVG icon with both circle border and orbit symbol */}
        <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} style={styles.svg}>
          {/* Outer circle border: centered at the same point where the orbit SVG is positioned
              and additionally adjusted by borderOffsetUnitsX/Y (viewBox units) or borderOffsetX/Y (px) */}
          <Circle cx={ringCx} cy={ringCy} r={BORDER_RADIUS} stroke={color} strokeWidth={borderWidth * 1.5} fill="none" />

          {/* Inner orbit icon - scaled and centered (unchanged) */}
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
