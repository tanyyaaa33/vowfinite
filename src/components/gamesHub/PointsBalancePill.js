import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { formatPoints } from '../../utils/points';

export default function PointsBalancePill({ points = 0 }) {
  return (
    <LinearGradient
      colors={GRADIENTS.primary}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.pill}
    >
      <Text style={styles.text} numberOfLines={1}>
        ⭐ {formatPoints(points)}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 68,
    maxWidth: 120,
    alignItems: 'center',
    flexShrink: 0,
  },
  text: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
