import React, { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AuthContext } from '../../context/AuthContext';
import GradientButton from '../../components/GradientButton';
import AvatarCircle from '../../components/AvatarCircle';
import ShimmerOverlay from '../../components/dailyQuestion/ShimmerOverlay';
import DailyQuestionLoader from '../../components/dailyQuestion/DailyQuestionLoader';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import { getDailyQuestionForDate, parseDateKey } from '../../constants/gameData';
import BackToGamesButton from '../../components/BackToGamesButton';
import { nudgePartner } from '../../utils/nudgePartner';
import { useCouple } from '../../hooks/useCouple';
import { saveGameSession, getCoupleMemberIds } from '../../utils/firebase';
import { notifyPartner, NOTIFICATION_TYPES } from '../../utils/notifications';
import { getDateKey, getStreakCount, getDisplayActivitiesToday, ACTIVITIES_REQUIRED } from '../../utils/points';
import {
  subscribeToDailyQuestion,
  submitDailyQuestionAnswer,
  updateDailyQuestionAnswer,
  hasUserAnswered,
  hasPartnerAnswered,
  getUserAnswerFromDoc,
  getPartnerAnswerFromDoc,
  canRevealAnswers,
  MAX_DAILY_ANSWER_LENGTH,
} from '../../utils/dailyQuestion';

function MiniStreakBadge({ streak, activitiesToday }) {
  return (
    <View style={styles.miniStreak}>
      <Text style={styles.miniHeart}>💗</Text>
      <Text style={styles.miniCount}>{streak ?? 0}</Text>
      <Text style={styles.miniLabel}>
        {activitiesToday ?? 0}/{ACTIVITIES_REQUIRED}
      </Text>
    </View>
  );
}

function PulsingAvatar({ name }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 900 }),
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
      <AvatarCircle initial={name} size={56} />
    </Animated.View>
  );
}

