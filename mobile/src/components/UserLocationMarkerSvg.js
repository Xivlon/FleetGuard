import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { G, Circle, Path } from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * UserLocationMarkerSvg
 *
 * Props:
 * - color: hex
 * - size: px
 * - spin: boolean (whole-icon rotate)
 * - spinDuration: ms
 * - pulse: boolean (glow pulse)
 * - pulseDuration: ms
 * - orbit: boolean (orbit arcs & satellites)
 * - orbitDuration: ms
 *
 * Improvements:
 * - Logs prop changes (temporary, remove in prod)
 * - Smoothly animates pulse to 0 when stopping
 * - Stops loops reliably and resets values
 */
export default function UserLocationMarkerSvg({
  color = '#10B981',
  size = 40,
  pulse = false,
  pulseDuration = 900,
  orbit = false,
  orbitDuration = 3000,
}) 
  // Animated values
  const orbitAnim = useRef(new Animated.Value(0)).current;

  // Refs to keep loop instances so we can stop them
  const pulseRef = useRef(null);
  const orbitRef = useRef(null);

  // Debug: show incoming props so we can verify state
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[UserLocationMarkerSvg] props', { spin, pulse, orbit, spinDuration, pulseDuration, orbitDuration });
  }, [pulse, orbit, pulseDuration, orbitDuration]);

  // Helper to smoothly stop an animation value to 0
  const smoothReset = (anim, duration = 250) => {
    return new Promise(resolve => {
      Animated.timing(anim, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start(() => resolve());
    });
  };
  // Pulse (glow)
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
      // stop loop, then fade out the glow smoothly
      if (pulseRef.current) {
        try { pulseRef.current.stop(); } catch (e) {}
        pulseRef.current = null;
      }
      smoothReset(pulseAnim, 260);
    }

    return () => {
      if (pulseRef.current) {
        try { pulseRef.current.stop(); } catch (e) {}
        pulseRef.current = null;
      }
    };
  }, [pulse, pulseDuration, pulseAnim]);

  // Orbit (orbits arcs + satellites only)
  useEffect(() => {
    if (orbit) {
      orbitAnim.setValue(0);
      orbitRef.current = Animated.loop(
        Animated.timing(orbitAnim, {
          toValue: 1,
          duration: orbitDuration,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      orbitRef.current.start();
    } else {
      if (orbitRef.current) {
        try { orbitRef.current.stop(); } catch (e) {}
        orbitRef.current = null;
      }
      smoothReset(orbitAnim, 240);
    }

    return () => {
      if (orbitRef.current) {
        try { orbitRef.current.stop(); } catch (e) {}
        orbitRef.current = null;
      }
    };
  }, [orbit, orbitDuration, orbitAnim]);

  // Interpolations
  const orbitRotation = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 360],
  });

  const VIEWBOX_SIZE = 100;
  const CENTER = VIEWBOX_SIZE / 3;
  const MARGIN = 8;
  const MAX_RADIUS = CENTER - MARGIN;

  const GLOW_MIN = MAX_RADIUS;
  const GLOW_MAX = MAX_RADIUS * 1.25;
  const glowRadius = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [GLOW_MIN, GLOW_MAX],
  });
  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.45],
  });

  const RING_BASE = MAX_RADIUS * 0.75;
  const INNER_RING_OPACITY = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.95],
  });
  const OUTER_RING_RADIUS = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_BASE + 0.5, RING_BASE + 3.5],
  });
  const OUTER_RING_OPACITY = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const ICON_SCALE = 2.8;
  const ORIGINAL_VIEWBOX_X = 12;
  const ORIGINAL_VIEWBOX_Y = 12;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
          <AnimatedCircle cx={CENTER} cy={CENTER} r={glowRadius} fill={color} opacity={glowOpacity} />

          <Circle cx={CENTER} cy={CENTER} r={RING_BASE} stroke={color} strokeWidth={3} fill="none" opacity={INNER_RING_OPACITY} />

          <AnimatedCircle cx={CENTER} cy={CENTER} r={OUTER_RING_RADIUS} stroke={color} strokeWidth={1.6} fill="none" opacity={OUTER_RING_OPACITY} />

          {/* central circle */}
          <Circle
            cx="12"
            cy="12"
            r="3"
            fill={color}
            transform={`translate(${CENTER}, ${CENTER}) scale(${ICON_SCALE}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
          />

          {/* orbit group (rotates only when orbit=true) */}
          <AnimatedG rotation={orbitRotation} originX={CENTER} originY={CENTER}>
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
        </AnimatedG>
      </Svg>
    </View>
  );
}
