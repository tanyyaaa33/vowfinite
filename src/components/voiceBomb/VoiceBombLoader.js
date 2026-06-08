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
        withTiming(0.7, { duration: 900 }),
        withTiming(0.35, { duration: 900 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.block, style, animatedStyle]} />;
}

export default function VoiceBombLoader() {
  return (
    <View style={styles.container}>
      <PulseBlock style={styles.prompt} />
      <PulseBlock style={styles.record} />
      <PulseBlock style={styles.wave} />
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
    paddingTop: 40,
    gap: 24,
    alignItems: 'center',
  },
  block: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  prompt: {
    width: '100%',
    height: 96,
  },
  record: {
    width: 116,
    height: 116,
    borderRadius: 58,
  },
  wave: {
    width: '88%',
    height: 48,
    borderRadius: 12,
  },
});
