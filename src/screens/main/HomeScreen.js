import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AvatarCircle from '../../components/AvatarCircle';
import StreakBadge from '../../components/StreakBadge';
import GameCard from '../../components/GameCard';
import ProgressBar from '../../components/ProgressBar';
import ScreenLoader from '../../components/ScreenLoader';
import CoupleLoadError from '../../components/CoupleLoadError';
import FreezeStreakCard from '../../components/FreezeStreakCard';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import { GAMES, getTodayDailyQuestion } from '../../constants/gameData';
import { AuthContext } from '../../../App';
import { useCouple } from '../../hooks/useCouple';
import {
  getLevel,
  getProgressToNextLevel,
  formatPoints,
  getStreakCount,
  getNextUnlock,
  ACTIVITIES_REQUIRED,
} from '../../utils/points';

function daysTogether(startDate) {
  if (!startDate) return 0;
  const parts = startDate.split('/');
  if (parts.length !== 3) return 0;
  const start = new Date(parts[2], parts[0] - 1, parts[1]);
  const now = new Date();
  const diff = now - start;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function HomeScreen({ navigation }) {
  const { profile } = useContext(AuthContext);
  const { couple, loading, error } = useCouple();

  if (loading) {
    return (
      <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ScreenLoader message="Loading your love story..." />
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

  const streak = getStreakCount(couple);
  const points = couple?.points || 0;
  const activitiesToday = couple?.activitiesToday ?? 0;
  const level = getLevel(points);
  const progress = getProgressToNextLevel(points);
  const nextUnlock = getNextUnlock(couple);
  const dailyQuestion = getTodayDailyQuestion().question;
  const togetherDays = daysTogether(profile?.startDate);

  return (
    <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
              <Text style={styles.name} numberOfLines={1}>
                {profile?.name || 'Love'}
              </Text>
            </View>
            <StreakBadge count={streak} activitiesToday={activitiesToday} />
          </View>

          <LinearGradient colors={GRADIENTS.primary} style={[styles.heroCard, SHADOWS.strong]}>
            <Text style={styles.heroEmoji}>💕</Text>
            <Text style={styles.heroTitle}>
              {togetherDays > 0 ? `${togetherDays} days together` : 'Your love story begins'}
            </Text>
            <Text style={styles.heroSubtitle} numberOfLines={2}>
              with {profile?.partnerName || 'your partner'}
            </Text>
            <View style={styles.avatarsRow}>
              <AvatarCircle initial={profile?.name} size={52} />
              <Text style={styles.heartBetween}>♥</Text>
              <AvatarCircle initial={profile?.partnerName} size={52} />
            </View>
          </LinearGradient>

          <FreezeStreakCard couple={couple} coupleId={profile?.coupleId} />

          <View style={[styles.activityCard, SHADOWS.card]}>
            <Text style={styles.activityTitle}>Today's Activities</Text>
            <Text style={styles.activityDesc}>
              Complete {ACTIVITIES_REQUIRED} to keep your streak alive
            </Text>
            <View style={styles.activityDots}>
              {Array.from({ length: ACTIVITIES_REQUIRED }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i < activitiesToday && styles.dotFilled]}
                />
              ))}
            </View>
            <Text style={styles.activityCount}>
              {activitiesToday}/{ACTIVITIES_REQUIRED} done
            </Text>
          </View>

          <View style={[styles.levelCard, SHADOWS.card]}>
            <View style={styles.levelHeader}>
              <Text style={styles.levelTitle} numberOfLines={1}>
                Level {level.level} · {level.title}
              </Text>
              <Text style={styles.levelPoints}>{formatPoints(points)} pts</Text>
            </View>
            <ProgressBar progress={progress} height={6} />
            {nextUnlock && (
              <Text style={styles.nextUnlock}>
                {nextUnlock.emoji} Next unlock at {nextUnlock.points} pts — {nextUnlock.title}
              </Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Today's Connection</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('DailyQuestionAnswer')}
            activeOpacity={0.85}
            style={[styles.dailyCard, SHADOWS.card]}
          >
            <Text style={styles.dailyLabel}>Daily Question</Text>
            <Text style={styles.dailyQuestion}>{dailyQuestion}</Text>
            <Text style={styles.dailyCta}>Tap to answer →</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Quick Play</Text>
          {GAMES.slice(0, 2).map((game) => (
            <GameCard
              key={game.id}
              emoji={game.emoji}
              title={game.title}
              description={game.description}
              timesPlayed={game.timesPlayed}
              isNew={game.isNew}
              hasNotification={game.hasNotification}
              onPress={() => navigation.navigate(game.screens[0])}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 8,
    marginBottom: 16,
    gap: 10,
  },
  headerText: { flex: 1, minWidth: 0 },
  greeting: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted },
  name: { fontFamily: FONTS.display, fontSize: 26, color: COLORS.navy },
  heroCard: {
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroEmoji: { fontSize: 32, marginBottom: 6 },
  heroTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    marginBottom: 14,
    textAlign: 'center',
  },
  avatarsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heartBetween: { fontSize: 18, color: '#FFFFFF' },
  activityCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  activityDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  activityDots: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  dot: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotFilled: {
    backgroundColor: COLORS.pink,
  },
  activityCount: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.pink,
  },
  levelCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  levelTitle: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  levelPoints: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.pink },
  nextUnlock: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 10,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 17,
    color: COLORS.navy,
    marginBottom: 12,
  },
  dailyCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dailyLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.pink,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  dailyQuestion: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.textPrimary,
    lineHeight: 24,
    marginBottom: 10,
  },
  dailyCta: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.purple },
});
