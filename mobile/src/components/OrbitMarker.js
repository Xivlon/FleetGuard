import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';

/**
 * OrbitMarker component
 * Displays a custom marker on the map to indicate user location
 *
 * IMPORTANT: SVG rendering can be unreliable in react-native-maps Marker components.
 * This component uses a fallback approach with proper container sizing and visibility properties.
 */
export default function OrbitMarker({ color = '#10B981', size = 40 }) {
  console.log('[OrbitMarker] Rendering with color:', color, 'size:', size);

  // Calculate border width for glow effect
  const borderWidth = Math.max(2, size * 0.05);
  const glowSize = size + 8;

  // Original viewBox coordinates from orbit.svg (Regular-S group)
  const ORIGINAL_VIEWBOX_X = 1415;
  const ORIGINAL_VIEWBOX_Y = 620;

  // Icon positioning and scale within the normalized 0-100 viewBox
  const ICON_TRANSLATE_X = 25;
  const ICON_TRANSLATE_Y = 20;
  const ICON_SCALE = 0.75;

  return (
    <View style={[styles.container, { width: glowSize, height: glowSize }]}>
      {/* Outer glow effect for better visibility */}
      <View style={[
        styles.glowEffect,
        {
          width: glowSize,
          height: glowSize,
          borderRadius: glowSize / 2,
          backgroundColor: `${color}40`, // 25% opacity
        }
      ]} />

      {/* Inner container for SVG with proper centering */}
      <View style={[
        styles.innerContainer,
        {
          width: size,
          height: size,
        }
      ]}>
        {/* Inner SVG icon with both circle border and orbit symbol */}
        <Svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          style={styles.svg}
        >
          {/* White background circle */}
          <Circle
            cx="50"
            cy="50"
            r="48"
            fill="white"
          />

          {/* Outer circle border with visible fill */}
          <Circle
            cx="50"
            cy="50"
            r="48"
            stroke={color}
            strokeWidth={borderWidth * 1.5}
            fill="none"
          />

          {/* Inner orbit icon - scaled and centered */}
          <G transform={`translate(${ICON_TRANSLATE_X}, ${ICON_TRANSLATE_Y}) scale(${ICON_SCALE})`}>
            <Path
              d="M1445.91186,628.6196c-3.68442,0.44624 -6.91966,1.43854 -10.53949,3.23818c-4.93506,2.45139 -8.77508,5.73654 -11.96628,10.23417c-2.93579,4.13947 -4.7824,8.74572 -5.58975,13.94501c-0.26716,1.70863 -0.36404,5.86865 -0.18202,7.66829c0.42863,4.20405 1.50606,7.93838 3.34093,11.55527l0.72808,1.43267l-0.26716,0.50496c-0.14679,0.27596 -0.40807,0.92771 -0.58422,1.44441c-0.28184,0.83376 -0.31707,1.12147 -0.32587,2.5835c-0.00881,1.41212 0.02936,1.76735 0.26716,2.52478c0.90422,2.89763 3.11194,5.10534 6.00663,6.00663c1.27413,0.39633 3.658,0.39633 4.93213,0c2.89469,-0.90129 5.10534,-3.11194 6.00663,-6.00663c0.39633,-1.27413 0.39633,-3.658 0,-4.93213c-0.89542,-2.87414 -3.12662,-5.11708 -5.94498,-5.97433c-1.20074,-0.36404 -3.57286,-0.41688 -4.69433,-0.10275c-0.38459,0.10862 -0.71633,0.18202 -0.73395,0.1644c-0.10862,-0.11156 -1.1567,-2.47487 -1.44441,-3.26754c-1.97579,-5.4136 -2.0257,-11.96922 -0.13505,-17.47676c1.7967,-5.22864 5.2991,-9.91417 9.76444,-13.0584c3.55818,-2.50717 7.98535,-4.19231 12.27161,-4.67084c1.4679,-0.1644 4.55928,-0.14092 6.12993,0.04697c1.52368,0.18202 2.05799,0.1145 2.82423,-0.3611c1.87303,-1.1567 1.7556,-4.02203 -0.20551,-4.99378c-0.50202,-0.24954 -0.9923,-0.3611 -2.19597,-0.50202c-1.87597,-0.22018 -5.66314,-0.22312 -7.46278,-0.00294M1468.89617,631.49374c-3.33506,0.60477 -5.98608,2.96221 -7.00186,6.22388c-0.39633,1.27413 -0.39633,3.658 0,4.93213c0.90129,2.89469 3.11194,5.10534 6.00663,6.00663c1.36221,0.42275 3.99561,0.37872 5.21396,-0.08807c0.29651,-0.1145 1.77028,3.3879 2.3046,5.48112c0.66642,2.61873 0.86312,4.50057 0.78679,7.54205c-0.08514,3.29689 -0.49615,5.60149 -1.45909,8.18499c-1.67634,4.4947 -4.5035,8.50205 -8.0793,11.44958c-5.22277,4.30681 -12.69142,6.64663 -18.90649,5.92736c-3.09139,-0.35817 -3.68442,-0.29651 -4.56516,0.4756c-1.24184,1.08918 -1.32991,2.89175 -0.20257,4.14534c0.57248,0.63707 1.11266,0.84844 2.77139,1.09211c1.76147,0.26129 6.36186,0.29651 8.04407,0.06165c9.22426,-1.28588 17.02465,-5.94498 22.33256,-13.34611c3.63157,-5.06718 5.62791,-10.75087 5.95672,-16.97181c0.30239,-5.68076 -0.74569,-10.88591 -3.20001,-15.90024l-0.95707,-1.95524l0.26129,-0.49321c0.14385,-0.27303 0.4022,-0.9189 0.57835,-1.4356c0.28184,-0.83376 0.31707,-1.12147 0.32587,-2.5835c0.00881,-1.41212 -0.02936,-1.76735 -0.26716,-2.52478c-0.89835,-2.88295 -3.15891,-5.14644 -5.94498,-5.96259c-1.05982,-0.31119 -3.02093,-0.43743 -3.99855,-0.26129M1471.27709,637.42697c1.10973,0.32881 2.0257,1.57652 2.0257,2.75671c0,0.64587 -0.35229,1.49725 -0.81615,1.97579c-0.70753,0.72808 -1.10092,0.89542 -2.11964,0.89835c-0.74863,0.00294 -0.96294,-0.04404 -1.42092,-0.31413c-1.70569,-1.00404 -2.00515,-3.2235 -0.62239,-4.60626c0.81909,-0.81909 1.7967,-1.05395 2.95341,-0.71046M1447.93168,649.17013c-3.31157,0.5167 -6.50278,2.68038 -8.18792,5.55452c-3.6668,6.25323 -0.98643,14.18574 5.70424,16.88373c6.00663,2.41909 12.81473,-0.48734 15.24263,-6.50571c1.13322,-2.81249 1.13322,-5.92736 0.00294,-8.72517c-1.56478,-3.87231 -5.00259,-6.59672 -9.10095,-7.21617c-1.3534,-0.20257 -2.31634,-0.19963 -3.66093,0.00881M1451.35188,655.07694c2.16955,0.56661 3.89579,2.49836 4.23928,4.74717c0.29358,1.91707 -0.27596,3.64919 -1.65579,5.03195c-1.17725,1.18312 -2.51304,1.74973 -4.11891,1.74973c-1.51193,0 -2.82423,-0.52257 -3.95451,-1.57065c-3.9046,-3.62864 -1.36221,-10.15784 3.95451,-10.15784c0.41982,0 1.10973,0.09101 1.53542,0.19963M1430.17602,678.52804c1.10973,0.32881 2.0257,1.57652 2.0257,2.75964c0,0.96881 -0.63413,2.04037 -1.51487,2.55707c-0.45798,0.26716 -0.67523,0.31707 -1.42092,0.31707c-0.74569,0 -0.96294,-0.04991 -1.42092,-0.31707c-1.70569,-1.00404 -2.00515,-3.2235 -0.62239,-4.60626c0.81909,-0.81909 1.7967,-1.05395 2.95341,-0.71046"
              fill={color}
              transform={`translate(-${ORIGINAL_VIEWBOX_X}, -${ORIGINAL_VIEWBOX_Y})`}
            />
          </G>
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible', // Critical: allows glow effect to be visible
  },
  glowEffect: {
    position: 'absolute',
  },
  innerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5, // Critical for Android visibility
  },
  svg: {
    backgroundColor: 'transparent',
  },
});
