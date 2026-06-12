import React, { useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { useGamesHub } from '../../hooks/useGamesHub';
import PointsBalancePill from '../../components/gamesHub/PointsBalancePill';
import StreakSectionCard from '../../components/gamesHub/StreakSectionCard';
import DailyQuestionFeaturedCard from '../../components/gamesHub/DailyQuestionFeaturedCard';
import GamesHubGridCard from '../../components/gamesHub/GamesHubGridCard';
import GamesHubSkeleton from '../../components/gamesHub/GamesHubSkeleton';
import CoupleLoadError from '../../components/CoupleLoadError';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import { getGameNavigationTarget } from '../../utils/gameNavigation';

export default function GamesHubScreen({ navigation }) {
  const { profile } = useContext(AuthContext);
  const {
    loading,
    error,
    streak,
    activitiesToday,
    totalPoints,
    todayQuestion,
    dailyStatus,
    games,
    hes10Rounds,
    dareDropHistory,
    partnerId,
    sessions,
  } = useGamesHub();

  const navigateToGame = useCallback(
    (game) => {
      if (!game) return;

      try {
        const target = getGameNavigationTarget(game.id, {
          sessions,
          hes10Rounds,
          dareDropHistory,
          userId: profile?.uid,
          partnerId,
          partnerName: profile?.partnerName,
        });

        if (target?.screen) {
          navigation.navigate(target.screen, target.params || {});
          return;
        }

        const screen = game.screens?.[0];
        if (!screen) return;
        navigation.navigate(screen);
      } catch (navError) {
        console.warn('GamesHub navigation failed:', navError.message);
      }
    },
    [navigation, sessions, hes10Rounds, dareDropHistory, profile?.uid, profile?.partnerName, partnerId]
  );

  const openDailyQuestion = useCallback(() => {
    try {
      navigation.navigate('DailyQuestionAnswer');
    } catch (navError) {
      console.warn('DailyQuestion navigation failed:', navError.message);
    }
  }, [navigation]);

  return (
    <View style={styles.screen}>
      <View style={styles.orbPink} pointerEvents="none" />
      <View style={styles.orbPurple} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {loading ? (
          <GamesHubSkeleton />
        ) : error ? (
          <CoupleLoadError message={error?.message || 'Could not load games.'} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
                Games
              </Text>
              <PointsBalancePill points={totalPoints} />
            </View>

            <StreakSectionCard
              streak={streak ?? 0}
              activitiesToday={activitiesToday ?? 0}
            />

            <DailyQuestionFeaturedCard
              question={todayQuestion || 'Loading today\'s question...'}
              statusLabel={dailyStatus?.label || 'Answer Now'}
              onPress={openDailyQuestion}
            />

            <Text style={styles.sectionLabel}>ALL GAMES</Text>

            <View style={styles.grid}>
              {(games || []).map((game) => (
                <GamesHubGridCard
                  key={game.id}
                  emoji={game.emoji || '🎮'}
                  title={game.title || 'Game'}
                  description={game.statusLabel || game.description || ''}
                  timesPlayed={game.timesPlayed ?? 0}
                  isNew={Boolean(game.isNew)}
                  partnerWaiting={Boolean(game.partnerWaiting)}
                  onPress={() => navigateToGame(game)}
                />
              ))}
            </View>

            {!profile?.coupleId && (
              <Text style={styles.hint}>
                Connect with your partner to sync game progress in real time.
              </Text>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
  },
  orbPink: {
    position: 'absolute',
    top: -70,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.pink,
    opacity: 0.14,
  },
  orbPurple: {
    position: 'absolute',
    bottom: 80,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.purple,
    opacity: 0.1,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 20,
    gap: 10,
  },
  title: {
    fontFamily: FONTS.displayItalic,
    fontSize: 26,
    color: COLORS.textPrimary,
    flex: 1,
    minWidth: 0,
  },
  sectionLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  hint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
});
