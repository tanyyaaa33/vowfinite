import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AvatarCircle from '../../components/AvatarCircle';
import ProgressBar from '../../components/ProgressBar';
import ScreenLoader from '../../components/ScreenLoader';
import CoupleLoadError from '../../components/CoupleLoadError';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import { AuthContext } from '../../../App';
import { auth, signOut } from '../../utils/firebase';
import { useCouple } from '../../hooks/useCouple';
import UnlocksSection from '../../components/UnlocksSection';
import { getLevel, getProgressToNextLevel, formatPoints, getStreakCount, getFreezeTokens } from '../../utils/points';

export default function ProfileScreen() {
  const { user, profile } = useContext(AuthContext);
  const { couple, loading, error } = useCouple();

  if (loading) {
    return (
      <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ScreenLoader message="Loading your profile..." />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <CoupleLoadError message={error?.message || 'Could not load couple data.'} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const points = couple?.points || 0;
  const level = getLevel(points);
  const progress = getProgressToNextLevel(points);

  const doSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
          } catch (error) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  return (
    <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Profile</Text>

          <View style={[styles.profileCard, SHADOWS.card]}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : profile?.avatarEmoji ? (
              <View style={styles.emojiAvatar}>
                <Text style={styles.emojiText}>{profile.avatarEmoji}</Text>
              </View>
            ) : (
              <AvatarCircle initial={profile?.name} size={90} />
            )}
            <Text style={styles.name}>{profile?.name || 'You'}</Text>
            <Text style={styles.email}>{profile?.email || user?.email}</Text>
          </View>

          <View style={[styles.statsCard, SHADOWS.card]}>
            <Text style={styles.statsTitle}>Your Journey</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatPoints(points)}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{getStreakCount(couple)}</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{getFreezeTokens(couple)}</Text>
                <Text style={styles.statLabel}>Freezes</Text>
              </View>
            </View>
            <ProgressBar progress={progress} height={8} />
            <Text style={styles.levelHint}>
              Level {level.level} · {level.title}
            </Text>
          </View>

          <UnlocksSection couple={couple} />

          <View style={[styles.menuCard, SHADOWS.card]}>
            <MenuItem emoji="💑" label="Partner" value={profile?.partnerName} />
            <MenuItem emoji="📅" label="Together since" value={profile?.startDate} />
            <MenuItem emoji="🔗" label="Invite code" value={profile?.inviteCode} />
          </View>

          <TouchableOpacity onPress={doSignOut} style={styles.signOutBtn} activeOpacity={0.8}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function MenuItem({ emoji, label, value }) {
  return (
    <View style={styles.menuItem}>
      <Text style={styles.menuEmoji}>{emoji}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24 },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: COLORS.navy,
    marginTop: 8,
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 26,
    color: COLORS.navy,
    marginTop: 14,
  },
  email: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.pink,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  levelHint: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  menuCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuEmoji: { fontSize: 20, marginRight: 12 },
  menuLabel: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  menuValue: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: COLORS.pink,
  },
  emojiAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  emojiText: {
    fontSize: 40,
  },
  signOutBtn: {
    paddingVertical: 15,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.pink,
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: COLORS.cardBg,
  },
  signOutText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.pink,
  },
});
