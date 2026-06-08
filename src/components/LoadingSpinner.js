import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, GRADIENTS } from '../constants/colors';

const SIZES = {
  small: 28,
  medium: 40,
  large: 56,
};

export default function LoadingSpinner({ size = 'medium', style }) {
  const dimension = typeof size === 'number' ? size : SIZES[size] || SIZES.medium;
  const rotation = useSharedValue(0);
  const ringWidth = Math.max(3, dimension * 0.1);
  const innerSize = dimension - ringWidth * 2;

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={[styles.container, { width: dimension, height: dimension }, style]}>
      <Animated.View style={[styles.ringWrapper, animatedStyle, { width: dimension, height: dimension }]}>
        <LinearGradient
          colors={[COLORS.pink, COLORS.purple, COLORS.pink + '30', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
          }}
        />
      </Animated.View>
      <View
        style={[
          styles.inner,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrapper: {
    position: 'absolute',
  },
  inner: {
    backgroundColor: COLORS.screenBg,
  },
});
