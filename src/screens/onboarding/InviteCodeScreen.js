import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientButton from '../../components/GradientButton';
import ProgressBar from '../../components/ProgressBar';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { AuthContext } from '../../../App';
import { createCouple, joinCouple, saveUserProfile } from '../../utils/firebase';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function InviteCodeScreen() {
  const { user, refreshProfile } = useContext(AuthContext);
  const [mode, setMode] = useState('choose');
  const [myCode, setMyCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const code = generateCode();
      await createCouple(user.uid, code);
      setMyCode(code);
      setMode('created');
      await saveUserProfile(user.uid, { onboardingComplete: true });
      await refreshProfile();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (joinCode.trim().length < 6) {
      Alert.alert('Invalid code', 'Please enter a 6-character invite code.');
      return;
    }
    setLoading(true);
    try {
      const coupleId = await joinCouple(user.uid, joinCode.trim());
      if (!coupleId) {
        Alert.alert('Not found', 'No couple found with that code. Double-check and try again.');
        return;
      }
      await saveUserProfile(user.uid, { onboardingComplete: true });
      await refreshProfile();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const shareCode = async () => {
    try {
      await Share.share({
        message: `Join me on VowFinity! Use invite code: ${myCode}`,
      });
    } catch (error) {
      if (error?.message !== 'User did not share') {
        Alert.alert('Error', error.message || 'Could not share invite code.');
      }
    }
  };

  if (mode === 'created') {
    return (
      <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.container}>
            <Text style={styles.stepLabel}>Step 6 of 6</Text>
            <ProgressBar progress={1} />
            <Text style={styles.emoji}>🎉</Text>
            <Text style={styles.title}>Your invite code</Text>
            <Text style={styles.subtitle}>Share this with your partner so you can connect</Text>
            <View style={[styles.codeBox, SHADOWS.strong]}>
              <Text style={styles.codeText}>{myCode}</Text>
            </View>
            <GradientButton title="Share Code" onPress={shareCode} style={styles.button} />
            <Text style={styles.waitHint}>Waiting for your partner to join...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.stepLabel}>Step 6 of 6</Text>
          <ProgressBar progress={1} />
          <Text style={styles.emoji}>🔗</Text>
          <Text style={styles.title}>Connect with your partner</Text>
          <Text style={styles.subtitle}>Create a code or join with theirs</Text>

          {mode === 'choose' && (
            <>
              <TouchableOpacity onPress={() => setMode('join')} style={[styles.modeCard, SHADOWS.card]}>
                <Text style={styles.modeEmoji}>💌</Text>
                <View>
                  <Text style={styles.modeTitle}>I have a code</Text>
                  <Text style={styles.modeDesc}>Enter your partner's invite code</Text>
                </View>
              </TouchableOpacity>
              <GradientButton title="Create Invite Code" onPress={handleCreate} loading={loading} style={styles.button} />
            </>
          )}

          {mode === 'join' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit code"
                placeholderTextColor={COLORS.placeholder}
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                autoFocus
              />
              <GradientButton title="Join Partner" onPress={handleJoin} loading={loading} style={styles.button} />
              <TouchableOpacity onPress={() => setMode('choose')} style={styles.backLink}>
                <Text style={styles.backText}>← Go back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
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
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeEmoji: { fontSize: 32, marginRight: 16 },
  modeTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  modeDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  input: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'center',
    letterSpacing: 8,
  },
  codeBox: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.pink,
    width: '100%',
  },
  codeText: {
    fontFamily: FONTS.bold,
    fontSize: 30,
    color: COLORS.pink,
    letterSpacing: 6,
  },
  button: { marginTop: 24 },
  waitHint: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 20,
  },
  backLink: { marginTop: 16, alignItems: 'center' },
  backText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.pink,
  },
  stepLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 32,
  },
});
