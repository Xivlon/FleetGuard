import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export default function UserLocationMarkerSvg({
  color = '#10B981',
  size = 40, // total marker size in pixels; map will see ONLY this box
}) {
  const VIEWBOX_SIZE = 200;
  const CENTER = VIEWBOX_SIZE / 2; // 50

  const ORIGINAL_VIEWBOX_X = 14;
  const ORIGINAL_VIEWBOX_Y = 14;

  const ICON_SCALE = 3.0;
  const RING_RADIUS = VIEWBOX_SIZE * 0.34;
  const RING_STROKE_WIDTH = 5;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
    >
      {/* Glow: full circle in the same box the map uses */}
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={VIEWBOX_SIZE * 0.48}
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
