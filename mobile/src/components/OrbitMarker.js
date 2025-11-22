import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * OrbitMarker component
 * Displays a custom marker on the map to indicate user location
 *
 * IMPORTANT: SVG rendering can be unreliable in react-native-maps Marker components.
 * This component uses a fallback approach with proper container sizing and visibility properties.
 *
 * New: added optional props to tweak the X/Y positions of the glow circle (in pixels)
 * and the outer SVG ring border (also supplied in pixels and converted to viewBox units).
 */
export default function OrbitMarker({
  color = '#10B981',
  size = 40,
  // pixel offsets for the RN glow view (easy: provide px)
  glowOffsetX = 0,
  glowOffsetY = 0,
  // pixel offsets for the SVG outer ring border (px). These are converted to viewBox units
  // so you can think in device pixels when nudging the ring.
  borderOffsetX = 0,
  borderOffsetY = 0,
}) {
  console.log('[OrbitMarker] Rendering with color:', color, 'size:', size, 'glowOffsetX:', glowOffsetX, 'glowOffsetY:', glowOffsetY, 'borderOffsetX:', borderOffsetX, 'borderOffsetY:', borderOffsetY);

  // Calculate border width for glow effect
  const borderWidth = Math.max(2, size * 0.05);
  const glowSize = size + 8;

  // Original viewBox coordinates from orbit.svg (Lucide orbit icon)
  // Using 27 as the reference point for positioning (intentionally set for proper alignment)
  const ORIGINAL_VIEWBOX_X = 27;
  const ORIGINAL_VIEWBOX_Y = 27;

  // Icon positioning and scale within the normalized viewBox
  const VIEWBOX_SIZE = 100;
  const ICON_TRANSLATE_X = VIEWBOX_SIZE / 1.5; // center position in viewBox where the orbit is placed
  const ICON_TRANSLATE_Y = VIEWBOX_SIZE / 1.5; // center position in viewBox where the orbit is placed
  const ICON_SCALE = 2.5;
  const BORDER_RADIUS = VIEWBOX_SIZE * 0.32; // 32 in a 100 viewBox

  // Compute the pixel offset between the viewBox center and the orbit's translated center.
  // We'll apply this offset to non-SVG RN views (glow) so their center aligns with the orbit svg center.
  const viewCenter = VIEWBOX_SIZE / 2;
  const offsetUnitsX = ICON_TRANSLATE_X - viewCenter;
  const offsetUnitsY = ICON_TRANSLATE_Y - viewCenter;
  // SVG units -> pixels scaling for the current rendered size
  const unitToPixel = size / VIEWBOX_SIZE;
  const offsetPxX = offsetUnitsX * unitToPixel;
  const offsetPxY = offsetUnitsY * unitToPixel;

  // Combine the computed offset (so the glow lines up with the SVG center)
  // with the user-supplied tweak offsets (glowOffsetX/glowOffsetY) which are in pixels.
  const glowTranslateX = offsetPxX + (glowOffsetX || 0);
  const glowTranslateY = offsetPxY + (glowOffsetY || 0);

  // Convert user-supplied border offsets (in pixels) into viewBox units so we can add them
  // to the SVG circle's cx/cy (which are in viewBox coordinate space).
  // borderOffsetUnits = borderOffsetPx / unitToPixel
  const borderOffsetUnitsX = (borderOffsetX || 0) / (unitToPixel || 1);
  const borderOffsetUnitsY = (borderOffsetY || 0) / (unitToPixel || 1);

  // Final ring center in viewBox units (so it shares the same pivot as the orbit)
  const ringCx = ICON_TRANSLATE_X + borderOffsetUnitsX;
  const ringCy = ICON_TRANSLATE_Y + borderOffsetUnitsY;

  return (
    <View style={[styles.container, { width: glowSize, height: glowSize }]}>
      {/* Outer glow effect for better visibility.
          This view is translated by glowTranslate so its center aligns with the orbit SVG center.
          You can nudge the glow with glowOffsetX/glowOffsetY (in pixels). */}
      <View
        style={[
          styles.glowEffect,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: `${color}40`, // 25% opacity
            // translate the glow so its center maps to the same pixel position as ICON_TRANSLATE_X/Y
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
            // NOTE: we intentionally do NOT translate the innerContainer because the orbit SVG
            // itself is positioned inside the viewBox using its transform (ICON_TRANSLATE_*).
            // Moving innerContainer would move the orbit artwork as well.
          },
        ]}
      >
        {/* Inner SVG icon with both circle border and orbit symbol */}
        <Svg
          width={size}
          height={size}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          style={styles.svg}
        >
          {/* Outer circle border: centered at the same point where the orbit SVG is positioned
              but additionally adjusted by borderOffsetX/borderOffsetY (user supplied in pixels). */}
          <Circle
            cx={ringCx}
            cy={ringCy}
            r={BORDER_RADIUS}
            stroke={color}
            strokeWidth={borderWidth * 1.5}
            fill="none"
          />

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
