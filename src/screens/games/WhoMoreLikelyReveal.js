import React, { useContext, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AuthContext } from '../../context/AuthContext';
import GradientButton from '../../components/GradientButton';
import AvatarCircle from '../../components/AvatarCircle';
import ConfettiBurst from '../../components/dailyQuestion/ConfettiBurst';
import WhoMoreLikelyLoader from '../../components/whoMoreLikely/WhoMoreLikelyLoader';
import { usePointsToast } from '../../components/PointsToast';
import { useGameCompletion } from '../../hooks/useGameCompletion';
import { useCouple } from '../../hooks/useCouple';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import { WHO_MORE_LIKELY_BATCH_SIZE } from '../../constants/gameData';
import { POINTS, getDateKey } from '../../utils/points';
import {
  subscribeToWhoMoreLikely,
  finalizeWhoMoreLikelyRound,
  userIdToDisplayName,
  stripQuestionPrefix,
  formatLastPlayed,
  getMatchCountFromDoc,
  getQuestionCount,
  getSessionQuestions,
  getUserAnswersMap,
  getPartnerAnswersMap,
  saveWhoMoreLikelyArgument,
  getUserArgumentFromDoc,
  getPartnerArgumentFromDoc,
} from '../../utils/whoMoreLikely';

const PARTNER_GRADIENT = ['#C084FC', '#9B7EDE'];

function BouncingAvatars({ leftName, rightName }) {
  const leftY = useSharedValue(0);
  const rightY = useSharedValue(0);

  useEffect(() => {
    leftY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 500 }),
        withTiming(0, { duration: 500 })
      ),
      -1,
      true
    );
    rightY.value = withDelay(
      250,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 500 }),
          withTiming(0, { duration: 500 })
        ),
        -1,
        true
      )
    );
  }, [leftY, rightY]);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: leftY.value }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rightY.value }],
  }));

  return (
    <View style={styles.bounceRow}>
      <Animated.View style={leftStyle}>
        <AvatarCircle initial={leftName} size={50} gradient={GRADIENTS.primary} />
      </Animated.View>
      <Text style={styles.bounceHeart}>💕</Text>
      <Animated.View style={rightStyle}>
        <AvatarCircle initial={rightName} size={50} gradient={PARTNER_GRADIENT} />
      </Animated.View>
    </View>
  );
}

function StatsCard({ stats, matchCount, questionCount }) {
  const totalPlayed = stats?.totalPlayed ?? 0;
  const agreementPercent = stats?.agreementPercent ?? 0;
  const lastPlayed = formatLastPlayed(stats?.lastPlayedAt);

  return (
    <View style={[styles.statsCard, SHADOWS.card]}>
      <Text style={styles.statsTitle}>Your stats</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{matchCount}/{questionCount}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{agreementPercent}%</Text>
          <Text style={styles.statLabel}>All time</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValueSmall} numberOfLines={1}>
            {lastPlayed}
          </Text>
          <Text style={styles.statLabel}>Last</Text>
        </View>
      </View>
      {totalPlayed > 0 ? (
        <Text style={styles.statsFootnote}>
          Played {totalPlayed} round{totalPlayed === 1 ? '' : 's'} together
        </Text>
      ) : null}
    </View>
  );
}

