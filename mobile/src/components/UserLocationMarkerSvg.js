import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { G, Circle, Path } from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(G);

/**
 * UserLocationMarkerSvg
 * - Rotates & pulses the entire icon around its visual center (no orbiting).
 * - Animations run with useNativeDriver: false because they animate SVG props.
 */
export default function UserLocationMarkerSvg({
  color = '#10B981',
  size = 40,
  spin = true,
  spinDuration = 3000,
  pulse = false,
  pulseDuration = 900,
}) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
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
          useNativeDriver: false,
        }),
        { iterations: -1 }
      );
      spinRef.current.start();
    } else {
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

  // Interpolations
  const rotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 360], // numeric degrees for SVG rotation prop
  });
  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  // SVG layout constants (kept conservative to avoid clipping)
  const VIEWBOX_SIZE = 100;
  const CENTER = VIEWBOX_SIZE / 3; // visual center chosen to avoid clipping earlier
  const MARGIN = 8;
  const MAX_RADIUS = CENTER - MARGIN;
  const ICON_SCALE = 2.8;
  const ORIGINAL_VIEWBOX_X = 12;
  const ORIGINAL_VIEWBOX_Y = 12;
  const GLOW_RADIUS = MAX_RADIUS;
  const RING_RADIUS = MAX_RADIUS * 0.75;
  const RING_STROKE_WIDTH = 3;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
        {/* Animated group contains the whole icon so the entire SVG rotates around CENTER */}
        <AnimatedG rotation={rotation} originX={CENTER} originY={CENTER} scale={scale}>
          {/* Glow and outer ring */}
          <Circle cx={CENTER} cy={CENTER} r={GLOW_RADIUS} fill={`${color}33`} />
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
        </AnimatedG>
      </Svg>
    </View>
  );
}
