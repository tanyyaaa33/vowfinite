import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { COLORS, GRADIENTS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const TOTAL_ACTIVITIES = 3;

export default function StreakBadge({ count = 0, activitiesToday = 0 }) {
  const filledPills = Math.min(Math.max(activitiesToday, 0), TOTAL_ACTIVITIES);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.heart}>💗</Text>
        <MaskedView
          maskElement={
            <Text style={styles.countMask}>{count}</Text>
          }
        >
          <LinearGradient
            colors={GRADIENTS.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.countTransparent}>{count}</Text>
          </LinearGradient>
        </MaskedView>
        <Text style={styles.dayLabel}>day streak</Text>
      </View>

      <View style={styles.pillsRow}>
        {Array.from({ length: TOTAL_ACTIVITIES }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.pill,
              index < filledPills ? styles.pillFilled : styles.pillEmpty,
            ]}
          >
            {index < filledPills ? (
              <LinearGradient
                colors={GRADIENTS.primary}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.pillGradient}
              />
            ) : null}
          </View>
        ))}
        <Text style={styles.pillLabel}>
          {filledPills}/{TOTAL_ACTIVITIES} today
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexShrink: 0,
    maxWidth: 158,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  heart: {
    fontSize: 16,
  },
  countMask: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    lineHeight: 22,
  },
  countTransparent: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    lineHeight: 22,
    opacity: 0,
  },
  dayLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textMuted,
    marginLeft: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pill: {
    width: 22,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  pillEmpty: {
    backgroundColor: COLORS.border,
  },
  pillFilled: {
    backgroundColor: 'transparent',
  },
  pillGradient: {
    flex: 1,
    borderRadius: 3,
  },
  pillLabel: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: COLORS.textMuted,
    marginLeft: 2,
    flexShrink: 1,
  },
});
