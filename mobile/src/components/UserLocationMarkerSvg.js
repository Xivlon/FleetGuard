import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { G, Circle, Path } from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * UserLocationMarkerSvg (v19-style restore)
 *
 * Props:
 * - color (string) default '#10B981'
 * - size (number) default 40  -> rendered pixel size of SVG
 * - spin (boolean) whole-icon rotation
 * - spinDuration (ms)
 * - pulse (boolean) pulsing glow
 * - pulseDuration (ms)
 * - orbit (boolean) orbit arcs & satellites
 * - orbitDuration (ms)
 *
 * Notes:
 * - Animations use useNativeDriver:false for SVG props.
 * - Minimal debug logs indicate when each animation loop starts/stops (remove in prod).
 */

export default function UserLocationMarkerSvg({
  color = '#10B981',
  size = 40,
  spin = false,
  spinDuration = 6000,
  pulse = false,
  pulseDuration = 900,
  orbit = false,
  orbitDuration = 3000,
}) {
  // Animated values
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const orbitAnim = useRef(new Animated.Value(0)).current;

  // Loop refs so we can stop them cleanly
  const spinLoopRef = useRef(null);
  const pulseLoopRef = useRef(null);
  const orbitLoopRef = useRef(null);

  // Start/stop spin loop
  useEffect(() => {
    if (spin) {
      // debug
      // eslint-disable-next-line no-console
      console.log('[UserLocationMarkerSvg] spin START');
      spinAnim.setValue(0);
      spinLoopRef.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: spinDuration,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      spinLoopRef.current.start();
    } else {
      if (spinLoopRef.current) {
        try { spinLoopRef.current.stop(); } catch (e) {}
        spinLoopRef.current = null;
      }
      // smooth reset
      Animated.timing(spinAnim, { toValue: 0, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
      // debug
      // eslint-disable-next-line no-console
      console.log('[UserLocationMarkerSvg] spin STOP');
    }
    return () => {
      if (spinLoopRef.current) {
        try { spinLoopRef.current.stop(); } catch (e) {}
        spinLoopRef.current = null;
      }
    };
  }, [spin, spinDuration, spinAnim]);

  // Pulse loop (glow)
  useEffect(() => {
    if (pulse) {
      // debug
      // eslint-disable-next-line no-console
      console.log('[UserLocationMarkerSvg] pulse START');
      pulseAnim.setValue(0);
      pulseLoopRef.current = Animated.loop(
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
          })
        ])
      );
      pulseLoopRef.current.start();
    } else {
      if (pulseLoopRef.current) {
        try { pulseLoopRef.current.stop(); } catch (e) {}
        pulseLoopRef.current = null;
      }
      Animated.timing(pulseAnim, { toValue: 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
      // debug
      // eslint-disable-next-line no-console
      console.log('[UserLocationMarkerSvg] pulse STOP');
    }
    return () => {
      if (pulseLoopRef.current) {
        try { pulseLoopRef.current.stop(); } catch (e) {}
        pulseLoopRef.current = null;
      }
    };
  }, [pulse, pulseDuration, pulseAnim]);

  // Orbit loop (orbits arcs + satellites)
  useEffect(() => {
    if (orbit) {
      // debug
      // eslint-disable-next-line no-console
      console.log('[UserLocationMarkerSvg] orbit START');
      orbitAnim.setValue(0);
      orbitLoopRef.current = Animated.loop(
        Animated.timing(orbitAnim, {
          toValue: 1,
          duration: orbitDuration,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      orbitLoopRef.current.start();
    } else {
      if (orbitLoopRef.current) {
        try { orbitLoopRef.current.stop(); } catch (e) {}
        orbitLoopRef.current = null;
      }
      Animated.timing(orbitAnim, { toValue: 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
      // debug
      // eslint-disable-next-line no-console
      console.log('[UserLocationMarkerSvg] orbit STOP');
    }
    return () => {
      if (orbitLoopRef.current) {
        try { orbitLoopRef.current.stop(); } catch (e) {}
        orbitLoopRef.current = null;
      }
    };
  }, [orbit, orbitDuration, orbitAnim]);

  // Interpolations
  const spinRotation = spinAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 360] });
  const orbitRotation = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 360] });
  const orbitRotationOpposite = orbitAnim.interpolate({ inputRange: [0, 1], outputRange: [180, 540] });

  // Visual layout constants (kept inside viewBox to avoid bleed)
  const VIEWBOX = 100;
  const CENTER = VIEWBOX / 2; // 50
  const INNER_RING = 14;      // inner static ring radius
  const OUTER_RING_BASE = 22; // outer ring base radius
  const GLOW_MIN = 24;
  const GLOW_MAX = 30;
  const SAT_RADIUS = 26;      // orbit radius for satellites

  // Pulse-driven values
  const glowR = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [GLOW_MIN, GLOW_MAX] });
  const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.48] });
  const outerRingR = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [OUTER_RING_BASE + 0.5, OUTER_RING_BASE + 3.5] });
  const outerRingOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });
  const innerRingOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] });

  // Artwork constants: central dot
  const CENTER_DOT_R = 3.2;

  // Satellite visual radius (small circles)
  const SAT_R = 2.2;

  // Convert viewBox coords to actual pixel size automatically via SVG props (we keep viewBox fixed)
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
        {/* Whole-icon spin */}
        <AnimatedG rotation={spinRotation} originX={CENTER} originY={CENTER}>
          {/* Glow */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={glowR}
            fill={color}
            opacity={glowOpacity}
          />

          {/* Inner ring */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={INNER_RING}
            stroke={color}
            strokeWidth={2.6}
            fill="none"
            opacity={innerRingOpacity}
          />

          {/* Outer ring (slightly pulsing) */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={outerRingR}
            stroke={color}
            strokeWidth={1.4}
            fill="none"
            opacity={outerRingOpacity}
          />

          {/* Central artwork (small dot) */}
          <Circle cx={CENTER} cy={CENTER} r={CENTER_DOT_R} fill={color} />

          {/* Orbit arcs + satellite A (main orbit group) */}
          <AnimatedG rotation={orbitRotation} originX={CENTER} originY={CENTER}>
            {/* two small arcs to match the design (kept relative to center) */}
            <Path
              d={`M ${CENTER + 8} ${CENTER - 22} A 28 28 0 0 1 ${CENTER - 18} ${CENTER + 16}`}
              fill="none"
              stroke={color}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.95}
            />
            <Path
              d={`M ${CENTER - 24} ${CENTER + 10} A 28 28 0 0 1 ${CENTER + 12} ${CENTER - 20}`}
              fill="none"
              stroke={color}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.95}
            />

            {/* Satellite A placed on +X axis relative to center; group rotation orbits it */}
            <Circle
              cx={CENTER + SAT_RADIUS}
              cy={CENTER}
              r={SAT_R}
              fill={color}
            />
          </AnimatedG>

          {/* Satellite B: same position but rotated 180° via opposite-phase rotation so it's always opposite */}
          <AnimatedG rotation={orbitRotationOpposite} originX={CENTER} originY={CENTER}>
            <Circle
              cx={CENTER + SAT_RADIUS}
              cy={CENTER}
              r={SAT_R}
              fill={color}
            />
          </AnimatedG>
        </AnimatedG>
      </Svg>
    </View>
  );
}
