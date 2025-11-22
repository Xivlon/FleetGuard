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
 *
 * New: added `viewBoxPadding` prop to expand the SVG viewBox evenly on all sides
 * while keeping component pixel positions/sizes unchanged.
 */
export default function OrbitMarker({
  color = '#10B981',
  size = 50,
  // Pixel offsets for the RN glow view (easy: provide px)
  glowOffsetX = -14,
  glowOffsetY = -15,
  // Pixel offsets for the SVG outer ring (px). These are converted to viewBox units.
  borderOffsetX = -16,
  borderOffsetY = -15.9,
  // ViewBox unit offsets (use the same coordinate system as the SVG: ORIGINAL_VIEWBOX_X/Y)
  glowOffsetUnitsX = 0,
  glowOffsetUnitsY = 0,
  borderOffsetUnitsX = 0,
  borderOffsetUnitsY = 0,
  // New: padding in viewBox units to expand the viewBox equally on all sides.
  // Default 0 (no expansion). Increase to add whitespace while preserving pixel positions/sizes.
  viewBoxPadding = 0,
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
    borderOffsetUnitsY,
    'viewBoxPadding:',
    viewBoxPadding
  );

  // Calculate border width for glow effect (px)
  const borderWidth = Math.max(2, size * 0.05);
  const glowSize = size + 16;

  // Original viewBox coordinates from orbit.svg (Lucide orbit icon)
  // Using 25 as the reference point for positioning (intentionally set for proper alignment)
  const ORIGINAL_VIEWBOX_X = 25;
  const ORIGINAL_VIEWBOX_Y = 25;

  // Base viewBox configuration
  const VIEWBOX_SIZE = 100;

  // Expand the viewBox evenly on all sides by `viewBoxPadding` units
  const newViewboxSize = VIEWBOX_SIZE + 2 * (viewBoxPadding || 0);
  // viewCenter defined relative to original VIEWBOX_SIZE (used for ICON_TRANSLATE offset)
  const viewCenter = VIEWBOX_SIZE / 2;
  // minX/minY so expansion is centered around the original center
  const minX = viewCenter - newViewboxSize / 2;
  const minY = viewCenter - newViewboxSize / 2;

  // Because the SVG now maps newViewboxSize -> `size` pixels,
  // pixels-per-unit changes and we must account for that:
  const unitToPixel = newViewboxSize > 0 ? size / newViewboxSize : size / VIEWBOX_SIZE;
  const scaleAdjust = newViewboxSize / VIEWBOX_SIZE; // how many times larger the viewBox got

  // Icon positioning inside the viewBox (these remain the same logical coordinates)
  const ICON_TRANSLATE_X = VIEWBOX_SIZE / 1.5;
  const ICON_TRANSLATE_Y = VIEWBOX_SIZE / 1.5;
  // Adjust the icon scale so visual pixel size stays the same after viewBox expansion
  const ICON_SCALE = 2.5;
  const adjustedIconScale = ICON_SCALE * scaleAdjust;

  // Border radius expressed in viewBox units originally; adjust so its on-screen pixel size is preserved
  const BORDER_RADIUS = VIEWBOX_SIZE * 0.32; // original units
  const adjustedBorderRadius = BORDER_RADIUS * scaleAdjust;

  // Stroke widths:
  // - desiredPixelStrokeForRing is borderWidth * 1.5 (px)
  // - to keep that same pixel thickness after changing the viewBox, convert to viewBox units using unitToPixel
  const desiredPixelStrokeForRing = borderWidth * 1.5;
  const ringStrokeWidthUnits = unitToPixel > 0 ? desiredPixelStrokeForRing / unitToPixel : desiredPixelStrokeForRing;

  // Path stroke originally used "2" (viewBox units). Preserve its pixel thickness:
  const originalPathStrokeUnits = 2; // original viewBox units used in paths
  const adjustedPathStrokeUnits = originalPathStrokeUnits * scaleAdjust;

  // Compute offsets to align RN glow view with the icon center in pixel space using the new viewBox size
  const baseOffsetUnitsX = ICON_TRANSLATE_X - viewCenter;
  const baseOffsetUnitsY = ICON_TRANSLATE_Y - viewCenter;

  // Combine base offset with any unit-based tweaks for the glow
  const totalGlowOffsetUnitsX = baseOffsetUnitsX + (glowOffsetUnitsX || 0);
  const totalGlowOffsetUnitsY = baseOffsetUnitsY + (glowOffsetUnitsY || 0);

  // Convert total unit offsets to pixels, then add pixel-based tweaks
  const glowTranslateX = totalGlowOffsetUnitsX * unitToPixel + (glowOffsetX || 0);
  const glowTranslateY = totalGlowOffsetUnitsY * unitToPixel + (glowOffsetY || 0);

  // Convert pixel border offsets into viewBox units (using the new unitToPixel)
  const borderOffsetUnitsFromPxX = unitToPixel > 0 ? (borderOffsetX || 0) / unitToPixel : 0;
  const borderOffsetUnitsFromPxY = unitToPixel > 0 ? (borderOffsetY || 0) / unitToPixel : 0;

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
        <Svg
          width={size}
          height={size}
          // new viewBox expanded evenly around the original center
          viewBox={`${minX} ${minY} ${newViewboxSize} ${newViewboxSize}`}
          style={styles.svg}
        >
          {/* Outer circle border: centered at the same point where the orbit SVG is positioned
              and adjusted so its on-screen pixel radius/stroke remain the same after viewBox expansion */}
          <Circle
            cx={ringCx}
            cy={ringCy}
            r={adjustedBorderRadius}
            stroke={color}
            strokeWidth={ringStrokeWidthUnits}
            fill="none"
          />

          {/* Inner orbit icon - scaled and centered (use adjustedIconScale so pixel size stays same) */}
          <Path
            d="M20.341 6.484A10 10 0 0 1 10.266 21.85"
            fill="none"
            stroke={color}
            strokeWidth={adjustedPathStrokeUnits}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`translate(${ICON_TRANSLATE_X}, ${ICON_TRANSLATE_Y}) scale(${adjustedIconScale}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
          />
          <Path
            d="M3.659 17.516A10 10 0 0 1 13.74 2.152"
            fill="none"
            stroke={color}
            strokeWidth={adjustedPathStrokeUnits}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`translate(${ICON_TRANSLATE_X}, ${ICON_TRANSLATE_Y}) scale(${adjustedIconScale}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
          />
          {/* Center circle */}
          <Circle
            cx="12"
            cy="12"
            r="3"
            fill={color}
            transform={`translate(${ICON_TRANSLATE_X}, ${ICON_TRANSLATE_Y}) scale(${adjustedIconScale}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
          />
          {/* Satellite circles */}
          <Circle
            cx="19"
            cy="5"
            r="2"
            fill={color}
            transform={`translate(${ICON_TRANSLATE_X}, ${ICON_TRANSLATE_Y}) scale(${adjustedIconScale}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
          />
          <Circle
            cx="5"
            cy="19"
            r="2"
            fill={color}
            transform={`translate(${ICON_TRANSLATE_X}, ${ICON_TRANSLATE_Y}) scale(${adjustedIconScale}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
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
