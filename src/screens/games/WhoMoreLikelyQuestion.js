import React, { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AuthContext } from '../../context/AuthContext';
import AvatarCircle from '../../components/AvatarCircle';
import ProgressBar from '../../components/ProgressBar';
import PulsingPromptCard from '../../components/whoMoreLikely/PulsingPromptCard';
import WhoMoreLikelyLoader from '../../components/whoMoreLikely/WhoMoreLikelyLoader';
import AnimatedDots from '../../components/whoMoreLikely/AnimatedDots';
import { COLORS, GRADIENTS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import {
  getTodayWhoMoreLikelyQuestions,
  WHO_MORE_LIKELY_BATCH_SIZE,
} from '../../constants/gameData';
import { useCouple } from '../../hooks/useCouple';
import { saveGameSession, getCoupleMemberIds } from '../../utils/firebase';
import { notifyPartner, NOTIFICATION_TYPES } from '../../utils/notifications';
import { getDateKey } from '../../utils/points';
import BackToGamesButton from '../../components/BackToGamesButton';
import GradientButton from '../../components/GradientButton';
import { nudgePartner } from '../../utils/nudgePartner';
import {
  subscribeToWhoMoreLikely,
  submitWhoMoreLikelyAnswer,
  buildWhoMoreLikelyMemberList,
  hasUserCompletedAll,
  getUserAnswersMap,
  getPartnerAnswersMap,
  getUserAnsweredCount,
  canRevealWhoMoreLikely,
  getSessionQuestions,
  getQuestionCount,
  getMatchCountFromDoc,
  stripQuestionPrefix,
} from '../../utils/whoMoreLikely';

const PARTNER_GRADIENT = ['#C084FC', '#9B7EDE'];

function PulsingAvatar({ name, gradient }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      true
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <AvatarCircle initial={name} size={36} gradient={gradient} />
    </Animated.View>
  );
}

