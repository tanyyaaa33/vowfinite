import React, { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
import { getCoupleMemberIds } from '../../utils/firebase';
import { POINTS } from '../../utils/points';
import {
  subscribeToWhoMoreLikely,
  saveWhoMoreLikelyArgument,
  finalizeWhoMoreLikelyRound,
  userIdToDisplayName,
  getUserArgumentFromDoc,
  getPartnerArgumentFromDoc,
  stripQuestionPrefix,
  formatLastPlayed,
} from '../../utils/whoMoreLikely';

const PARTNER_GRADIENT = ['#C084FC', '#9B7EDE'];
const MAX_ARGUMENT_LENGTH = 280;

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

function VersusPanel({ name, pickedName, align, delay }) {
  const translateX = useSharedValue(align === 'left' ? -60 : 60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(
      delay,
      withSpring(0, { damping: 14, stiffness: 120 })
    );
    opacity.value = withDelay(delay, withTiming(1, { duration: 350 }));
  }, [delay, opacity, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.versusHalf,
        align === 'left' ? styles.versusLeft : styles.versusRight,
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={align === 'left' ? GRADIENTS.primary : PARTNER_GRADIENT}
        style={styles.versusGradient}
      >
        <AvatarCircle
          initial={name}
          size={38}
          gradient={align === 'left' ? GRADIENTS.primary : PARTNER_GRADIENT}
        />
        <Text style={styles.versusName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.versusPick} numberOfLines={2}>
          Picked {pickedName}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

function StatsCard({ stats }) {
  const totalPlayed = stats?.totalPlayed ?? 0;
  const agreementPercent = stats?.agreementPercent ?? 0;
  const lastPlayed = formatLastPlayed(stats?.lastPlayedAt);

  return (
    <View style={[styles.statsCard, SHADOWS.card]}>
      <Text style={styles.statsTitle}>Your stats</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalPlayed}</Text>
          <Text style={styles.statLabel}>Played</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{agreementPercent}%</Text>
          <Text style={styles.statLabel}>Agree</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValueSmall} numberOfLines={1}>
            {lastPlayed}
          </Text>
          <Text style={styles.statLabel}>Last</Text>
        </View>
      </View>
    </View>
  );
}

export default function WhoMoreLikelyReveal({ route, navigation }) {
  const { profile } = useContext(AuthContext);
  const { couple, loading: coupleLoading } = useCouple();
  const { showPoints } = usePointsToast();
  const { completeGame } = useGameCompletion();

  const {
    question,
    dateKey,
    userChoice,
    partnerChoice,
    agreed: initialAgreed,
  } = route.params || {};

  const [ready, setReady] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [stats, setStats] = useState(couple?.whoMoreLikelyStats || null);
  const [argument, setArgument] = useState('');
  const [sending, setSending] = useState(false);
  const [commentVisible, setCommentVisible] = useState(false);

  const pointsAwarded = useRef(false);
  const statsFinalized = useRef(false);
  const isMounted = useRef(true);
  const membersRef = useRef([]);

  const userName = profile?.name || 'You';
  const partnerName = profile?.partnerName || 'Partner';
  const safeQuestion = question?.trim() || '';
  const safeUserChoice = userChoice || null;
  const safePartnerChoice = partnerChoice || null;
  const isValid = Boolean(
    safeQuestion && safeUserChoice && safePartnerChoice && dateKey
  );

  const agreed =
    sessionData?.agreed ??
    initialAgreed ??
    (safeUserChoice === safePartnerChoice);

  const memberList = useMemo(() => {
    if (membersRef.current.length) return membersRef.current;
    if (couple?.members?.length) return couple.members;
    return [];
  }, [couple?.members, sessionData]);

  const userPickedName = userIdToDisplayName(
    safeUserChoice,
    profile?.uid,
    memberList,
    userName,
    partnerName
  );
  const partnerPickedName = userIdToDisplayName(
    safePartnerChoice,
    profile?.uid,
    memberList,
    userName,
    partnerName
  );

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
    if (agreed) return undefined;
    const timer = setTimeout(() => {
      if (isMounted.current) setCommentVisible(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [agreed]);

  const commentSlide = useSharedValue(120);
  const commentOpacity = useSharedValue(0);

  useEffect(() => {
    if (commentVisible && !agreed) {
      commentSlide.value = withSpring(0, { damping: 16, stiffness: 140 });
      commentOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [commentVisible, agreed, commentSlide, commentOpacity]);

  const commentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: commentSlide.value }],
    opacity: commentOpacity.value,
  }));

  useEffect(() => {
    if (!isValid || pointsAwarded.current) return undefined;

    let active = true;
    pointsAwarded.current = true;

    (async () => {
      try {
        if (
          profile?.coupleId &&
          dateKey &&
          !statsFinalized.current
        ) {
          statsFinalized.current = true;
          const snapshot = await finalizeWhoMoreLikelyRound(
            profile.coupleId,
            dateKey,
            {
              bothAnswered: true,
              player1Choice:
                sessionData?.player1Choice || safeUserChoice,
              player2Choice:
                sessionData?.player2Choice || safePartnerChoice,
              finalized: sessionData?.finalized,
            }
          );
          if (active && snapshot) setStats(snapshot);
        }

        await completeGame(POINTS.WHO_MORE_LIKELY, 'who-more-likely');
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
    safeUserChoice,
    safePartnerChoice,
    sessionData?.player1Choice,
    sessionData?.player2Choice,
    sessionData?.finalized,
  ]);

  const handleSendArgument = useCallback(async () => {
    const trimmed = argument.trim();
    if (!trimmed || sending) return;

    if (!profile?.coupleId || !profile?.uid || !dateKey) {
      Alert.alert('Error', 'Could not save your comment.');
      return;
    }

    setSending(true);
    try {
      let members = membersRef.current.length
        ? membersRef.current
        : couple?.members || [];
      if (!members.length) {
        try {
          members = await getCoupleMemberIds(profile.coupleId);
          if (members.length) membersRef.current = members;
        } catch (idsError) {
          console.warn('getCoupleMemberIds failed:', idsError.message);
        }
      }
      await saveWhoMoreLikelyArgument(
        profile.coupleId,
        dateKey,
        profile.uid,
        members,
        trimmed
      );
      if (isMounted.current) {
        setArgument('');
      }
    } catch (error) {
      if (isMounted.current) {
        Alert.alert('Error', error?.message || 'Could not send comment.');
      }
    } finally {
      if (isMounted.current) {
        setSending(false);
      }
    }
  }, [
    argument,
    sending,
    profile?.coupleId,
    profile?.uid,
    dateKey,
    couple?.members,
  ]);

  const userArgument = sessionData
    ? getUserArgumentFromDoc(sessionData, profile?.uid, memberList)
    : '';
  const partnerArgument = sessionData
    ? getPartnerArgumentFromDoc(sessionData, profile?.uid, memberList)
    : '';

  const agreementPercent = stats?.agreementPercent ?? 0;
  const promptDisplay = stripQuestionPrefix(safeQuestion);

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
      {agreed && <ConfettiBurst />}

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {agreed ? (
              <>
                <Text style={styles.celebrationTitle} numberOfLines={2}>
                  You&apos;re in sync ✨
                </Text>
                <Text style={styles.celebrationSubtitle} numberOfLines={2}>
                  Same pick, same wavelength — that&apos;s love language.
                </Text>

                <BouncingAvatars leftName={userName} rightName={partnerName} />

                <LinearGradient
                  colors={GRADIENTS.primary}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.compatPill}
                >
                  <Text style={styles.compatText}>+1 Compatibility ✓</Text>
                </LinearGradient>

                <Text style={styles.agreementLine} numberOfLines={2}>
                  You agree {agreementPercent}% of the time
                </Text>

                <View style={[styles.promptMini, SHADOWS.card]}>
                  <Text style={styles.promptMiniLabel}>Today&apos;s prompt</Text>
                  <Text style={styles.promptMiniText} numberOfLines={3}>
                    {promptDisplay || safeQuestion}
                  </Text>
                  <Text style={styles.matchLine} numberOfLines={2}>
                    You both picked {userPickedName} 💕
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.disagreeTitle} numberOfLines={1}>
                  Plot twist 👀
                </Text>
                <Text style={styles.disagreeSubtitle} numberOfLines={2}>
                  You didn&apos;t match — time to settle it.
                </Text>

                <View style={styles.versusRow}>
                  <VersusPanel
                    name={userName}
                    pickedName={userPickedName}
                    align="left"
                    delay={150}
                  />
                  <View style={styles.versusDivider}>
                    <Text style={styles.vsText}>VS</Text>
                  </View>
                  <VersusPanel
                    name={partnerName}
                    pickedName={partnerPickedName}
                    align="right"
                    delay={280}
                  />
                </View>

                <Text style={styles.discussPrompt} numberOfLines={2}>
                  Discuss — who is right?
                </Text>

                {(userArgument || partnerArgument) ? (
                  <View style={styles.argumentsBlock}>
                    {userArgument ? (
                      <View style={styles.argumentBubble}>
                        <Text style={styles.argumentAuthor}>{userName}</Text>
                        <Text style={styles.argumentText}>{userArgument}</Text>
                      </View>
                    ) : null}
                    {partnerArgument ? (
                      <View style={[styles.argumentBubble, styles.argumentBubblePartner]}>
                        <Text style={styles.argumentAuthor}>{partnerName}</Text>
                        <Text style={styles.argumentText}>{partnerArgument}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <Animated.View style={[styles.commentBox, commentAnimatedStyle]}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Make your case..."
                    placeholderTextColor={COLORS.placeholder}
                    value={argument}
                    onChangeText={(text) =>
                      setArgument(text.slice(0, MAX_ARGUMENT_LENGTH))
                    }
                    multiline
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendBtn,
                      (!argument.trim() || sending) && styles.sendBtnDisabled,
                    ]}
                    onPress={handleSendArgument}
                    disabled={!argument.trim() || sending}
                  >
                    <LinearGradient
                      colors={GRADIENTS.primary}
                      style={styles.sendGradient}
                    >
                      <Text style={styles.sendText}>
                        {sending ? 'Sending...' : 'Send'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </>
            )}

            <StatsCard stats={stats} />

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
        </KeyboardAvoidingView>
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
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
    paddingBottom: 24,
  },
  celebrationTitle: {
    fontFamily: FONTS.displayItalic,
    fontSize: 22,
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  celebrationSubtitle: {
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
  compatPill: {
    alignSelf: 'center',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginBottom: 10,
  },
  compatText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  agreementLine: {
    fontFamily: FONTS.displayItalic,
    fontSize: 16,
    color: COLORS.pink,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
    paddingHorizontal: 4,
  },
  promptMini: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  promptMiniLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: COLORS.pink,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptMiniText: {
    fontFamily: FONTS.displayItalic,
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
    marginBottom: 8,
  },
  matchLine: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.purple,
    textAlign: 'center',
  },
  disagreeTitle: {
    fontFamily: FONTS.displayItalic,
    fontSize: 20,
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 6,
  },
  disagreeSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 19,
    paddingHorizontal: 4,
  },
  versusRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 14,
    minHeight: 128,
  },
  versusHalf: {
    flex: 1,
    minWidth: 0,
  },
  versusLeft: {
    marginRight: 2,
  },
  versusRight: {
    marginLeft: 2,
  },
  versusGradient: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  versusName: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
    maxWidth: '100%',
  },
  versusPick: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    lineHeight: 16,
  },
  versusDivider: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  vsText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.pink,
  },
  discussPrompt: {
    fontFamily: FONTS.displayItalic,
    fontSize: 15,
    color: COLORS.pink,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
    paddingHorizontal: 4,
  },
  argumentsBlock: {
    gap: 10,
    marginBottom: 12,
  },
  argumentBubble: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'flex-start',
    maxWidth: '88%',
  },
  argumentBubblePartner: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFF0F6',
  },
  argumentAuthor: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.pink,
    marginBottom: 4,
  },
  argumentText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  commentBox: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  commentInput: {
    minHeight: 72,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 21,
    marginBottom: 10,
  },
  sendBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    alignSelf: 'flex-end',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendGradient: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 14,
  },
  sendText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  statsCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 14,
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
  button: {
    marginTop: 4,
  },
});
