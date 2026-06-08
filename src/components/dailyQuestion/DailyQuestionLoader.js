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
import { FONTS } from '../../constants/fonts';
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

export default function DailyQuestionLoader() {
  return (
    <View style={styles.container}>
      <PulseBlock style={styles.questionCard} />
      <PulseBlock style={styles.inputBlock} />
      <PulseBlock style={styles.frostBlock} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
  },
  block: {
    backgroundColor: '#FFD6E8',
    borderRadius: 18,
  },
  questionCard: {
    height: 132,
    marginBottom: 20,
    borderRadius: 24,
  },
  inputBlock: {
    height: 140,
    marginBottom: 16,
  },
  frostBlock: {
    height: 72,
  },
});
