import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const HEARTS = [
  { left: '18%', emoji: '💕', delay: 0 },
  { left: '32%', emoji: '💖', delay: 80 },
  { left: '48%', emoji: '💗', delay: 160 },
  { left: '62%', emoji: '✨', delay: 240 },
  { left: '76%', emoji: '💕', delay: 120 },
  { left: '42%', emoji: '💫', delay: 200 },
  { left: '54%', emoji: '💖', delay: 300 },
];

function HeartParticle({ left, emoji, delay }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 160 }));
    translateY.value = withDelay(
      delay,
      withTiming(-120, { duration: 900 })
    );
    opacity.value = withDelay(delay + 500, withTiming(0, { duration: 450 }));
  }, [delay, opacity, scale, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.particle, { left }, style]}>
      {emoji}
    </Animated.Text>
  );
}

export default function HeartBurst({ active }) {
  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {HEARTS.map((heart, index) => (
        <HeartParticle key={`heart-${index}`} {...heart} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    bottom: '42%',
    fontSize: 22,
  },
});