export default function DailyQuestionAnswer({ navigation, route }) {
  const { profile } = useContext(AuthContext);
  const { couple, loading: coupleLoading } = useCouple();
  const activeDateKey = route?.params?.dateKey || getDateKey();
  const isCatchUp = activeDateKey !== getDateKey();
  const dailyMeta = useMemo(
    () => getDailyQuestionForDate(parseDateKey(activeDateKey)),
    [activeDateKey]
  );
  const { question, category } = dailyMeta;

  const [answer, setAnswer] = useState('');
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [partnerAnswered, setPartnerAnswered] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [docReady, setDocReady] = useState(false);
  const [members, setMembers] = useState([]);

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
      setMembers(couple.members);
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
          setMembers(ids);
        }
      } catch (error) {
        console.warn('getCoupleMemberIds failed:', error.message);
      }
    })();

    return () => {
      active = false;
    };
  }, [profile?.coupleId]);

  const getMemberList = useCallback(() => {
    if (membersRef.current.length) return membersRef.current;
    if (couple?.members?.length) return couple.members;
    if (profile?.uid) return [profile.uid];
    return [];
  }, [couple?.members, profile?.uid]);

  const navigateToReveal = useCallback(
    (docData) => {
      if (navigatedRef.current || !profile?.uid || !docData) return;

      const memberList = getMemberList();
      const userAnswer = getUserAnswerFromDoc(docData, profile.uid, memberList)?.trim();
      const partnerAnswer = getPartnerAnswerFromDoc(docData, profile.uid, memberList)?.trim();

      if (!canRevealAnswers(docData, profile.uid, memberList)) return;

      navigatedRef.current = true;

      try {
        navigation.navigate('DailyQuestionReveal', {
          question: docData.question || question,
          category: docData.category || category,
          answer: userAnswer,
          partnerAnswer,
          dateKey: docData.dateKey || activeDateKey,
        });
      } catch (error) {
        navigatedRef.current = false;
        console.warn('Navigate to reveal failed:', error.message);
      }
    },
    [navigation, profile?.uid, getMemberList, question, category, activeDateKey]
  );

  useEffect(() => {
    if (!profile?.coupleId || !profile?.uid) {
      setDocReady(true);
      return undefined;
    }

    let active = true;

    const unsubscribe = subscribeToDailyQuestion(
      profile.coupleId,
      activeDateKey,
      (docData) => {
        if (!active || !isMounted.current) return;

        setDocReady(true);
        const memberList = getMemberList();
        const partnerDone = docData
          ? hasPartnerAnswered(docData, profile.uid, memberList)
          : false;
        setPartnerAnswered(partnerDone);

        if (docData && hasUserAnswered(docData, profile.uid, memberList)) {
          setSubmitted(true);
          setWaiting(!partnerDone);
          setAnswer(getUserAnswerFromDoc(docData, profile.uid, memberList));
        }

        if (canRevealAnswers(docData, profile.uid, memberList)) {
          navigateToReveal(docData);
        }
      },
      (error) => {
        console.warn('Daily question listener failed:', error?.message);
        if (active && isMounted.current) setDocReady(true);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [profile?.coupleId, profile?.uid, activeDateKey, navigateToReveal, getMemberList]);

  const handleNudge = async () => {
    if (nudging) return;
    setNudging(true);
    try {
      const result = await nudgePartner(profile, 'daily-question', { dateKey: activeDateKey });
      if (result.sent) {
        Alert.alert('Nudge sent', `${profile?.partnerName || 'Your partner'} will get a reminder.`);
      } else {
        Alert.alert('Try again later', 'You can nudge once per hour.');
      }
    } catch (error) {
      Alert.alert('Could not nudge', error?.message || 'Please try again.');
    } finally {
      if (isMounted.current) setNudging(false);
    }
  };

  const handleSubmit = async () => {
    const trimmed = answer.trim();
    if (!trimmed || submitting) return;
    if (submitted && !editing) return;

    if (!profile?.coupleId || !profile?.uid) {
      Alert.alert('Connect first', 'Link with your partner to answer together.');
      return;
    }

    setSubmitting(true);
    try {
      const memberList = getMemberList();
      const result = editing
        ? await updateDailyQuestionAnswer(profile.coupleId, profile.uid, memberList, {
            answer: trimmed,
            dateKey: activeDateKey,
          })
        : await submitDailyQuestionAnswer(profile.coupleId, profile.uid, memberList, {
            question,
            category,
            answer: trimmed,
            dateKey: activeDateKey,
          });

      try {
        await saveGameSession(profile.coupleId, 'daily-question', {
          question,
          answer: trimmed,
          userId: profile.uid,
          dateKey: activeDateKey,
        });
      } catch (sessionError) {
        console.warn('saveGameSession failed:', sessionError.message);
      }

      if (!editing) {
        try {
          await notifyPartner(profile, NOTIFICATION_TYPES.PARTNER_ANSWERED, {
            question,
            dateKey: activeDateKey,
          });
        } catch (notifyError) {
          console.warn('Partner notification failed:', notifyError.message);
        }
      }

      if (!isMounted.current) return;

      setSubmitted(true);
      setEditing(false);
      setWaiting(!result?.bothAnswered);

      if (result?.bothAnswered) {
        navigateToReveal({
          ...result,
          question: result.question || question,
          category: result.category || category,
          dateKey: result.dateKey || activeDateKey,
        });
      }
    } catch (error) {
      if (isMounted.current) {
        Alert.alert('Error', error?.message || 'Could not save your answer.');
      }
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  };

  const streak = getStreakCount(couple);
  const activitiesToday = getDisplayActivitiesToday(couple);
  const canSubmit = Boolean(answer.trim()) && (!submitted || editing) && !submitting;
  const screenLoading = coupleLoading || (Boolean(profile?.coupleId) && !docReady);

  if (screenLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.orbPink} pointerEvents="none" />
        <View style={styles.orbPurple} pointerEvents="none" />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {isCatchUp ? 'Catch-up Question' : 'Daily Question'}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('DailyQuestionHistory')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.historyLink}>History</Text>
            </TouchableOpacity>
          </View>
          <DailyQuestionLoader />
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
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isCatchUp ? 'Catch-up Question' : 'Daily Question'}
          </Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => navigation.navigate('DailyQuestionHistory')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.historyLink}>History</Text>
            </TouchableOpacity>
            <MiniStreakBadge streak={streak} activitiesToday={activitiesToday} />
          </View>
        </View>

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
            <View style={styles.questionCardOuter}>
              <View style={styles.questionCard}>
                <ShimmerOverlay />
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryText}>{category || 'Deep'}</Text>
                </View>
                <Text style={styles.questionText}>{question}</Text>
              </View>
            </View>

            {waiting && !editing ? (
              <View style={styles.waitingBlock}>
                <PulsingAvatar name={profile?.partnerName} />
                <Text style={styles.waitingTitle}>Answer locked in 💕</Text>
                <Text style={styles.waitingSubtitle} numberOfLines={2}>
                  {profile?.partnerName || 'Your partner'} can answer anytime — no need to wait here.
                </Text>
                <Text style={styles.waitingHint}>
                  We&apos;ll notify you when it&apos;s time to reveal.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.inputLabel}>Your answer</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={[styles.input, focused && styles.inputFocused]}
                    placeholder="Share your thoughts..."
                    placeholderTextColor={COLORS.placeholder}
                    value={answer}
                    onChangeText={(text) =>
                      setAnswer(text.slice(0, MAX_DAILY_ANSWER_LENGTH))
                    }
                    multiline
                    textAlignVertical="top"
                    editable={!submitted}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                  />
                  <Text style={styles.charCount}>
                    {answer.length}/{MAX_DAILY_ANSWER_LENGTH}
                  </Text>
                </View>

                <View style={styles.frostCard}>
                  <View style={styles.frostRow}>
                    <AvatarCircle initial={profile?.partnerName} size={36} />
                    <View style={styles.frostTextWrap}>
                      <Text style={styles.lockIcon}>🔒</Text>
                      <Text style={styles.frostText}>
                        {profile?.partnerName || 'Your partner'}&apos;s answer is hidden until
                        you both answer
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {waiting ? (
              <>
                {!partnerAnswered && (
                  <GradientButton
                    title={editing ? 'Cancel edit' : 'Edit my answer'}
                    onPress={() => setEditing((v) => !v)}
                  />
                )}
                <GradientButton
                  title={nudging ? 'Sending...' : `Nudge ${profile?.partnerName || 'partner'}`}
                  onPress={handleNudge}
                  loading={nudging}
                  disabled={nudging || editing}
                />
                {editing ? (
                  <GradientButton
                    title={submitting ? 'Saving...' : 'Save changes'}
                    onPress={handleSubmit}
                    loading={submitting}
                    disabled={!canSubmit}
                  />
                ) : null}
                <BackToGamesButton navigation={navigation} />
              </>
            ) : submitted && !partnerAnswered ? (
              <>
                {editing ? (
                  <GradientButton
                    title={submitting ? 'Saving...' : 'Save changes'}
                    onPress={handleSubmit}
                    loading={submitting}
                    disabled={!canSubmit}
                  />
                ) : (
                  <GradientButton
                    title="Edit my answer"
                    onPress={() => setEditing(true)}
                  />
                )}
                <BackToGamesButton navigation={navigation} />
              </>
            ) : (
              <GradientButton
                title={submitting ? 'Submitting...' : 'Submit Answer'}
                onPress={handleSubmit}
                loading={submitting}
                disabled={!canSubmit}
              />
            )}
          </View>
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
    top: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.pink,
    opacity: 0.14,
  },
  orbPurple: {
    position: 'absolute',
    bottom: 120,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.purple,
    opacity: 0.1,
  },
  safe: { flex: 1 },
  flex: { flex: 1 },
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
  },
  headerSpacer: {
    width: 36,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyLink: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.purple,
  },
  miniStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 3,
    flexShrink: 0,
  },
  miniHeart: {
    fontSize: 12,
  },
  miniCount: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.pink,
  },
  miniLabel: {
    fontFamily: FONTS.regular,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 16,
  },
  questionCardOuter: {
    borderRadius: 24,
    marginBottom: 18,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 12,
  },
  questionCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    minHeight: 128,
    justifyContent: 'center',
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,107,157,0.22)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,157,0.45)',
  },
  categoryText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: COLORS.pink,
    letterSpacing: 0.4,
  },
  questionText: {
    fontFamily: FONTS.displayItalic,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
  },
  inputLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.pink,
    marginBottom: 8,
  },
  inputWrap: {
    marginBottom: 14,
  },
  input: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    paddingBottom: 30,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    minHeight: 120,
    lineHeight: 22,
  },
  inputFocused: {
    borderColor: COLORS.pink,
  },
  charCount: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  frostCard: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(240,216,232,0.9)',
  },
  frostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  frostTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  lockIcon: {
    fontSize: 11,
    marginBottom: 3,
    opacity: 0.7,
  },
  frostText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  waitingBlock: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 8,
  },
  waitingTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 17,
    color: COLORS.navy,
    marginTop: 14,
    textAlign: 'center',
  },
  waitingSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 19,
  },
  waitingHint: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 12,
    paddingTop: 8,
    gap: 12,
  },
});
