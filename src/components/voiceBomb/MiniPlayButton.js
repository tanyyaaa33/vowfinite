import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function MiniPlayButton({ onPress, playing = false, disabled = false }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.btn, disabled && styles.disabled]}
    >
      {playing ? (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path d="M8 5v14l11-7L8 5Z" fill="#0D0A14" />
        </Svg>
      ) : (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path d="M8 5v14l11-7L8 5Z" fill="#0D0A14" />
        </Svg>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
