import React, { useState, useContext } from 'react';
import { Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import GradientButton from '../../components/GradientButton';
import ProgressBar from '../../components/ProgressBar';
import OnboardingScreenLayout from '../../components/OnboardingScreenLayout';
import { COLORS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { LOVE_LANGUAGES } from '../../constants/gameData';
import { AuthContext } from '../../context/AuthContext';
import { saveUserProfile } from '../../utils/firebase';

export default function LoveLanguageScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!selected || !user?.uid) return;
    setLoading(true);
    try {
      await saveUserProfile(user.uid, { loveLanguage: selected });
      navigation.navigate('InviteCode');
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not save love language.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingScreenLayout onBack={() => navigation.goBack()}>
      <Text style={styles.stepLabel}>Step 5 of 6</Text>
      <ProgressBar progress={5 / 6} />
      <Text style={styles.emoji}>💝</Text>
      <Text style={styles.title}>Your love language</Text>
      <Text style={styles.subtitle}>How do you feel most loved?</Text>

      {LOVE_LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang.id}
          onPress={() => setSelected(lang.id)}
          activeOpacity={0.8}
          style={[styles.option, selected === lang.id && styles.optionSelected, SHADOWS.card]}
        >
          <Text style={styles.optionEmoji}>{lang.emoji}</Text>
          <Text style={[styles.optionLabel, selected === lang.id && styles.optionLabelSelected]}>
            {lang.label}
          </Text>
          {selected === lang.id && <Text style={styles.check}>✓</Text>}
        </TouchableOpacity>
      ))}

      <GradientButton
        title="Continue"
        onPress={handleNext}
        loading={loading}
        disabled={!selected}
        style={styles.button}
      />
    </OnboardingScreenLayout>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: 16, marginTop: 16 },
  title: {
    fontFamily: FONTS.display,
    fontSize: 32,
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 28,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionSelected: {
    borderColor: COLORS.pink,
    backgroundColor: COLORS.screenBg,
  },
  optionEmoji: { fontSize: 28, marginRight: 14 },
  optionLabel: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  optionLabelSelected: { color: COLORS.pink },
  check: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.pink,
  },
  button: { marginTop: 20 },
  stepLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
});
