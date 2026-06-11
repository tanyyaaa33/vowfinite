import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

export default function OnboardingBackButton({ onPress, label = 'Back' }) {
  if (!onPress) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.btn}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.arrow}>←</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  arrow: {
    fontFamily: FONTS.medium,
    fontSize: 22,
    color: COLORS.navy,
    lineHeight: 24,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.navy,
  },
});
