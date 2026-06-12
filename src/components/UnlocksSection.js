import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { UNLOCKS, hasUnlock, getCouplePoints } from '../utils/points';

const COMING_SOON_MESSAGE =
  "This reward is coming soon in a future update. You've earned it — we'll notify you when it launches!";

export default function UnlocksSection({ couple }) {
  const points = getCouplePoints(couple);

  if (!couple) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Rewards & Unlocks</Text>
        <Text style={styles.empty}>Complete games to start earning rewards.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rewards & Unlocks</Text>
      {UNLOCKS.map((unlock, index) => {
        const unlocked = hasUnlock(couple, unlock.id);
        const progress = Math.min(points / unlock.points, 1);
        const isLast = index === UNLOCKS.length - 1;

        const handlePress = () => {
          if (!unlocked) return;
          Alert.alert(unlock.title, COMING_SOON_MESSAGE);
        };

        return (
          <TouchableOpacity
            key={unlock.id}
            activeOpacity={unlocked ? 0.75 : 1}
            onPress={handlePress}
            disabled={!unlocked}
            style={[styles.row, unlocked && styles.rowUnlocked, isLast && styles.rowLast]}
          >
            <Text style={styles.emoji}>{unlock.emoji}</Text>
            <View style={styles.content}>
              <Text style={[styles.rowTitle, unlocked && styles.rowTitleUnlocked]} numberOfLines={1}>
                {unlock.title}
              </Text>
              <Text style={styles.rowDesc} numberOfLines={2}>
                {unlock.description}
              </Text>
              {!unlocked ? (
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={GRADIENTS.primary}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={[styles.barFill, { width: `${progress * 100}%` }]}
                  />
                </View>
              ) : (
                <Text style={styles.tapHint}>Tap to view your reward</Text>
              )}
            </View>
            <Text style={[styles.pointsLabel, unlocked && styles.unlockedLabel]}>
              {unlocked ? '✓' : `${unlock.points}`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  empty: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
    opacity: 0.7,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowUnlocked: {
    opacity: 1,
    backgroundColor: COLORS.screenBg,
    borderRadius: 12,
    marginHorizontal: -4,
    paddingHorizontal: 4,
  },
  tapHint: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.pink,
    marginTop: 4,
  },
  emoji: {
    fontSize: 22,
    width: 28,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  rowTitleUnlocked: {
    color: COLORS.pink,
  },
  rowDesc: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  barTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  pointsLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textMuted,
    minWidth: 36,
    textAlign: 'right',
  },
  unlockedLabel: {
    color: COLORS.green,
    fontSize: 16,
  },
});
