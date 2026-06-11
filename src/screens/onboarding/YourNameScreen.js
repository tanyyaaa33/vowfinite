import React, { useState, useContext } from 'react';
import { Text, TextInput, StyleSheet, Alert, Platform, Keyboard } from 'react-native';
import GradientButton from '../../components/GradientButton';
import ProgressBar from '../../components/ProgressBar';
import OnboardingScreenLayout from '../../components/OnboardingScreenLayout';
import KeyboardContinueAccessory from '../../components/KeyboardContinueAccessory';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { AuthContext } from '../../context/AuthContext';
import { auth, saveUserProfile, signOut } from '../../utils/firebase';

const INPUT_ACCESSORY_ID = 'yourNameAccessory';

const handleBackToSignIn = () => {
  Alert.alert('Leave setup?', 'You will return to sign in.', [
    { text: 'Stay', style: 'cancel' },
    {
      text: 'Sign out',
      style: 'destructive',
      onPress: () => signOut(auth),
    },
  ]);
};

export default function YourNameScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const canContinue = Boolean(name.trim());

  const handleNext = async () => {
    if (!user?.uid || !canContinue) return;
    Keyboard.dismiss();
    setLoading(true);
    try {
      await saveUserProfile(user.uid, { name: name.trim() });
      navigation.navigate('PartnerName');
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not save your name.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <OnboardingScreenLayout
        contentContainerStyle={styles.content}
        onBack={handleBackToSignIn}
        backLabel="Sign in"
      >
        <Text style={styles.stepLabel}>Step 1 of 6</Text>
        <ProgressBar progress={1 / 6} />
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>What's your name?</Text>
        <Text style={styles.subtitle}>Let's personalize your VowFinity experience</Text>
        <TextInput
          style={styles.input}
          placeholder="Your first name"
          placeholderTextColor={COLORS.placeholder}
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleNext}
          inputAccessoryViewID={Platform.OS === 'ios' ? INPUT_ACCESSORY_ID : undefined}
        />
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
  content: { paddingHorizontal: 16 },
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: 16, marginTop: 32 },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
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
