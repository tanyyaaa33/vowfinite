import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AvatarCircle from '../../components/AvatarCircle';
import ScreenLoader from '../../components/ScreenLoader';
import CoupleLoadError from '../../components/CoupleLoadError';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import { LOVE_LANGUAGES } from '../../constants/gameData';
import { getStreakCount } from '../../utils/points';
import { AuthContext } from '../../../App';
import { useCouple } from '../../hooks/useCouple';

export default function PartnerScreen() {
  const { profile } = useContext(AuthContext);
  const { couple, loading, error } = useCouple();

  if (loading) {
    return (
      <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ScreenLoader message="Loading partner info..." />
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

  const loveLang = LOVE_LANGUAGES.find((l) => l.id === profile?.loveLanguage);
  const partnerConnected = (couple?.members?.length || 0) >= 2;

  return (
    <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Your Partner</Text>

          <View style={[styles.profileCard, SHADOWS.strong]}>
            <LinearGradient colors={GRADIENTS.primary} style={styles.profileGradient}>
              <AvatarCircle initial={profile?.partnerName} size={88} />
              <Text style={styles.partnerName} numberOfLines={1}>
                {profile?.partnerName || 'Waiting...'}
              </Text>
              <Text style={styles.status}>
                {partnerConnected ? '💚 Connected' : '⏳ Waiting to join'}
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.row}>
            <View style={[styles.infoCard, SHADOWS.card]}>
              <Text style={styles.infoEmoji}>🔥</Text>
              <Text style={styles.infoValue}>{getStreakCount(couple)}</Text>
              <Text style={styles.infoLabel}>Day Streak</Text>
            </View>
            <View style={[styles.infoCard, SHADOWS.card]}>
              <Text style={styles.infoEmoji}>⭐</Text>
              <Text style={styles.infoValue}>{couple?.points || 0}</Text>
              <Text style={styles.infoLabel}>Points</Text>
            </View>
          </View>

          {loveLang && (
            <View style={[styles.loveCard, SHADOWS.card]}>
              <Text style={styles.loveTitle}>Your Love Language</Text>
              <View style={styles.loveRow}>
                <Text style={styles.loveEmoji}>{loveLang.emoji}</Text>
                <Text style={styles.loveLabel} numberOfLines={2}>
                  {loveLang.label}
                </Text>
              </View>
              <Text style={styles.loveHint}>
                Share this with {profile?.partnerName || 'your partner'} so they know how to make you feel loved
              </Text>
            </View>
          )}

          <View style={[styles.timelineCard, SHADOWS.card]}>
            <Text style={styles.timelineTitle}>Relationship Timeline</Text>
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineEvent}>Started dating</Text>
                <Text style={styles.timelineDate}>{profile?.startDate || '—'}</Text>
              </View>
            </View>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: COLORS.purple }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineEvent}>Joined VowFinity</Text>
                <Text style={styles.timelineDate}>Today</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
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
    marginBottom: 16,
  },
  profileCard: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 16,
  },
  profileGradient: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  partnerName: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: '#FFFFFF',
    marginTop: 14,
    maxWidth: '100%',
  },
  status: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoEmoji: { fontSize: 22, marginBottom: 4 },
  infoValue: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.pink,
  },
  infoLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  loveCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loveTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  loveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  loveEmoji: { fontSize: 26, marginRight: 10 },
  loveLabel: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.pink,
  },
  loveHint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  timelineCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timelineTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.pink,
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    minWidth: 0,
  },
  timelineEvent: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  timelineDate: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
