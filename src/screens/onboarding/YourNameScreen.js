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

export default function YourNameScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!user?.uid || !name.trim()) return;
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
    <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <View style={styles.container}>
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
            />
            <GradientButton title="Continue" onPress={handleNext} loading={loading} disabled={!name.trim()} style={styles.button} />
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
    paddingHorizontal: 16,
    paddingTop: 20,
    justifyContent: 'center',
  },
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
