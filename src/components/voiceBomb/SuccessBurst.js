import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { FONTS } from '../../constants/fonts';

const SPARKS = ['💕', '✨', '💖', '🎙️', '💫'];

function Spark({ emoji, left, delay }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 160 }));
    translateY.value = withDelay(delay, withTiming(-90, { duration: 900 }));
    opacity.value = withDelay(delay + 500, withTiming(0, { duration: 500 }));
  }, [delay, opacity, scale, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.Text style={[styles.spark, { left }, style]}>
      {emoji}
    </Animated.Text>
  );
}

export default function SuccessBurst({ active }) {
  const cardScale = useSharedValue(0.9);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    cardOpacity.value = withTiming(1, { duration: 200 });
    cardScale.value = withSpring(1, { damping: 12, stiffness: 140 });
  }, [active, cardOpacity, cardScale]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {SPARKS.map((emoji, index) => (
        <Spark
          key={emoji}
          emoji={emoji}
          left={`${14 + index * 16}%`}
          delay={index * 70}
        />
      ))}
      <View style={styles.center}>
        <Animated.View style={[styles.card, cardStyle]}>
          <Text style={styles.emoji}>💝</Text>
          <Text style={styles.title}>Voice Bomb sent!</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spark: {
    position: 'absolute',
    bottom: '38%',
    fontSize: 24,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,107,157,0.35)',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.displayItalic,
    fontSize: 20,
    color: '#FFFFFF',
  },
});
