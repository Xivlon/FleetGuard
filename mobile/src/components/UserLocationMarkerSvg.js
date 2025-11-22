import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { G, Circle, Path } from 'react-native-svg';

// Create animated versions of SVG elements
const AnimatedG = Animated.createAnimatedComponent(G);

/**
 * UserLocationMarkerSvg
 *
 * - Rotates & pulses inside the SVG using an animated <G> so rotation pivot is exact.
 * - spin/pulse animations now run without pixel-pivot math; no more "orbiting" effect.
 *
 * Props:
 * - color: string (hex)
 * - size: number (px)
 * - spin: boolean -> rotate continuously when true
 * - spinDuration: number ms for one full rotation
 * - pulse: boolean -> pulse (scale) loop when true
 * - pulseDuration: number ms for one pulse cycle
 */
export default function UserLocationMarkerSvg({
  color = '#10B981',
  size = 40,
  spin = false,
  spinDuration = 6000,
  pulse = false,
  pulseDuration = 900,
}) {
  // Animated values (we can't use useNativeDriver for animating svg props)
  const spinAnim = useRef(new Animated.Value(0)).current;   // 0..1 -> 0..360deg
  const pulseAnim = useRef(new Animated.Value(0)).current;  // 0..1 -> scale

  const spinRef = useRef(null);
  const pulseRef = useRef(null);

  useEffect(() => {
    if (spin) {
      spinAnim.setValue(0);
      spinRef.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: spinDuration,
          easing: Easing.linear,
          useNativeDriver: false, // animating svg props; native driver doesn't support them
        }),
        { iterations: -1 }
      );
      spinRef.current.start();
    } else {
      if (spinRef.current) {
        spinRef.current.stop();
        spinRef.current = null;
      }
      // Reset to 0 (instant) or animate to 0 for a smooth stop
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
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: pulseDuration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
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

  // Interpolations for SVG props
  const rotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 360], // numeric degrees for SVG rotation prop
  });

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  // SVG layout constants — keep conservative to avoid clipping
  const VIEWBOX_SIZE = 100;
  const CENTER = VIEWBOX_SIZE / 3; // tuned to avoid earlier clipping
  const MARGIN = 8;
  const MAX_RADIUS = CENTER - MARGIN;
  const ICON_SCALE = 2.8;
  const ORIGINAL_VIEWBOX_X = 12;
  const ORIGINAL_VIEWBOX_Y = 12;
  const GLOW_RADIUS = MAX_RADIUS;
  const RING_RADIUS = MAX_RADIUS * 0.75;
  const RING_STROKE_WIDTH = 3;

  // Animated props for <G>:
  // - rotation (degrees) around (CENTER, CENTER)
  // - scale around the same origin
  // AnimatedG accepts numeric rotation and scale props.
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
        {/* Outer glow + ring are drawn as usual */}
        <Circle cx={CENTER} cy={CENTER} r={GLOW_RADIUS} fill={`${color}33`} />
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS}
          stroke={color}
          strokeWidth={RING_STROKE_WIDTH}
          fill="none"
        />

        {/* Animated group: rotate & scale around the artwork center */}
        <AnimatedG
          rotation={rotation}
          originX={CENTER}
          originY={CENTER}
          scale={scale}
        >
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

          {/* Center circle and satellites */}
          <Circle
            cx="12"
            cy="12"
            r="3"
            fill={color}
            transform={`translate(${CENTER}, ${CENTER}) scale(${ICON_SCALE}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
          />
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
        </AnimatedG>
      </Svg>
    </View>
  );
}
