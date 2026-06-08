import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { ACTIVITIES_REQUIRED } from '../../utils/points';

export default function StreakSectionCard({ streak = 0, activitiesToday = 0 }) {
  const safeStreak = streak ?? 0;
  const safeActivities = activitiesToday ?? 0;
  const progress = Math.min(safeActivities / ACTIVITIES_REQUIRED, 1);

  return (
    <View style={[styles.card, SHADOWS.card]}>
      <View style={styles.topRow}>
        <View style={styles.streakLeft}>
          <Text style={styles.heart}>❤️</Text>
          <Text style={styles.streakText} numberOfLines={1}>
            {safeStreak} day streak
          </Text>
        </View>

        <View style={styles.progressWrap}>
          <Text style={styles.progressLabel}>
            {safeActivities}/{ACTIVITIES_REQUIRED} today
          </Text>
          <View style={styles.barTrack}>
            <LinearGradient
              colors={GRADIENTS.primary}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.barFill, { width: `${Math.max(progress * 100, 0)}%` }]}
            />
          </View>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Complete {ACTIVITIES_REQUIRED} activities to keep your streak
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  heart: {
    fontSize: 20,
  },
  streakText: {
    fontFamily: FONTS.displayItalic,
    fontSize: 20,
    color: COLORS.pink,
    flexShrink: 1,
  },
  progressWrap: {
    alignItems: 'flex-end',
    minWidth: 88,
  },
  progressLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.pink,
    marginBottom: 6,
  },
  barTrack: {
    width: 72,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
