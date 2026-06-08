import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientButton from '../../components/GradientButton';
import ProgressBar from '../../components/ProgressBar';
import { COLORS, GRADIENTS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { AuthContext } from '../../context/AuthContext';
import { saveUserProfile } from '../../utils/firebase';

export default function PartnerNameScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [partnerName, setPartnerName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!user?.uid || !partnerName.trim()) return;
    setLoading(true);
    try {
      await saveUserProfile(user.uid, { partnerName: partnerName.trim() });
      navigation.navigate('StartDate');
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not save partner name.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <View style={styles.container}>
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
            />
            <GradientButton title="Continue" onPress={handleNext} loading={loading} disabled={!partnerName.trim()} style={styles.button} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    justifyContent: 'center',
  },
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
