import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, GRADIENTS } from '../constants/colors';

export default function ProgressBar({
  progress = 0,
  height = 6,
  animated = true,
  style,
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const animatedProgress = useSharedValue(0);
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  useEffect(() => {
    if (animated) {
      animatedProgress.value = withTiming(clampedProgress, { duration: 400 });
    } else {
      animatedProgress.value = clampedProgress;
    }
  }, [clampedProgress, animated, animatedProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: trackWidth * animatedProgress.value,
  }));

  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2 }, style]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.fillWrapper, { height, borderRadius: height / 2 }, fillStyle]}>
        <LinearGradient
          colors={GRADIENTS.primary}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.fill, { height, borderRadius: height / 2 }]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  fillWrapper: {
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
  },
});
