import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
  Keyboard,
} from 'react-native';
import GradientButton from '../../components/GradientButton';
import ProgressBar from '../../components/ProgressBar';
import OnboardingScreenLayout from '../../components/OnboardingScreenLayout';
import KeyboardContinueAccessory from '../../components/KeyboardContinueAccessory';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { AuthContext } from '../../context/AuthContext';
import { saveUserProfile } from '../../utils/firebase';

const PRONOUN_OPTIONS = [
  { id: 'he', label: 'He / Him' },
  { id: 'she', label: 'She / Her' },
  { id: 'they', label: 'They / Them' },
];

const INPUT_ACCESSORY_ID = 'partnerNameAccessory';

export default function PartnerNameScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [partnerName, setPartnerName] = useState('');
  const [partnerGender, setPartnerGender] = useState('they');
  const [loading, setLoading] = useState(false);

  const canContinue = Boolean(partnerName.trim());

  const handleNext = async () => {
    if (!user?.uid || !canContinue) return;
    Keyboard.dismiss();
    setLoading(true);
    try {
      await saveUserProfile(user.uid, {
        partnerName: partnerName.trim(),
        partnerGender,
      });
      navigation.navigate('StartDate');
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not save partner name.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <OnboardingScreenLayout onBack={() => navigation.goBack()}>
        <Text style={styles.stepLabel}>Step 2 of 6</Text>
        <ProgressBar progress={2 / 6} />
        <Text style={styles.emoji}>💑</Text>
        <Text style={styles.title}>Who's your person?</Text>
        <Text style={styles.subtitle}>We'll use this to make everything feel personal</Text>
        <TextInput
          style={styles.input}
          placeholder="Partner's name"
          placeholderTextColor={COLORS.placeholder}
          value={partnerName}
          onChangeText={setPartnerName}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleNext}
          inputAccessoryViewID={Platform.OS === 'ios' ? INPUT_ACCESSORY_ID : undefined}
        />

        <Text style={styles.pronounLabel}>Pronouns (for He&apos;s a 10 But)</Text>
        <View style={styles.pronounRow}>
          {PRONOUN_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.pronounChip,
                partnerGender === option.id && styles.pronounChipActive,
              ]}
              onPress={() => setPartnerGender(option.id)}
            >
              <Text
                style={[
                  styles.pronounChipText,
                  partnerGender === option.id && styles.pronounChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
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
  pronounLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  pronounRow: {
    gap: 8,
  },
  pronounChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBg,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pronounChipActive: {
    borderColor: COLORS.pink,
    backgroundColor: '#FFF0F6',
  },
  pronounChipText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  pronounChipTextActive: {
    color: COLORS.pink,
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
