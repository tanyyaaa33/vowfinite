import React from 'react';
import { StyleSheet } from 'react-native';
import GradientButton from './GradientButton';

export default function BackToGamesButton({ navigation, title = 'Back to Games', style }) {
  const goBack = () => {
    try {
      navigation.navigate('Games');
    } catch {
      navigation.goBack();
    }
  };

  return (
    <GradientButton title={title} onPress={goBack} style={[styles.btn, style]} />
  );
}

const styles = StyleSheet.create({
  btn: {
    marginTop: 8,
  },
});
