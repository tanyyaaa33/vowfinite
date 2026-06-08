import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import GradientButton from './GradientButton';
import { COLORS, GRADIENTS, SHADOWS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { MILESTONE_COPY } from '../utils/points';

const SCREEN_W = Math.min(Dimensions.get('window').width, 390);

export default function MilestoneCelebration({ milestone, visible, onDismiss, dismissing = false }) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const confetti = useSharedValue(0);

  const copy = MILESTONE_COPY[milestone] || {
    emoji: '🎉',
    title: 'Milestone!',
    subtitle: 'Keep the love going',
  };

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 400 });
      confetti.value = withDelay(200, withSpring(1, { damping: 8 }));
    } else {
      scale.value = 0.6;
      opacity.value = 0;
      confetti.value = 0;
    }
  }, [visible, scale, opacity, confetti]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confetti.value }, { rotate: `${confetti.value * 20}deg` }],
    opacity: confetti.value,
  }));

  if (!visible || !milestone) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <LinearGradient colors={GRADIENTS.soft} style={styles.backdrop}>
        <Animated.View style={[styles.cardWrap, cardStyle]}>
          <LinearGradient colors={GRADIENTS.primary} style={[styles.heroRing, SHADOWS.strong]}>
            <Animated.Text style={[styles.bigEmoji, sparkleStyle]}>{copy.emoji}</Animated.Text>
          </LinearGradient>

          <View style={[styles.card, SHADOWS.strong]}>
            <Text style={styles.badge}>MILESTONE</Text>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>

            <View style={styles.streakCircle}>
              <LinearGradient colors={GRADIENTS.primary} style={styles.streakGradient}>
                <Text style={styles.streakNumber}>{milestone}</Text>
                <Text style={styles.streakLabel}>days</Text>
              </LinearGradient>
            </View>

            <Text style={styles.message}>
              You completed {milestone} days of daily connection. That's real devotion. 💕
            </Text>

            <GradientButton
              title={dismissing ? 'Saving...' : 'Celebrate Together'}
              onPress={onDismiss}
              disabled={dismissing}
              loading={dismissing}
              style={styles.button}
            />
          </View>
        </Animated.View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cardWrap: {
    width: SCREEN_W - 32,
    maxWidth: 358,
    alignItems: 'center',
  },
  heroRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -44,
    zIndex: 2,
  },
  bigEmoji: {
    fontSize: 42,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badge: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.pink,
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 26,
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  streakCircle: {
    marginBottom: 16,
  },
  streakGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakNumber: {
    fontFamily: FONTS.bold,
    fontSize: 32,
    color: '#FFFFFF',
    lineHeight: 36,
  },
  streakLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
  },
  message: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  button: {
    width: '100%',
  },
});
