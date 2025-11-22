import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * UserLocationMarkerSvg
 *
 * Props:
 * - color: hex color for ring/icon
 * - size: pixel size of the marker square
 * - spin: boolean, whether to spin the marker
 * - spinDuration: ms for one full rotation (default 3000)
 *
 * Implementation:
 * - Wraps the SVG in an Animated.View and rotates using native driver.
 * - Looping animation is started on mount and cleaned up on unmount.
 */
export default function UserLocationMarkerSvg({
  color = '#10B981',
  size = 40,
  spin = true,
  spinDuration = 3000,
}) {
  // Animation value (0..1)
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinRef = useRef(null);

  useEffect(() => {
    // Start or stop the looping rotation depending on `spin`
    if (spin) {
      // Reset to 0 to avoid jump when toggling
      spinAnim.setValue(0);
      spinRef.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: spinDuration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        { iterations: -1 }
      );
      spinRef.current.start();
    } else {
      // stop if running
      if (spinRef.current) {
        spinRef.current.stop();
        spinRef.current = null;
      }
      spinAnim.setValue(0);
    }

    return () => {
      if (spinRef.current) {
        spinRef.current.stop();
        spinRef.current = null;
      }
    };
  }, [spin, spinDuration, spinAnim]);

  // Interpolate numeric animation value to rotation degrees
  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // SVG layout constants (kept conservative so nothing is clipped)
  const VIEWBOX_SIZE = 100;
  const CENTER = VIEWBOX_SIZE / 3; // tuned earlier to avoid clipping
  const MARGIN = 8;
  const MAX_RADIUS = CENTER - MARGIN;
  const ORIGINAL_VIEWBOX_X = 12;
  const ORIGINAL_VIEWBOX_Y = 12;
  const ICON_SCALE = 2.8;
  const GLOW_RADIUS = MAX_RADIUS;
  const RING_RADIUS = MAX_RADIUS * 0.75;
  const RING_STROKE_WIDTH = 3;

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate }],
      }}
      // pointerEvents left default (marker taps pass through to Map)
    >
      <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
        {/* Glow */}
        <Circle cx={CENTER} cy={CENTER} r={GLOW_RADIUS} fill={`${color}33`} />

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
    </Animated.View>
  );
}
