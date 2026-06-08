import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GRADIENTS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

export default function AnimatedCheckmark({ size = 88 }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 140 });
    opacity.value = withTiming(1, { duration: 250 });
    checkScale.value = withDelay(220, withSpring(1, { damping: 10, stiffness: 180 }));
  }, [checkScale, opacity, scale]);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  return (
    <Animated.View style={[styles.wrap, { width: size, height: size }, wrapStyle]}>
      <LinearGradient
        colors={GRADIENTS.primary}
        style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Animated.Text style={[styles.check, { fontSize: size * 0.42 }, checkStyle]}>
          ✓
        </Animated.Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 10,
  },
  check: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    lineHeight: undefined,
  },
});
