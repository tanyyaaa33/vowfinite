import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 126;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CountdownRing({ progress = 0, visible = false }) {
  const animatedProgress = useSharedValue(1);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.max(0, Math.min(1, 1 - progress)), {
      duration: 120,
    });
  }, [animatedProgress, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * animatedProgress.value,
  }));

  if (!visible) return null;

  return (
    <Svg width={SIZE} height={SIZE} style={styles.svg}>
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={STROKE}
        fill="none"
      />
      <AnimatedCircle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        stroke={COLORS.purple}
        strokeWidth={STROKE}
        fill="none"
        strokeDasharray={CIRCUMFERENCE}
        animatedProps={animatedProps}
        strokeLinecap="round"
        rotation="-90"
        origin={`${SIZE / 2}, ${SIZE / 2}`}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
  },
});
