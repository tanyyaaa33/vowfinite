import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SCREEN_PADDING } from '../../constants/layout';

function PulseBlock({ style }) {
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 900 }),
        withTiming(0.45, { duration: 900 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.block, style, animatedStyle]} />;
}

export default function Hes10Loader() {
  return (
    <View style={styles.container}>
      <PulseBlock style={styles.card} />
      <PulseBlock style={styles.input} />
      <PulseBlock style={styles.preview} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 12,
    gap: 12,
  },
  block: {
    backgroundColor: '#FFD6E8',
    borderRadius: 18,
  },
  card: {
    height: 120,
  },
  input: {
    height: 52,
  },
  preview: {
    height: 200,
    borderRadius: 22,
  },
});