function ResultRow({ index, question, userPicked, partnerPicked, matched, delay }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 16, stiffness: 140 }));
  }, [delay, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.resultRow, SHADOWS.card, animatedStyle]}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultIndex}>#{index + 1}</Text>
        <Text style={styles.resultBadge}>{matched ? '✓ Match' : '✗ Different'}</Text>
      </View>
      <Text style={styles.resultQuestion} numberOfLines={3}>
        {stripQuestionPrefix(question)}
      </Text>
      <View style={styles.resultPicks}>
        <View style={styles.pickCol}>
          <Text style={styles.pickLabel}>You</Text>
          <Text style={styles.pickValue} numberOfLines={1}>{userPicked}</Text>
        </View>
        <View style={styles.pickCol}>
          <Text style={styles.pickLabel}>Partner</Text>
          <Text style={styles.pickValue} numberOfLines={1}>{partnerPicked}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function WhoMoreLikelyReveal({ route, navigation }) {
  const { profile } = useContext(AuthContext);
  const { couple, loading: coupleLoading } = useCouple();
  const { showPoints } = usePointsToast();
  const { completeGame } = useGameCompletion();

  const {
    questions: routeQuestions = [],
    dateKey,
    userAnswers: routeUserAnswers = {},
    partnerAnswers: routePartnerAnswers = {},
    matchCount: routeMatchCount,
    questionCount: routeQuestionCount,
  } = route.params || {};

  const [ready, setReady] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [stats, setStats] = useState(couple?.whoMoreLikelyStats || null);
  const [myArgument, setMyArgument] = useState('');
  const [savingArgument, setSavingArgument] = useState(false);

  const pointsAwarded = useRef(false);
  const statsFinalized = useRef(false);
  const isMounted = useRef(true);
  const membersRef = useRef([]);

  const userName = profile?.name || 'You';
  const partnerName = profile?.partnerName || 'Partner';

  const memberList = useMemo(() => {
    if (membersRef.current.length) return membersRef.current;
    if (couple?.members?.length) return couple.members;
    return [];
  }, [couple?.members, sessionData]);

  const questions = useMemo(() => {
    if (routeQuestions.length) return routeQuestions;
    return getSessionQuestions(sessionData, []);
  }, [routeQuestions, sessionData]);

  const questionCount = routeQuestionCount || getQuestionCount(sessionData) || questions.length || WHO_MORE_LIKELY_BATCH_SIZE;

  const resolvedUserAnswers = useMemo(() => {
    if (sessionData && profile?.uid && memberList.length) {
      return getUserAnswersMap(sessionData, profile.uid, memberList);
    }
    return routeUserAnswers;
  }, [sessionData, profile?.uid, memberList, routeUserAnswers]);

  const resolvedPartnerAnswers = useMemo(() => {
    if (sessionData && profile?.uid && memberList.length) {
      return getPartnerAnswersMap(sessionData, profile.uid, memberList);
    }
    return routePartnerAnswers;
  }, [sessionData, profile?.uid, memberList, routePartnerAnswers]);

  const matchCount =
    routeMatchCount ?? getMatchCountFromDoc(sessionData) ?? 0;

  const matchPercent = questionCount > 0 ? Math.round((matchCount / questionCount) * 100) : 0;
  const perfectMatch = matchCount === questionCount;
  const isValid = Boolean(questions.length && dateKey);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (couple?.members?.length) {
      membersRef.current = couple.members;
    }
  }, [couple?.members]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMounted.current) setReady(true);
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    if (!isValid) {
      try {
        navigation.goBack();
      } catch (error) {
        console.warn('Reveal goBack failed:', error.message);
      }
    }
    return undefined;
  }, [ready, isValid, navigation]);

  useEffect(() => {
    if (couple?.whoMoreLikelyStats) {
      setStats(couple.whoMoreLikelyStats);
    }
  }, [couple?.whoMoreLikelyStats]);

  useEffect(() => {
    if (!profile?.coupleId || !dateKey) {
      setSessionReady(true);
      return undefined;
    }

    let active = true;

    const unsubscribe = subscribeToWhoMoreLikely(
      profile.coupleId,
      dateKey,
      (docData) => {
        if (!active || !isMounted.current) return;
        try {
          setSessionReady(true);
          setSessionData(docData);
          if (docData && profile?.uid && membersRef.current.length) {
            setMyArgument(
              getUserArgumentFromDoc(docData, profile.uid, membersRef.current) || ''
            );
          }
          if (docData?.statsSnapshot) {
            setStats(docData.statsSnapshot);
          }
        } catch (callbackError) {
          console.warn('Reveal snapshot handler failed:', callbackError.message);
          if (isMounted.current) setSessionReady(true);
        }
      },
      (error) => {
        console.warn('Reveal listener failed:', error?.message);
        if (active && isMounted.current) setSessionReady(true);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [profile?.coupleId, dateKey]);

  useEffect(() => {
    if (!isValid || pointsAwarded.current) return undefined;

    let active = true;
    pointsAwarded.current = true;

    (async () => {
      try {
        if (profile?.coupleId && dateKey && !statsFinalized.current) {
          statsFinalized.current = true;
          const snapshot = await finalizeWhoMoreLikelyRound(profile.coupleId, dateKey, {
            bothCompleted: true,
            bothAnswered: true,
            player1Answers: sessionData?.player1Answers,
            player2Answers: sessionData?.player2Answers,
            matchCount,
            questionCount,
            finalized: sessionData?.finalized,
          });
          if (active && snapshot) setStats(snapshot);
        }

        await completeGame(
          POINTS.WHO_MORE_LIKELY,
          'who-more-likely',
          '✨',
          `who-more-likely_${getDateKey()}`
        );
        if (active && isMounted.current) {
          showPoints(POINTS.WHO_MORE_LIKELY, '✨');
        }
      } catch (error) {
        console.warn('Who more likely completion failed:', error.message);
        if (active && isMounted.current) {
          showPoints(POINTS.WHO_MORE_LIKELY, '✨');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [
    isValid,
    completeGame,
    showPoints,
    profile?.coupleId,
    dateKey,
    matchCount,
    questionCount,
    sessionData?.player1Answers,
    sessionData?.player2Answers,
    sessionData?.finalized,
  ]);

  const results = useMemo(() => {
    return questions.map((question, index) => {
      const key = String(index);
      const userPickId = resolvedUserAnswers[key];
      const partnerPickId = resolvedPartnerAnswers[key];
      const userPicked = userIdToDisplayName(
        userPickId,
        profile?.uid,
        memberList,
        userName,
        partnerName
      );
      const partnerPicked = userIdToDisplayName(
        partnerPickId,
        profile?.uid,
        memberList,
        userName,
        partnerName
      );
      return {
        question,
        userPicked,
        partnerPicked,
        matched: Boolean(userPickId && partnerPickId && userPickId === partnerPickId),
      };
    });
  }, [
    questions,
    resolvedUserAnswers,
    resolvedPartnerAnswers,
    profile?.uid,
    memberList,
    userName,
    partnerName,
  ]);

  const screenLoading =
    !ready || !isValid || coupleLoading || (Boolean(profile?.coupleId) && !sessionReady);

  if (screenLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.orbPink} pointerEvents="none" />
        <View style={styles.orbPurple} pointerEvents="none" />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <WhoMoreLikelyLoader />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.orbPink} pointerEvents="none" />
      <View style={styles.orbPurple} pointerEvents="none" />
      {perfectMatch && <ConfettiBurst />}

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title} numberOfLines={2}>
            {perfectMatch ? "You're in sync ✨" : 'Results are in 👀'}
          </Text>
          <Text style={styles.subtitle} numberOfLines={3}>
            {perfectMatch
              ? `You matched on all ${questionCount} questions — same wavelength.`
              : `You matched on ${matchCount} of ${questionCount} questions (${matchPercent}%).`}
          </Text>

          <BouncingAvatars leftName={userName} rightName={partnerName} />

          <LinearGradient
            colors={GRADIENTS.primary}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.scorePill}
          >
            <Text style={styles.scoreText}>
              {matchCount}/{questionCount} matched
            </Text>
          </LinearGradient>

          <Text style={styles.sectionTitle}>Question by question</Text>

          {results.map((result, index) => (
            <ResultRow
              key={`${index}-${result.question}`}
              index={index}
              question={result.question}
              userPicked={result.userPicked}
              partnerPicked={result.partnerPicked}
              matched={result.matched}
              delay={80 + index * 50}
            />
          ))}

          <StatsCard stats={stats} matchCount={matchCount} questionCount={questionCount} />

          {matchCount < questionCount && (
            <View style={[styles.argumentCard, SHADOWS.card]}>
              <Text style={styles.argumentTitle}>Disagree? Make your case</Text>
              <Text style={styles.argumentHint}>
                Add your side anytime — {partnerName} can reply when they open this.
              </Text>
              <TextInput
                style={styles.argumentInput}
                placeholder="Why did you pick differently?"
                placeholderTextColor={COLORS.placeholder}
                value={myArgument}
                onChangeText={setMyArgument}
                multiline
                maxLength={280}
              />
              {sessionData && profile?.uid && memberList.length ? (
                <TouchableOpacity
                  style={styles.argumentSave}
                  onPress={async () => {
                    if (!myArgument.trim() || savingArgument) return;
                    setSavingArgument(true);
                    try {
                      await saveWhoMoreLikelyArgument(
                        profile.coupleId,
                        dateKey || getDateKey(),
                        profile.uid,
                        memberList,
                        myArgument.trim()
                      );
                    } catch (error) {
                      console.warn('save argument failed:', error.message);
                    } finally {
                      setSavingArgument(false);
                    }
                  }}
                >
                  <Text style={styles.argumentSaveText}>
                    {savingArgument ? 'Saving...' : 'Save my take'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {sessionData && profile?.uid && memberList.length ? (
                <Text style={styles.partnerArgument} numberOfLines={4}>
                  {getPartnerArgumentFromDoc(sessionData, profile.uid, memberList) ||
                    `${partnerName} hasn't shared their take yet.`}
                </Text>
              ) : null}
            </View>
          )}

          <GradientButton
            title="Back to Games"
            onPress={() => {
              try {
                navigation.popToTop();
              } catch (error) {
                try {
                  navigation.goBack();
                } catch (goBackError) {
                  console.warn('Navigation failed:', goBackError.message);
                }
              }
            }}
            style={styles.button}
          />
        </ScrollView>
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
    top: -50,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.pink,
    opacity: 0.12,
  },
  orbPurple: {
    position: 'absolute',
    bottom: 80,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.purple,
    opacity: 0.1,
  },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    fontFamily: FONTS.displayItalic,
    fontSize: 22,
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  bounceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  bounceHeart: {
    fontSize: 24,
  },
  scorePill: {
    alignSelf: 'center',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 20,
  },
  scoreText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
    textAlign: 'center',
  },
  resultRow: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultIndex: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.pink,
  },
  resultBadge: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.purple,
  },
  resultQuestion: {
    fontFamily: FONTS.displayItalic,
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
    marginBottom: 10,
  },
  resultPicks: {
    flexDirection: 'row',
    gap: 10,
  },
  pickCol: {
    flex: 1,
    backgroundColor: '#FFF8FB',
    borderRadius: 10,
    padding: 10,
    minWidth: 0,
  },
  pickLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  pickValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.navy,
  },
  statsCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 14,
    marginTop: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.navy,
  },
  statValueSmall: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.navy,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  statsFootnote: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  button: {
    marginTop: 4,
  },
  argumentCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  argumentTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  argumentHint: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
    lineHeight: 17,
  },
  argumentInput: {
    backgroundColor: COLORS.screenBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    minHeight: 80,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  argumentSave: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  argumentSaveText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.pink,
  },
  partnerArgument: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
