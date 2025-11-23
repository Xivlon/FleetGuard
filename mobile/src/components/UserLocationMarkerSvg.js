import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { G, Circle, Path } from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * UserLocationMarkerSvg
 *
 * - `size` is the visible marker box size you want on the map (e.g. 50).
 * - The component renders a larger internal SVG (svgSize) so the glow can bleed out.
 * - Use it with Marker and set Marker tracksViewChanges={true} while animating.
 */
export default function UserLocationMarkerSvg({
  color = '#10B981',
  size = 50,          // nominal visible marker square
  spin = false,
  spinDuration = 6000,
  pulse = false,
  pulseDuration = 900,
  bleed = 0.6,        // fraction of `size` to extend the svg beyond the marker box
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
          useNativeDriver: false, // svg props require false
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

  // Interpolations
  const rotation = spinAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 360] });
  const pulseRatio = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // SVG layout constants (viewBox units)
  const VIEWBOX_SIZE = 100;
  const CENTER = VIEWBOX_SIZE / 3; // visual center tuned earlier
  const MARGIN = 6;
  const MAX_RADIUS = CENTER - MARGIN;

  // Glow radius & opacity
  const GLOW_MIN = MAX_RADIUS;
  const GLOW_MAX = MAX_RADIUS * 1.6;
  const glowRadius = pulseRatio.interpolate
    ? pulseRatio.interpolate({ inputRange: [0, 1], outputRange: [GLOW_MIN, GLOW_MAX] })
    : pulseRatio; // fallback if interp not available
  const glowOpacity = pulseRatio.interpolate
    ? pulseRatio.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.5] })
    : pulseRatio;

  // Simulated ring pulse by animating a faint outer ring's opacity + inner ring opacity, avoiding animating strokeWidth directly
  const RING_BASE = MAX_RADIUS * 0.75;
  const innerRingOpacity = pulseRatio.interpolate
    ? pulseRatio.interpolate({ inputRange: [0, 1], outputRange: [1.0, 0.9] })
    : pulseRatio;
  const outerRingOpacity = pulseRatio.interpolate
    ? pulseRatio.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] })
    : pulseRatio;
  const outerRingRadius = pulseRatio.interpolate
    ? pulseRatio.interpolate({ inputRange: [0, 1], outputRange: [RING_BASE + 0.5, RING_BASE + 4] })
    : RING_BASE;

  const ICON_SCALE = 2.8;
  const ORIGINAL_VIEWBOX_X = 12;
  const ORIGINAL_VIEWBOX_Y = 12;

  // make the svg bigger so glow can bleed out
  const svgExtra = size * bleed;
  const svgSize = size + svgExtra;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible', // let children draw outside
      }}
    >
      <Svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        style={{
          position: 'absolute',
          left: -(svgExtra / 2),
          top: -(svgExtra / 2),
        }}
      >
        <AnimatedG rotation={rotation} originX={CENTER} originY={CENTER}>
          {/* Animated glow */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={glowRadius}
            fill={color}
            opacity={glowOpacity}
          />

          {/* inner ring (stable) */}
          <Circle cx={CENTER} cy={CENTER} r={RING_BASE} stroke={color} strokeWidth={3} fill="none" opacity={innerRingOpacity} />

          {/* outer ring (fades in/out to simulate stroke growth outward) */}
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={outerRingRadius}
            stroke={color}
            strokeWidth={1.8}
            fill="none"
            opacity={outerRingOpacity}
          />

          {/* artwork
