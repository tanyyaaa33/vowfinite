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
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AuthContext } from '../../../App';
import AvatarCircle from '../../components/AvatarCircle';
import PulsingPromptCard from '../../components/whoMoreLikely/PulsingPromptCard';
import WhoMoreLikelyLoader from '../../components/whoMoreLikely/WhoMoreLikelyLoader';
import AnimatedDots from '../../components/whoMoreLikely/AnimatedDots';
import { COLORS, GRADIENTS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import { getTodayWhoMoreLikelyQuestion } from '../../constants/gameData';
import { useCouple } from '../../hooks/useCouple';
import { saveGameSession, getCoupleMemberIds } from '../../utils/firebase';
import { notifyPartner, NOTIFICATION_TYPES } from '../../utils/notifications';
import { getDateKey } from '../../utils/points';
import {
  subscribeToWhoMoreLikely,
  submitWhoMoreLikelyChoice,
  hasUserAnswered,
  getUserChoiceFromDoc,
  getPartnerChoiceFromDoc,
  canRevealWhoMoreLikely,
  stripQuestionPrefix,
  userIdToDisplayName,
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
  const { profile } = useContext(AuthContext);
  const { couple, loading: coupleLoading } = useCouple();

  const question = useMemo(() => getTodayWhoMoreLikelyQuestion(), []);
  const promptText = useMemo(() => stripQuestionPrefix(question), [question]);

  const [selectedChoice, setSelectedChoice] = useState(null);
  const [waiting, setWaiting] = useState(false);
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
    if (membersRef.current.length) return membersRef.current;
    if (couple?.members?.length) return couple.members;
    if (profile?.uid) return [profile.uid];
    return [];
  }, [couple?.members, profile?.uid]);

  const navigateToReveal = useCallback(
    (docData) => {
      if (navigatedRef.current || !profile?.uid || !docData) return;

      const memberList = resolveMemberList();
      if (!canRevealWhoMoreLikely(docData, profile.uid, memberList)) return;

      const userChoice = getUserChoiceFromDoc(docData, profile.uid, memberList);
      const partnerChoice = getPartnerChoiceFromDoc(docData, profile.uid, memberList);

      if (!userChoice || !partnerChoice) return;

      navigatedRef.current = true;

      try {
        navigation.navigate('WhoMoreLikelyReveal', {
          question: docData.question || question,
          dateKey: docData.dateKey || getDateKey(),
          userChoice,
          partnerChoice,
          agreed: docData.player1Choice === docData.player2Choice,
        });
      } catch (error) {
        navigatedRef.current = false;
        console.warn('Navigate to reveal failed:', error.message);
      }
    },
    [navigation, profile?.uid, resolveMemberList, question]
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

          if (docData && hasUserAnswered(docData, profile.uid, memberList)) {
            setWaiting(true);
            const pickedId = getUserChoiceFromDoc(docData, profile.uid, memberList);
            setSelectedChoice(pickedId === profile.uid ? 'self' : 'partner');
          }

          if (canRevealWhoMoreLikely(docData, profile.uid, memberList)) {
            navigateToReveal(docData);
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
  }, [profile?.coupleId, profile?.uid, navigateToReveal, resolveMemberList]);

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
      const result = await submitWhoMoreLikelyChoice(
        profile.coupleId,
        profile.uid,
        memberList,
        { question, choice }
      );

      try {
        await saveGameSession(profile.coupleId, 'who-more-likely', {
          question,
          choice,
          userId: profile.uid,
          dateKey: getDateKey(),
        });
      } catch (sessionError) {
        console.warn('saveGameSession failed:', sessionError.message);
      }

      try {
        await notifyPartner(profile, NOTIFICATION_TYPES.WHO_MORE_LIKELY, { question });
      } catch (notifyError) {
        console.warn('Partner notification failed:', notifyError.message);
      }

      if (!isMounted.current) return;

      setWaiting(true);

      if (result?.bothAnswered) {
        navigateToReveal({
          ...result,
          question: result.question || question,
          dateKey: result.dateKey || getDateKey(),
        });
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
  const pickedDisplayName = userIdToDisplayName(
    selectedChoice === 'self'
      ? profile?.uid
      : memberList.find((id) => id !== profile?.uid),
    profile?.uid,
    memberList,
    userName,
    partnerName
  );

  const screenLoading = coupleLoading || (Boolean(profile?.coupleId) && !docReady);
  const displayPrompt = promptText
    ? promptText.endsWith('?')
      ? promptText
      : `${promptText}?`
    : 'pick someone?';

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

          {waiting && (
            <View style={styles.waitingBlock}>
              <PulsingAvatar name={partnerName} gradient={PARTNER_GRADIENT} />
              <View style={styles.waitingTextRow}>
                <Text style={styles.waitingText} numberOfLines={1}>
                  Waiting for {partnerName}
                </Text>
                <AnimatedDots />
              </View>
              <Text style={styles.waitingHint} numberOfLines={3}>
                You picked {pickedDisplayName}. Reveal unlocks when they choose.
              </Text>
            </View>
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
  waitingBlock: {
    alignItems: 'center',
    marginTop: 24,
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
  waitingHint: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
});
