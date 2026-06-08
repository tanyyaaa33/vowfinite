import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../../../App';
import GradientButton from '../../components/GradientButton';
import ReactionRow from '../../components/ReactionRow';
import AvatarCircle from '../../components/AvatarCircle';
import ConfettiBurst from '../../components/dailyQuestion/ConfettiBurst';
import DailyQuestionLoader from '../../components/dailyQuestion/DailyQuestionLoader';
import { usePointsToast } from '../../components/PointsToast';
import { useGameCompletion } from '../../hooks/useGameCompletion';
import { useCouple } from '../../hooks/useCouple';
import { COLORS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import { getCoupleMemberIds } from '../../utils/firebase';
import { POINTS } from '../../utils/points';
import {
  getConversationStarter,
  saveDailyQuestionReaction,
} from '../../utils/dailyQuestion';

function AnswerCard({ name, answer, align, delay, children }) {
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
    <Animated.View style={[styles.answerCardWrap, animatedStyle]}>
      <View style={[styles.answerCard, SHADOWS.card]}>
        <View style={styles.answerHeader}>
          <AvatarCircle initial={name} size={34} />
          <Text style={styles.answerName} numberOfLines={1}>
            {name || 'You'}
          </Text>
        </View>
        <Text style={styles.answerText}>{answer || '—'}</Text>
        {children}
      </View>
    </Animated.View>
  );
}

export default function DailyQuestionReveal({ route, navigation }) {
  const { profile } = useContext(AuthContext);
  const { couple } = useCouple();
  const { showPoints } = usePointsToast();
  const { completeGame } = useGameCompletion();

  const {
    question,
    category = 'Deep',
    answer,
    partnerAnswer,
    dateKey,
  } = route.params || {};

  const [userReaction, setUserReaction] = useState(null);
  const [partnerReaction, setPartnerReaction] = useState(null);
  const [ready, setReady] = useState(false);

  const pointsAwarded = useRef(false);
  const isMounted = useRef(true);

  const safeAnswer = answer?.trim() || '';
  const safePartnerAnswer = partnerAnswer?.trim() || '';
  const isValid = Boolean(question?.trim() && safeAnswer && safePartnerAnswer);
  const conversationStarter = getConversationStarter(category, question);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

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
    if (!isValid || pointsAwarded.current) return undefined;

    let active = true;
    pointsAwarded.current = true;

    (async () => {
      try {
        await completeGame(POINTS.DAILY_QUESTION, 'daily-question');
        if (active && isMounted.current) {
          showPoints(POINTS.DAILY_QUESTION, '✨');
        }
      } catch (error) {
        console.warn('Daily question points failed:', error.message);
        if (active && isMounted.current) {
          showPoints(POINTS.DAILY_QUESTION, '✨');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [isValid, completeGame, showPoints]);

  const saveReaction = useCallback(
    async (reaction) => {
      if (!profile?.coupleId || !profile?.uid || !dateKey) return;
      try {
        let memberList = couple?.members || [];
        if (!memberList.length) {
          memberList = await getCoupleMemberIds(profile.coupleId);
        }
        await saveDailyQuestionReaction(
          profile.coupleId,
          dateKey,
          profile.uid,
          memberList,
          reaction,
          'partner'
        );
      } catch (error) {
        console.warn('saveDailyQuestionReaction failed:', error.message);
      }
    },
    [profile?.coupleId, profile?.uid, dateKey, couple?.members]
  );

  const saveSelfReaction = useCallback(
    async (reaction) => {
      if (!profile?.coupleId || !profile?.uid || !dateKey) return;
      try {
        let memberList = couple?.members || [];
        if (!memberList.length) {
          memberList = await getCoupleMemberIds(profile.coupleId);
        }
        await saveDailyQuestionReaction(
          profile.coupleId,
          dateKey,
          profile.uid,
          memberList,
          reaction,
          'self'
        );
      } catch (error) {
        console.warn('saveDailyQuestionReaction failed:', error.message);
      }
    },
    [profile?.coupleId, profile?.uid, dateKey, couple?.members]
  );

  if (!ready || !isValid) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <DailyQuestionLoader />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.orbPink} pointerEvents="none" />
      <ConfettiBurst />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.celebration}>Both answers revealed ✨</Text>

          <View style={styles.questionCardOuter}>
            <View style={styles.questionCard}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText}>{category}</Text>
              </View>
              <Text style={styles.questionText} numberOfLines={4}>
                {question}
              </Text>
            </View>
          </View>

          <View style={styles.answersRow}>
            <AnswerCard
              name={profile?.name}
              answer={safeAnswer}
              align="left"
              delay={200}
            >
              <ReactionRow
                selectedReaction={userReaction}
                onReact={setUserReaction}
                onSaveReaction={saveSelfReaction}
              />
            </AnswerCard>

            <AnswerCard
              name={profile?.partnerName}
              answer={safePartnerAnswer}
              align="right"
              delay={350}
            >
              <ReactionRow
                selectedReaction={partnerReaction}
                onReact={setPartnerReaction}
                onSaveReaction={saveReaction}
              />
            </AnswerCard>
          </View>

          <LinearGradient
            colors={['#FFF0F6', '#FFFFFF']}
            style={[styles.starterCard, SHADOWS.card]}
          >
            <Text style={styles.starterEmoji}>💡</Text>
            <View style={styles.starterContent}>
              <Text style={styles.starterLabel}>Keep talking:</Text>
              <Text style={styles.starterText}>{conversationStarter}</Text>
            </View>
          </LinearGradient>

          <GradientButton
            title="Back to Home"
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
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.pink,
    opacity: 0.12,
  },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 24,
    paddingTop: 8,
  },
  celebration: {
    fontFamily: FONTS.displayItalic,
    fontSize: 22,
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  questionCardOuter: {
    borderRadius: 24,
    marginBottom: 18,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 12,
  },
  questionCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 24,
    padding: 18,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,107,157,0.22)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,107,157,0.45)',
  },
  categoryText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: COLORS.pink,
  },
  questionText: {
    fontFamily: FONTS.displayItalic,
    fontSize: 17,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
  },
  answersRow: {
    gap: 12,
    marginBottom: 16,
  },
  answerCardWrap: {
    width: '100%',
  },
  answerCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.pink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  answerName: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1,
    minWidth: 0,
  },
  answerText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 21,
    marginBottom: 6,
  },
  starterCard: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  starterEmoji: {
    fontSize: 22,
    marginTop: 2,
  },
  starterContent: {
    flex: 1,
    minWidth: 0,
  },
  starterLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.pink,
    marginBottom: 4,
  },
  starterText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  button: {
    marginTop: 4,
  },
});
