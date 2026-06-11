import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform, Keyboard } from 'react-native';
import GradientButton from '../../components/GradientButton';
import ProgressBar from '../../components/ProgressBar';
import OnboardingScreenLayout from '../../components/OnboardingScreenLayout';
import KeyboardContinueAccessory from '../../components/KeyboardContinueAccessory';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { AuthContext } from '../../context/AuthContext';
import { saveUserProfile } from '../../utils/firebase';

const INPUT_ACCESSORY_ID = 'startDateAccessory';

export default function StartDateScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);

  const canContinue = date.length >= 10;

  const handleNext = async () => {
    if (!user?.uid || !date.trim() || !canContinue) return;
    Keyboard.dismiss();
    setLoading(true);
    try {
      await saveUserProfile(user.uid, { startDate: date.trim() });
      navigation.navigate('Avatar');
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not save your date.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (text) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 8);
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
  };

  return (
    <>
      <OnboardingScreenLayout onBack={() => navigation.goBack()}>
        <Text style={styles.stepLabel}>Step 3 of 6</Text>
        <ProgressBar progress={3 / 6} />
        <Text style={styles.emoji}>📅</Text>
        <Text style={styles.title}>When did you start dating?</Text>
        <Text style={styles.subtitle}>We'll celebrate your milestones together</Text>
        <TextInput
          style={styles.input}
          placeholder="MM/DD/YYYY"
          placeholderTextColor={COLORS.placeholder}
          value={date}
          onChangeText={(t) => setDate(formatDate(t))}
          keyboardType="number-pad"
          maxLength={10}
          inputAccessoryViewID={Platform.OS === 'ios' ? INPUT_ACCESSORY_ID : undefined}
        />
        <View style={styles.daysCard}>
          <Text style={styles.daysLabel}>Every day together counts</Text>
          <Text style={styles.daysHint}>We'll show your love timeline on your home screen</Text>
        </View>
        <GradientButton
          title="Continue"
          onPress={handleNext}
          loading={loading}
          disabled={!canContinue}
          style={styles.button}
        />
      </OnboardingScreenLayout>
      <KeyboardContinueAccessory
        nativeID={INPUT_ACCESSORY_ID}
        onPress={handleNext}
        disabled={!canContinue || loading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: 16, marginTop: 32 },
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
    marginBottom: 32,
    lineHeight: 22,
  },
  input: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontFamily: FONTS.regular,
    fontSize: 18,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'center',
  },
  daysCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  daysLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.pink,
    marginBottom: 4,
  },
  daysHint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  button: { marginTop: 28 },
  stepLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 32,
  },
});
