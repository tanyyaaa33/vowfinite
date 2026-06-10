import React from 'react';
import { Image, StyleSheet } from 'react-native';

const SIZES = {
  splash: { width: 300, height: 300 },
  header: { width: 280, height: 280 },
  compact: { width: 140, height: 140 },
};

export default function BrandLogo({ size = 'header', style }) {
  const dimensions = SIZES[size] ?? SIZES.header;

  return (
    <Image
      source={require('../../assets/logo.png')}
      style={[dimensions, styles.logo, style]}
      resizeMode="contain"
      accessible
      accessibilityLabel="Vowfinity logo"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
  },
});
