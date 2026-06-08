import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';

const STARS = [
  { left: '8%', top: '12%', size: 6, color: COLORS.pink, delay: 0 },
  { left: '22%', top: '8%', size: 4, color: COLORS.purple, delay: 200 },
  { left: '78%', top: '14%', size: 5, color: COLORS.pink, delay: 400 },
  { left: '88%', top: '22%', size: 4, color: COLORS.purple, delay: 100 },
  { left: '14%', top: '28%', size: 3, color: COLORS.purple, delay: 600 },
  { left: '62%', top: '6%', size: 4, color: COLORS.pink, delay: 300 },
  { left: '44%', top: '18%', size: 3, color: COLORS.pink, delay: 500 },
  { left: '92%', top: '34%', size: 5, color: COLORS.purple, delay: 150 },
  { left: '6%', top: '42%', size: 4, color: COLORS.pink, delay: 700 },
  { left: '72%', top: '38%', size: 3, color: COLORS.purple, delay: 250 },
];

function Star({ left, top, size, color, delay }) {
  const opacity = useSharedValue(0.2);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.55, { duration: 1200 }),
          withTiming(0.15, { duration: 1200 })
        ),
        -1,
        true
      )
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1400 }),
          withTiming(0.9, { duration: 1400 })
        ),
        -1,
        true
      )
    );
  }, [delay, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.star,
        {
          left,
          top,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export default function StarField() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {STARS.map((star, index) => (
        <Star key={`star-${index}`} {...star} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
  },
});
