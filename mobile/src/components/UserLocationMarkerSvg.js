import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { G, Circle, Path } from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * UserLocationMarkerSvg
 * - Rotates the whole icon around its visual center.
 * - Pulses by animating the glow circle's radius & opacity (centered).
 * - The ring now pulses (strokeWidth + opacity) in sync with the glow.
 */
export default function UserLocationMarkerSvg({
  color = '#10B981',
  size = 40,
  spin = false,
  spinDuration = 6000,
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
        })
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
        ])
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

  // rotation numeric degrees for SVG rotation prop
  const rotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 360],
  });

  // pulse-driven glow radius & opacity
  const VIEWBOX_SIZE = 100;
  const CENTER = VIEWBOX_SIZE / 3; // visual center chosen earlier
  const MARGIN = 8;
  const MAX_RADIUS = CENTER - MARGIN; // base glow radius

  const GLOW_MIN = MAX_RADIUS;
  const GLOW_MAX = MAX_RADIUS * 1.25;
  const glowRadius = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [GLOW_MIN, GLOW_MAX],
  });
  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.20, 0.45],
  });

  // ring base and animated stroke/opacity
  const RING_BASE = MAX_RADIUS * 0.75;
  const RING_STROKE_BASE = 3;
  const RING_STROKE_MAX = RING_STROKE_BASE * 1.5;
  const ringStroke = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_STROKE_BASE, RING_STROKE_MAX],
  });
  const ringOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  const ICON_SCALE = 2.8;
  const ORIGINAL_VIEWBOX_X = 12;
  const ORIGINAL_VIEWBOX_Y = 12;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
        {/* Animated group rotates the whole icon around CENTER */}
        <AnimatedG rotation={rotation} originX={CENTER} originY={CENTER}>
          {/* Animated glow circle (centered) */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={glowRadius}
            fill={color}
            opacity={glowOpacity}
          />

          {/* Animated outer ring - strokeWidth and opacity animated */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RING_BASE}
            stroke={color}
            strokeWidth={ringStroke}
            opacity={ringOpacity}
            fill="none"
          />

          {/* Orbit arcs, center, satellites */}
          <G>
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
          </G>
        </AnimatedG>
      </Svg>
    </View>
  );
}
