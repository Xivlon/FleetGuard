import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { G, Circle, Path } from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * UserLocationMarkerSvg
 *
 * - orbit prop rotates the orbit arcs and satellites.
 * - The two satellites remain 180° apart by using a second orbit rotation
 *   that is phase-shifted by 180°.
 * - The orbit group's origin is explicitly set to the computed orbital center
 *   (ORBITAL_CENTER_X / ORBITAL_CENTER_Y) to ensure correct pivot.
 *
 * Usage:
 * <UserLocationMarkerSvg orbit={isLocked} orbitDuration={3000} ... />
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
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const orbitAnim = useRef(new Animated.Value(0)).current;

  const spinRef = useRef(null);
  const pulseRef = useRef(null);
  const orbitRef = useRef(null);

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
      Animated.timing(pulseAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }
    return () => {
      if (pulseRef.current) {
        pulseRef.current.stop();
        pulseRef.current = null;
      }
    };
  }, [pulse, pulseDuration, pulseAnim]);

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
        orbitRef.current.stop();
        orbitRef.current = null;
      }
      Animated.timing(orbitAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }
    return () => {
      if (orbitRef.current) {
        orbitRef.current.stop();
        orbitRef.current = null;
      }
    };
  }, [orbit, orbitDuration, orbitAnim]);

  const rotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 360],
  });

  // main orbit rotation (0..360)
  const orbitRotation = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 360],
  });

  // opposite-phase orbit rotation (180..540) so it stays 180° ahead of orbitRotation
  const orbitRotationOpposite = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [180, 540],
  });

  const VIEWBOX_SIZE = 100;
  const CENTER = VIEWBOX_SIZE / 2; // ensure true center pivot
  const MARGIN = 8;
  const MAX_RADIUS = CENTER - MARGIN;

  // Calculate the actual center of the orbital geometry (explicit)
  const ORBITAL_CENTER_X = CENTER;
  const ORBITAL_CENTER_Y = CENTER;

  // pulse-driven glow & opacity
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

  // artwork transform constants (keeps artwork centered inside viewBox)
  const ICON_SCALE = 2.8;
  const ORIGINAL_VIEWBOX_X = 12;
  const ORIGINAL_VIEWBOX_Y = 12;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
        {/* whole icon rotation */}
        <AnimatedG rotation={rotation} originX={CENTER} originY={CENTER}>
          {/* glow */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={glowRadius}
            fill={color}
            opacity={glowOpacity}
          />

          {/* rings */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RING_BASE}
            stroke={color}
            strokeWidth={3}
            fill="none"
            opacity={INNER_RING_OPACITY}
          />
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={OUTER_RING_RADIUS}
            stroke={color}
            strokeWidth={1.6}
            fill="none"
            opacity={OUTER_RING_OPACITY}
          />

          {/* central artwork */}
          <G>
            <Circle
              cx="12"
              cy="12"
              r="3"
              fill={color}
              transform={`translate(${CENTER}, ${CENTER}) scale(${ICON_SCALE}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
            />
          </G>

          {/* Orbit arcs + one satellite (main orbit group) */}
          <AnimatedG
            rotation={orbitRotation}
            originX={ORBITAL_CENTER_X}
            originY={ORBITAL_CENTER_Y}
          >
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

            {/* satellite A */}
            <Circle
              cx="19"
              cy="5"
              r="2"
              fill={color}
              transform={`translate(${CENTER}, ${CENTER}) scale(${ICON_SCALE}) translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
            />
          </AnimatedG>

          {/* Satellite B: same base position but phase-shifted 180° so it stays opposite */}
          <AnimatedG
            rotation={orbitRotationOpposite}
            originX={ORBITAL_CENTER_X}
            originY={ORBITAL_CENTER_Y}
          >
            <Circle
              cx="19"
              cy="5"
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
