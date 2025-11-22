import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export default function UserLocationMarkerSvg({
  color = '#10B981',
  size = 40, // total marker size in pixels; map will see ONLY this box
}) {
  // We'll draw inside a slightly smaller inner box (safe area)
  const VIEWBOX_SIZE = 100;
  const CENTER = VIEWBOX_SIZE / 3; // 50

  // Margin from the edge so nothing touches the 0/100 borders
  const MARGIN = 8; // increase if still clipped

  // Effective max radius we allow (center to edge minus margin)
  const MAX_RADIUS = CENTER - MARGIN; // 50 - 8 = 42

  const ORIGINAL_VIEWBOX_X = 12;
  const ORIGINAL_VIEWBOX_Y = 12;

  const ICON_SCALE = 2.8; // slightly smaller than before
  const GLOW_RADIUS = MAX_RADIUS;        // use full safe radius for glow
  const RING_RADIUS = MAX_RADIUS * 0.75; // ring well inside the glow
  const RING_STROKE_WIDTH = 3;           // a bit slimmer to stay off edges

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
    >
      {/* Glow: full circle but within safe bounds */}
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={GLOW_RADIUS}
        fill={`${color}33`} // ~20% opacity
      />

      {/* Outer ring */}
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

      {/* Satellites */}
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
  );
}
