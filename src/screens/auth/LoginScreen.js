import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  Keyboard,
} from 'react-native';
import KeyboardContinueAccessory from '../../components/KeyboardContinueAccessory';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import BrandLogo from '../../components/BrandLogo';
import GradientButton from '../../components/GradientButton';
import { COLORS, GRADIENTS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  saveUserProfile,
  sendPasswordResetEmail,
  auth,
} from '../../utils/firebase';
import { formatAuthError } from '../../utils/authErrors';

const INPUT_ACCESSORY_ID = 'loginAccessory';

export default function LoginScreen({ navigation }) {
  const { enterGuestMode, exitGuestMode, isGuest } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Enter your email', 'Add the email you signed up with first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert('Check your inbox', 'We sent a password reset link to your email.');
    } catch (error) {
      Alert.alert('Could not send reset', formatAuthError(error));
    }
  };

  const handleAuth = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }

    if (trimmedPassword.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters.');
      return;
    }

    if (isGuest) {
      exitGuestMode();
    }

    Keyboard.dismiss();
    setLoading(true);
    try {
      if (isSignUp) {
        const { user } = await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          trimmedPassword
        );
        try {
          await saveUserProfile(user.uid, {
            email: trimmedEmail,
            createdAt: new Date().toISOString(),
            onboardingComplete: false,
          });
        } catch (profileError) {
          console.warn('Profile save failed after sign-up:', profileError.message);
          Alert.alert(
            'Account created',
            'Your account was created but saving your profile failed. Make sure Firestore is enabled in Firebase Console, then continue — you can complete onboarding next.'
          );
        }
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      }
    } catch (error) {
      Alert.alert(isSignUp ? 'Sign up failed' : 'Sign in failed', formatAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = Boolean(email.trim() && password.trim());

  return (
    <>
    <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <BrandLogo size="header" style={styles.logo} />
              <Text style={styles.subtitle}>
                {isSignUp ? 'Start your love story' : 'Welcome back, lovebird'}
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@email.com"
                placeholderTextColor={COLORS.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                inputAccessoryViewID={Platform.OS === 'ios' ? INPUT_ACCESSORY_ID : undefined}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleAuth}
                inputAccessoryViewID={Platform.OS === 'ios' ? INPUT_ACCESSORY_ID : undefined}
              />

              <GradientButton
                title={isSignUp ? 'Create Account' : 'Sign In'}
                onPress={handleAuth}
                loading={loading}
                style={styles.button}
              />

              {!isSignUp && (
                <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotRow}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.switchRow}>
                <Text style={styles.switchText}>
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                  <Text style={styles.switchLink}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={enterGuestMode} style={styles.previewRow}>
                <Text style={styles.previewText}>Explore without signing in</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
    <KeyboardContinueAccessory
      nativeID={INPUT_ACCESSORY_ID}
      onPress={handleAuth}
      disabled={!canSubmit || loading}
      label={isSignUp ? 'Create Account' : 'Sign In'}
    />
    </>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  form: { width: '100%' },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  button: { marginTop: 28 },
  forgotRow: { marginTop: 14, alignItems: 'center' },
  forgotText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.purple,
  },
  switchRow: { marginTop: 20, alignItems: 'center' },
  switchText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  switchLink: {
    fontFamily: FONTS.semiBold,
    color: COLORS.pink,
  },
  previewRow: {
    marginTop: 28,
    alignItems: 'center',
    paddingVertical: 12,
  },
  previewText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.purple,
  },
});
