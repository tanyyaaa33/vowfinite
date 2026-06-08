import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const isMounted = { current: true };

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      if (isMounted.current) {
        navigation.replace('Login');
      }
    }, 2500);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
    };
  }, [navigation, fadeAnim, scaleAnim]);

  return (
    <LinearGradient colors={GRADIENTS.soft} style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient colors={GRADIENTS.primary} style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>💕</Text>
        </LinearGradient>
        <Text style={styles.title}>VowFinity</Text>
        <Text style={styles.tagline}>Love, one moment at a time</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoEmoji: {
    fontSize: 44,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 36,
    color: COLORS.navy,
    marginBottom: 8,
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
});
