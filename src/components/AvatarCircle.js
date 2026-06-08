import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

export function getInitial(value) {
  if (!value) return '?';
  const trimmed = String(value).trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

export default function AvatarCircle({
  initial,
  size = 48,
  gradient = GRADIENTS.primary,
}) {
  const letter = getInitial(initial);
  const fontSize = size * 0.42;

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            width: size - 4,
            height: size - 4,
            borderRadius: (size - 4) / 2,
          },
        ]}
      >
        <Text style={[styles.initial, { fontSize, lineHeight: fontSize * 1.1 }]}>
          {letter}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: FONTS.displayItalic,
    fontStyle: 'italic',
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
