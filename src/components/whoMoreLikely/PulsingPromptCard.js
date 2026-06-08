import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

export default function PulsingPromptCard({ label, prompt }) {
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400 }),
        withTiming(0.5, { duration: 1400 })
      ),
      -1,
      true
    );
  }, [pulse]);

  const borderStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <View style={styles.outer}>
      <Animated.View style={[styles.borderRing, borderStyle]}>
        <LinearGradient
          colors={GRADIENTS.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.borderGradient}
        >
          <View style={styles.card}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.prompt} numberOfLines={4}>
              {prompt}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: 20,
  },
  borderRing: {
    borderRadius: 20,
    ...SHADOWS.strong,
    shadowColor: COLORS.pink,
  },
  borderGradient: {
    borderRadius: 20,
    padding: 2.5,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 16,
    minHeight: 128,
    justifyContent: 'center',
  },
  label: {
    fontFamily: FONTS.displayItalic,
    fontSize: 12,
    color: COLORS.pink,
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  prompt: {
    fontFamily: FONTS.displayItalic,
    fontSize: 20,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 2,
  },
});
