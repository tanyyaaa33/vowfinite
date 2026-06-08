import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';

const { height: SCREEN_H } = Dimensions.get('window');

const PARTICLES = [
  { emoji: '✨', left: '12%' },
  { emoji: '💕', left: '28%' },
  { emoji: '🎉', left: '44%' },
  { emoji: '💖', left: '60%' },
  { emoji: '✨', left: '76%' },
  { emoji: '💗', left: '88%' },
  { emoji: '🌸', left: '20%' },
  { emoji: '⭐', left: '52%' },
  { emoji: '💫', left: '68%' },
];

function ConfettiPiece({ emoji, left, delay }) {
  const translateY = useSharedValue(-40);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_H * 0.55, { duration: 2200 })
    );
    rotate.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(12, { duration: 400 }),
          withTiming(-12, { duration: 400 })
        ),
        3,
        true
      )
    );
    opacity.value = withDelay(delay + 1800, withTiming(0, { duration: 500 }));
  }, [delay, opacity, rotate, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.piece, { left }, style]}>
      {emoji}
    </Animated.Text>
  );
}

export default function ConfettiBurst() {
  return (
    <View pointerEvents="none" style={styles.container}>
      {PARTICLES.map((particle, index) => (
        <ConfettiPiece
          key={`${particle.emoji}-${index}`}
          emoji={particle.emoji}
          left={particle.left}
          delay={index * 80}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  piece: {
    position: 'absolute',
    top: 0,
    fontSize: 22,
    color: COLORS.pink,
  },
});
