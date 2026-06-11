import React from 'react';
import { StyleSheet } from 'react-native';
import GradientButton from './GradientButton';
import { navigateToGamesHub } from '../utils/gameNavigation';

export default function BackToGamesButton({ navigation, title = 'Back to Games', style }) {
  const goBack = () => navigateToGamesHub(navigation);

  return (
    <GradientButton title={title} onPress={goBack} style={[styles.btn, style]} />
  );
}

const styles = StyleSheet.create({
  btn: {},
});
