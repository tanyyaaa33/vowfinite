import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONTS } from '../../constants/fonts';

export default function PromptGlow({ text, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.glow} pointerEvents="none" />
      <Text style={styles.text} numberOfLines={5}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
    width: '100%',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: 'rgba(255,107,157,0.12)',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  text: {
    fontFamily: FONTS.displayItalic,
    fontSize: 21,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 30,
  },
});
