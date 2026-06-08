import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

export default function FirebaseSetupScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.emoji}>🔧</Text>
        <Text style={styles.title}>Firebase not configured</Text>
        <Text style={styles.body}>
          The app cannot start until you add your Firebase project keys.
        </Text>
        <View style={styles.steps}>
          <Text style={styles.step}>1. Go to console.firebase.google.com</Text>
          <Text style={styles.step}>2. Create a project → add a Web app</Text>
          <Text style={styles.step}>3. Enable Email/Password under Authentication</Text>
          <Text style={styles.step}>4. Create a Firestore database</Text>
          <Text style={styles.step}>5. Paste your config into src/utils/firebase.js</Text>
        </View>
        <Text style={styles.hint}>
          After saving, shake your phone and tap Reload, or press r in the terminal.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  steps: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  step: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  hint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
