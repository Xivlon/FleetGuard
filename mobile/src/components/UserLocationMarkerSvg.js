import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * UserLocationMarkerSvg
 *
 * - Measures its actual rendered size and computes pivot from that so rotation
 *   happens around the artwork's visual center (no more orbiting).
 * - Supports spin (rotate) and pulse (scale) with clean startup/teardown.
 */
export default function UserLocationMarkerSvg({
  color = '#10B981',
  size = 40,            // nominal size (used for initial layout/fallback)
  spin = false,
  spinDuration = 6000,
  pulse = false,
  pulseDuration = 900,
}) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const spinRef = useRef(null);
  const pulseRef = useRef(null);

  const [layout, setLayout] = useState(null); // { width, height }

  useEffect(() => {
    if (spin) {
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
      if (spinRef.current) {
        spinRef.current.stop();
        spinRef.current = null;
      }
      // smooth stop if you prefer: Animated.timing(spinAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      spinAnim.setValue(0);
    }

    return () => {
      if (spinRef.current) {
        spinRef.current.stop();
        spinRef.current = null;
      }
    };
  }, [spin, spinDuration, spinAnim]);

  useEffect(() => {
    if (pulse) {
      pulseAnim.setValue(0);
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: pulseDuration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: pulseDuration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        { iterations: -1 }
      );
      pulseRef.current.start();
    } else {
      if (pulseRef.current) {
        pulseRef.current.stop();
        pulseRef.current = null;
      }
      pulseAnim.setValue(0);
    }

    return () => {
      if (pulseRef.current) {
        pulseRef.current.stop();
        pulseRef.current = null;
      }
    };
  }, [pulse, pulseDuration, pulseAnim]);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  // SVG layout constants (conservative so nothing clips)
  const VIEWBOX_SIZE = 100;
  const CENTER = VIEWBOX_SIZE / 3; // visual center inside viewBox
  const MARGIN = 8;
  const MAX_RADIUS = CENTER - MARGIN;
  const ORIGINAL_VIEWBOX_X = 12;
  const ORIGINAL_VIEWBOX_Y = 12;
  const ICON_SCALE = 2.8;
  const GLOW_RADIUS = MAX_RADIUS;
  const RING_RADIUS = MAX_RADIUS * 0.75;
  const RING_STROKE_WIDTH = 3;

  // compute pivot from actual measured layout (fallback to prop `size` if not measured yet)
  const measuredWidth = layout?.width ?? size;
  const measuredHeight = layout?.height ?? size;

  const pivotX = useMemo(() => (CENTER / VIEWBOX_SIZE) * measuredWidth, [CENTER, VIEWBOX_SIZE, measuredWidth]);
  const pivotY = useMemo(() => (CENTER / VIEWBOX_SIZE) * measuredHeight, [CENTER, VIEWBOX_SIZE, measuredHeight]);

  const translateToCenterX = useMemo(() => measuredWidth / 2 - pivotX, [measuredWidth, pivotX]);
  const translateToCenterY = useMemo(() => measuredHeight / 2 - pivotY, [measuredHeight, pivotY]);

  // Animated transform sequence: move pivot -> rotate -> scale -> move back
  const animatedTransforms = [
    { translateX: translateToCenterX },
    { translateY: translateToCenterY },
    { rotate },
    { scale },
    { translateX: -translateToCenterX },
    { translateY: -translateToCenterY },
  ];

  return (
    <Animated.View
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        // store if changed to trigger re-compute of pivot
        if (!layout || layout.width !== width || layout.height !== height) {
          setLayout({ width, height });
        }
      }}
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        transform: animatedTransforms,
        // use pointerEvents="box-none" if you want map taps to pass through
      }}
    >
      <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={measuredWidth} height={measuredHeight} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
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
      </View>
    </Animated.View>
  );
}
