import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING, GRID_CARD_GAP, getGridCardWidth } from '../../constants/layout';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function GamesHubGridCard({
  emoji,
  title,
  description,
  timesPlayed = 0,
  isNew = false,
  partnerWaiting = false,
  onPress,
}) {
  const cardWidth = getGridCardWidth();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    try {
      onPress?.();
    } catch (error) {
      console.warn('GamesHubGridCard onPress failed:', error.message);
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 150 });
      }}
      style={[styles.wrapper, { width: cardWidth }, animatedStyle]}
    >
      <View
        style={[
          styles.card,
          SHADOWS.card,
          partnerWaiting && styles.cardWaiting,
        ]}
      >
        {isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newText}>New</Text>
          </View>
        )}

        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.played}>
            {timesPlayed === 0 ? 'Never played' : `${timesPlayed} played`}
          </Text>
          <LinearGradient colors={GRADIENTS.primary} style={styles.arrowBtn}>
            <Text style={styles.arrow}>→</Text>
          </LinearGradient>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 140,
    marginBottom: GRID_CARD_GAP,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
  },
  cardWaiting: {
    borderColor: COLORS.pink,
    borderWidth: 1.5,
  },
  newBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF8A7A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 1,
  },
  newText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  emoji: {
    fontSize: 28,
    lineHeight: 32,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15,
    flex: 1,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  played: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textMuted,
    flex: 1,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
