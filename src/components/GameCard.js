import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, SHADOWS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function GameCard({
  emoji,
  title,
  description,
  timesPlayed = 0,
  isNew = false,
  hasNotification = false,
  onPress,
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.97, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.wrapper, animatedStyle]}
    >
      <View style={[styles.card, SHADOWS.card]}>
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>{emoji}</Text>
          {hasNotification && <View style={styles.notificationDot} />}
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newText}>NEW</Text>
              </View>
            )}
          </View>
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
          <Text style={styles.played}>
            {timesPlayed === 0 ? 'Never played' : `Played ${timesPlayed} time${timesPlayed === 1 ? '' : 's'}`}
          </Text>
        </View>

        <Text style={styles.chevron}>›</Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emojiContainer: {
    position: 'relative',
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  emoji: {
    fontSize: 26,
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.pink,
    borderWidth: 2,
    borderColor: COLORS.cardBg,
  },
  content: {
    flex: 1,
    paddingRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  newBadge: {
    backgroundColor: COLORS.purple + '25',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  newText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.purple,
    letterSpacing: 0.5,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 6,
  },
  played: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.pink,
  },
  chevron: {
    fontFamily: FONTS.semiBold,
    fontSize: 24,
    color: COLORS.placeholder,
  },
});