function ChoiceButton({
  label,
  gradient,
  selected,
  dimmed,
  disabled,
  onPress,
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (selected) {
      scale.value = withSpring(1.04, { damping: 12, stiffness: 180 });
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [selected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: dimmed ? 0.6 : 1,
  }));

  const content = (
    <View style={styles.choiceInner}>
      <AvatarCircle initial={label} size={36} gradient={gradient} />
      <Text
        style={[styles.choiceName, selected && styles.choiceNameSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  return (
    <Animated.View style={[styles.choiceWrap, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={disabled}
        style={styles.choiceTouchable}
      >
        {selected ? (
          <LinearGradient
            colors={GRADIENTS.primary}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.choiceSelected}
          >
            {content}
          </LinearGradient>
        ) : (
          <View style={styles.choiceDefault}>{content}</View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function WhoMoreLikelyQuestion({ navigation }) {
  const { profile, isGuest } = useContext(AuthContext);
  const { couple, loading: coupleLoading } = useCouple();

  const questions = useMemo(() => getTodayWhoMoreLikelyQuestions(), []);
  const questionCount = questions.length || WHO_MORE_LIKELY_BATCH_SIZE;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [docReady, setDocReady] = useState(false);

  const navigatedRef = useRef(false);
  const isMounted = useRef(true);
  const membersRef = useRef([]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      navigatedRef.current = false;
    }, [])
  );

  useEffect(() => {
    if (couple?.members?.length) {
      membersRef.current = couple.members;
    }
  }, [couple?.members]);

  useEffect(() => {
    if (!profile?.coupleId) {
      setDocReady(true);
      return undefined;
    }

    let active = true;

    (async () => {
      try {
        const ids = await getCoupleMemberIds(profile.coupleId);
        if (active && ids.length) {
          membersRef.current = ids;
        }
      } catch (error) {
        console.warn('getCoupleMemberIds failed:', error.message);
      }
    })();

    return () => {
      active = false;
    };
  }, [profile?.coupleId]);

  const resolveMemberList = useCallback(() => {
    const members =
      couple?.members?.length >= 2
        ? couple.members
        : membersRef.current.length >= 2
          ? membersRef.current
          : couple?.members?.length
            ? couple.members
            : membersRef.current;

    return buildWhoMoreLikelyMemberList(members, profile?.uid, { isGuest });
  }, [couple?.members, profile?.uid, isGuest]);

  const navigateToReveal = useCallback(
    (docData) => {
      if (navigatedRef.current || !profile?.uid || !docData) return;

      const memberList = resolveMemberList();
      if (!canRevealWhoMoreLikely(docData, profile.uid, memberList)) return;

      navigatedRef.current = true;

      const sessionQuestions = getSessionQuestions(docData, questions);

      try {
        navigation.navigate('WhoMoreLikelyReveal', {
          questions: sessionQuestions,
          dateKey: docData.dateKey || getDateKey(),
          userAnswers: getUserAnswersMap(docData, profile.uid, memberList),
          partnerAnswers: getPartnerAnswersMap(docData, profile.uid, memberList),
          matchCount: getMatchCountFromDoc(docData),
          questionCount: getQuestionCount(docData),
        });
      } catch (error) {
        navigatedRef.current = false;
        console.warn('Navigate to reveal failed:', error.message);
      }
    },
    [navigation, profile?.uid, resolveMemberList, questions]
  );

  useEffect(() => {
    if (!profile?.coupleId || !profile?.uid) {
      setDocReady(true);
      return undefined;
    }

    const dateKey = getDateKey();
    let active = true;

    const unsubscribe = subscribeToWhoMoreLikely(
      profile.coupleId,
      dateKey,
      (docData) => {
        if (!active || !isMounted.current) return;

        try {
          setDocReady(true);
          const memberList = resolveMemberList();

          if (docData) {
            const answeredCount = getUserAnsweredCount(docData, profile.uid, memberList);
            const completed = hasUserCompletedAll(docData, profile.uid, memberList);

            if (completed) {
              setWaiting(true);
              setCurrentIndex(questionCount);
            } else if (answeredCount > 0) {
              setCurrentIndex(Math.min(answeredCount, questionCount - 1));
            }

            if (canRevealWhoMoreLikely(docData, profile.uid, memberList)) {
              navigateToReveal(docData);
            }
          }
        } catch (callbackError) {
          console.warn('Who more likely snapshot handler failed:', callbackError.message);
        }
      },
      (error) => {
        console.warn('Who more likely listener failed:', error?.message);
        if (active && isMounted.current) setDocReady(true);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [
    profile?.coupleId,
    profile?.uid,
    navigateToReveal,
    resolveMemberList,
    questionCount,
  ]);

  const handleChoice = async (choice) => {
    if (waiting || submitting || selectedChoice) return;

    if (!profile?.coupleId || !profile?.uid) {
      Alert.alert('Connect first', 'Link with your partner to play together.');
      return;
    }

    setSelectedChoice(choice);
    setSubmitting(true);

    try {
      const memberList = resolveMemberList();
      const result = await submitWhoMoreLikelyAnswer(
        profile.coupleId,
        profile.uid,
        memberList,
        { questions, questionIndex: currentIndex, choice }
      );

      if (!isMounted.current) return;

      const isLastQuestion = currentIndex >= questionCount - 1;

      if (isLastQuestion) {
        try {
          await saveGameSession(profile.coupleId, 'who-more-likely', {
            questions,
            questionCount,
            userId: profile.uid,
            dateKey: getDateKey(),
            completed: true,
          });
        } catch (sessionError) {
          console.warn('saveGameSession failed:', sessionError.message);
        }

        try {
          await notifyPartner(profile, NOTIFICATION_TYPES.WHO_MORE_LIKELY, {
            question: `Finished all ${questionCount} questions`,
          });
        } catch (notifyError) {
          console.warn('Partner notification failed:', notifyError.message);
        }

        setWaiting(true);
        setCurrentIndex(questionCount);

        if (result?.bothCompleted) {
          navigateToReveal({
            ...result,
            dateKey: result.dateKey || getDateKey(),
          });
        }
      } else {
        setCurrentIndex((prev) => prev + 1);
        setSelectedChoice(null);
      }
    } catch (error) {
      if (isMounted.current) {
        setSelectedChoice(null);
        Alert.alert('Error', error?.message || 'Could not save your pick.');
      }
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  };

  const userName = profile?.name || 'You';
  const partnerName = profile?.partnerName || 'Partner';
  const memberList = resolveMemberList();
  const activeQuestion = questions[currentIndex] || questions[0];
  const promptText = stripQuestionPrefix(activeQuestion);
  const displayPrompt = promptText
    ? promptText.endsWith('?')
      ? promptText
      : `${promptText}?`
    : 'pick someone?';

  const progressValue = waiting
    ? questionCount
    : Math.min(currentIndex + 1, questionCount);

  const screenLoading = coupleLoading || (Boolean(profile?.coupleId) && !docReady);

  if (screenLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.orbPink} pointerEvents="none" />
        <View style={styles.orbPurple} pointerEvents="none" />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                try {
                  navigation.goBack();
                } catch (error) {
                  console.warn('goBack failed:', error.message);
                }
              }}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Who&apos;s More Likely
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          <WhoMoreLikelyLoader />
        </SafeAreaView>
      </View>
    );
  }

  if (waiting) {
    return (
      <View style={styles.screen}>
        <View style={styles.orbPink} pointerEvents="none" />
        <View style={styles.orbPurple} pointerEvents="none" />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                try {
                  navigation.goBack();
                } catch (error) {
                  console.warn('goBack failed:', error.message);
                }
              }}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Who&apos;s More Likely
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.waitingScreen}>
            <Text style={styles.doneEmoji}>✅</Text>
            <Text style={styles.doneTitle}>All {questionCount} answered!</Text>
            <Text style={styles.doneSubtitle}>
              Your picks are saved. Come back anytime — we&apos;ll reveal results once{' '}
              {partnerName} finishes their set too.
            </Text>

            <View style={styles.waitingBlock}>
              <PulsingAvatar name={partnerName} gradient={PARTNER_GRADIENT} />
              <View style={styles.waitingTextRow}>
                <Text style={styles.waitingText} numberOfLines={1}>
                  Waiting for {partnerName}
                </Text>
                <AnimatedDots />
              </View>
            </View>

            <View style={styles.waitingFooter}>
              <GradientButton
                title={nudging ? 'Sending...' : `Nudge ${partnerName}`}
                onPress={async () => {
                  setNudging(true);
                  try {
                    const result = await nudgePartner(profile, 'who-more-likely', {
                      dateKey: getDateKey(),
                    });
                    Alert.alert(
                      result.sent ? 'Nudge sent' : 'Try again later',
                      result.sent
                        ? `${partnerName} will get a reminder.`
                        : 'You can nudge once per hour.'
                    );
                  } finally {
                    setNudging(false);
                  }
                }}
                loading={nudging}
                disabled={nudging}
              />
              <BackToGamesButton navigation={navigation} />
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.orbPink} pointerEvents="none" />
      <View style={styles.orbPurple} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              try {
                navigation.goBack();
              } catch (error) {
                console.warn('goBack failed:', error.message);
              }
            }}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Who&apos;s More Likely
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.progressBlock}>
            <Text style={styles.progressLabel}>
              Question {currentIndex + 1} of {questionCount}
            </Text>
            <ProgressBar
              progress={progressValue / questionCount}
              style={styles.progressBar}
            />
          </View>

          <PulsingPromptCard
            label="Who's more likely to..."
            prompt={displayPrompt}
          />

          <View style={styles.choices}>
            <ChoiceButton
              label={userName}
              gradient={GRADIENTS.primary}
              selected={selectedChoice === 'self'}
              dimmed={Boolean(selectedChoice && selectedChoice !== 'self')}
              disabled={waiting || submitting || Boolean(selectedChoice)}
              onPress={() => handleChoice('self')}
            />
            <ChoiceButton
              label={partnerName}
              gradient={PARTNER_GRADIENT}
              selected={selectedChoice === 'partner'}
              dimmed={Boolean(selectedChoice && selectedChoice !== 'partner')}
              disabled={waiting || submitting || Boolean(selectedChoice)}
              onPress={() => handleChoice('partner')}
            />
          </View>

          {currentIndex > 0 && (
            <Text style={styles.resumeHint}>
              Pick saved as you go — close the app anytime and resume later.
            </Text>
          )}
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
    top: -60,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.pink,
    opacity: 0.14,
  },
  orbPurple: {
    position: 'absolute',
    bottom: 100,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.purple,
    opacity: 0.1,
  },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: {
    width: 36,
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  backArrow: {
    fontSize: 24,
    color: COLORS.navy,
    lineHeight: 28,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.displayItalic,
    fontSize: 18,
    color: COLORS.textPrimary,
    textAlign: 'center',
    minWidth: 0,
  },
  headerSpacer: {
    width: 36,
  },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 24,
  },
  progressBlock: {
    marginBottom: 16,
  },
  progressLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.purple,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  choices: {
    gap: 12,
  },
  choiceWrap: {
    width: '100%',
  },
  choiceTouchable: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  choiceDefault: {
    height: 60,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  choiceSelected: {
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  choiceInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  choiceName: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    minWidth: 0,
  },
  choiceNameSelected: {
    color: '#FFFFFF',
  },
  resumeHint: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  waitingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 40,
  },
  waitingFooter: {
    width: '100%',
    marginTop: 24,
    gap: 8,
  },
  doneEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  doneTitle: {
    fontFamily: FONTS.displayItalic,
    fontSize: 24,
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 10,
  },
  doneSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  waitingBlock: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  waitingTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
    maxWidth: '100%',
  },
  waitingText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.navy,
    flexShrink: 1,
  },
});
