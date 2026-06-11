import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import GradientButton from '../../components/GradientButton';
import AvatarCircle from '../../components/AvatarCircle';
import ProgressBar from '../../components/ProgressBar';
import OnboardingScreenLayout from '../../components/OnboardingScreenLayout';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { AuthContext } from '../../context/AuthContext';
import { uploadAvatar, saveUserProfile } from '../../utils/firebase';

const AVATAR_EMOJIS = ['😊', '🥰', '😎', '🦋', '🌸', '✨', '💫', '🌙'];

export default function AvatarScreen({ navigation }) {
  const { user, profile, refreshProfile } = useContext(AuthContext);
  const [avatarUri, setAvatarUri] = useState(profile?.avatarUrl || null);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to set your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
      setSelectedEmoji(null);
    }
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      if (avatarUri && !avatarUri.startsWith('http')) {
        await uploadAvatar(user.uid, avatarUri);
      } else if (selectedEmoji) {
        await saveUserProfile(user.uid, { avatarEmoji: selectedEmoji });
      }
      await refreshProfile();
      navigation.navigate('LoveLanguage');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingScreenLayout onBack={() => navigation.goBack()}>
      <Text style={styles.stepLabel}>Step 4 of 6</Text>
      <ProgressBar progress={4 / 6} />
      <Text style={styles.emoji}>📸</Text>
      <Text style={styles.title}>Choose your look</Text>
      <Text style={styles.subtitle}>Upload a photo or pick a fun avatar</Text>

      <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : selectedEmoji ? (
          <View style={styles.emojiAvatar}>
            <Text style={styles.emojiAvatarText}>{selectedEmoji}</Text>
          </View>
        ) : (
          <AvatarCircle initial={profile?.name} size={120} />
        )}
        <Text style={styles.tapHint}>Tap to upload photo</Text>
      </TouchableOpacity>

      <Text style={styles.orText}>or pick an emoji</Text>
      <View style={styles.emojiGrid}>
        {AVATAR_EMOJIS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            onPress={() => {
              setSelectedEmoji(emoji);
              setAvatarUri(null);
            }}
            style={[styles.emojiOption, selectedEmoji === emoji && styles.emojiSelected]}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <GradientButton
        title="Continue"
        onPress={handleNext}
        loading={loading}
        disabled={!avatarUri && !selectedEmoji}
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
    marginBottom: 24,
  },
  avatarWrapper: { alignItems: 'center', marginBottom: 20 },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.pink,
  },
  emojiAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.pink,
  },
  emojiAvatarText: { fontSize: 52 },
  stepLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  tapHint: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.pink,
    marginTop: 12,
  },
  orText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 14,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  emojiOption: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  emojiSelected: {
    borderColor: COLORS.pink,
    backgroundColor: COLORS.screenBg,
  },
  emojiText: { fontSize: 26 },
  button: { marginTop: 28 },
});
