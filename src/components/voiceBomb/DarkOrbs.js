import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';

const ORBS = [
  { size: 220, top: '8%', left: '-18%', color: COLORS.pink, duration: 9000 },
  { size: 180, top: '52%', right: '-22%', color: COLORS.purple, duration: 11000 },
  { size: 140, bottom: '12%', left: '10%', color: COLORS.pink, duration: 8000 },
];

function Orb({ size, top, left, right, bottom, color, duration }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.12);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(18, { duration: duration / 2 }),
        withTiming(-14, { duration: duration / 2 })
      ),
      -1,
      true
    );
    translateY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: duration / 2 }),
        withTiming(16, { duration: duration / 2 })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.18, { duration: duration / 2 }),
        withTiming(0.08, { duration: duration / 2 })
      ),
      -1,
      true
    );
  }, [duration, opacity, translateX, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          top,
          left,
          right,
          bottom,
        },
        style,
      ]}
    />
  );
}

export default function DarkOrbs() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {ORBS.map((orb, index) => (
        <Orb key={`orb-${index}`} {...orb} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
  },
});
