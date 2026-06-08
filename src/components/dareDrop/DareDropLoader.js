import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { CONTENT_MAX_WIDTH, SCREEN_PADDING } from '../../constants/layout';

function PulseBlock({ style }) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.75, { duration: 900 }),
        withTiming(0.35, { duration: 900 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.block, style, animatedStyle]} />;
}

export default function DareDropLoader({ dark = false }) {
  return (
    <View style={styles.container}>
      <PulseBlock style={[styles.points, dark ? styles.pointsDark : styles.pointsLight]} />
      <PulseBlock style={[styles.card, dark ? styles.cardDark : styles.cardLight]} />
      <PulseBlock style={[styles.btn, dark ? styles.btnDark : styles.btnLight]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 24,
    gap: 14,
  },
  block: {
    borderRadius: 24,
  },
  points: {
    height: 72,
    borderRadius: 16,
  },
  pointsDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  pointsLight: {
    backgroundColor: 'rgba(255,107,157,0.12)',
  },
  card: {
    height: 210,
  },
  cardDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cardLight: {
    backgroundColor: 'rgba(255,107,157,0.1)',
  },
  btn: {
    height: 56,
    borderRadius: 28,
  },
  btnDark: {
    backgroundColor: 'rgba(255,107,157,0.25)',
  },
  btnLight: {
    backgroundColor: 'rgba(192,132,252,0.2)',
  },
});
