import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LoadingSpinner from './LoadingSpinner';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

export default function ScreenLoader({ message = 'Loading...' }) {
  return (
    <View style={styles.container}>
      <LoadingSpinner size="large" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  message: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
