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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { AuthContext } from '../../context/AuthContext';
import GradientButton from '../../components/GradientButton';
import StarField from '../../components/dareDrop/StarField';
import SkipConfirmSheet from '../../components/dareDrop/SkipConfirmSheet';
import DareDropLoader from '../../components/dareDrop/DareDropLoader';
import { COLORS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING, CONTENT_MAX_WIDTH } from '../../constants/layout';
import {
  getDareByIndex,
  getTodayDareIndex,
} from '../../constants/gameData';
import { useCouple } from '../../hooks/useCouple';
import { saveGameSession } from '../../utils/firebase';
import { deductPoints, POINTS, formatPoints } from '../../utils/points';
import {
  subscribeToDareDropHistory,
  createDareDropOffer,
  acceptDareDrop,
  skipDareDrop,
  findAcceptedDare,
  getCategoryColor,
} from '../../utils/dareDrop';

function DareCard({ dare, enteringKey }) {
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = -120;
    opacity.value = 0;
    translateY.value = withSpring(0, { damping: 14, stiffness: 120 });
    opacity.value = withSpring(1, { damping: 14, stiffness: 120 });
  }, [enteringKey, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const categoryColor =
    dare?.categoryColor || getCategoryColor(dare?.category);

  return (
    <Animated.View style={[styles.dareCardWrap, animatedStyle]}>
      <View style={[styles.dareCard, SHADOWS.strong]}>
        <View style={[styles.categoryPill, { backgroundColor: `${categoryColor}22` }]}>
          <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {dare?.category || 'Today'}
          </Text>
        </View>

        <Text style={styles.dareText} numberOfLines={6}>
          {dare?.text || 'Do something kind for your partner today'}
        </Text>

        <View style={styles.timePill}>
          <Text style={styles.timeText}>⏱ {dare?.timeEstimate || '10 min'}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function DareDropDare({ navigation }) {
  const { profile } = useContext(AuthContext);
  const { couple, loading: coupleLoading } = useCouple();

  const [skipOffset, setSkipOffset] = useState(0);
  const [dareDropId, setDareDropId] = useState(null);
  const [ready, setReady] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [offerReady, setOfferReady] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [skipSheetVisible, setSkipSheetVisible] = useState(false);

  const isMounted = useRef(true);
  const navigatedRef = useRef(false);
  const offerCreatedRef = useRef(false);

  const dare = useMemo(() => {
    const index = getTodayDareIndex() + skipOffset;
    return getDareByIndex(index);
  }, [skipOffset]);

  const pointsBalance = couple?.points ?? couple?.totalPoints ?? 0;

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
    if (!profile?.coupleId) {
      setOfferReady(true);
    }
  }, [profile?.coupleId]);

  const goToComplete = useCallback(
    (record) => {
      if (navigatedRef.current || !record) return;
      navigatedRef.current = true;
      try {
        navigation.navigate('DareDropComplete', {
          dareDropId: record.id || dareDropId,
          dare: {
            text: record.text || dare.text,
            category: record.category || dare.category,
            timeEstimate: record.timeEstimate || dare.timeEstimate,
            categoryColor: record.categoryColor || getCategoryColor(dare.category),
          },
        });
      } catch (error) {
        navigatedRef.current = false;
        console.warn('Navigate to complete failed:', error.message);
      }
    },
    [navigation, dareDropId, dare]
  );

  useEffect(() => {
    if (!profile?.coupleId || !profile?.uid) {
      setHistoryReady(true);
      return undefined;
    }

    let active = true;

    const unsubscribe = subscribeToDareDropHistory(
      profile.coupleId,
      (items) => {
        if (!active || !isMounted.current) return;
        try {
          const accepted = findAcceptedDare(items, profile.uid);
          if (accepted) {
            goToComplete(accepted);
          }
          setHistoryReady(true);
        } catch (error) {
          console.warn('Dare history handler failed:', error.message);
          setHistoryReady(true);
        }
      },
      (error) => {
        console.warn('Dare history listener failed:', error?.message);
        if (active && isMounted.current) setHistoryReady(true);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [profile?.coupleId, profile?.uid, goToComplete]);

  useEffect(() => {
    if (!profile?.coupleId || !profile?.uid || !historyReady) {
      return undefined;
    }

    if (dareDropId) {
      setOfferReady(true);
      return undefined;
    }

    let active = true;
    offerCreatedRef.current = false;
    setOfferReady(false);

    (async () => {
      try {
        if (offerCreatedRef.current) return;
        offerCreatedRef.current = true;
        const { dareDropId: newId } = await createDareDropOffer(
          profile.coupleId,
          profile.uid,
          { ...dare, skipCount: skipOffset }
        );
        if (active && isMounted.current) {
          setDareDropId(newId);
          setOfferReady(true);
        }
      } catch (error) {
        console.warn('createDareDropOffer failed:', error.message);
        if (active && isMounted.current) {
          offerCreatedRef.current = false;
          setOfferReady(true);
          Alert.alert(
            'Could not load dare',
            'Please check your connection and try again.',
            [{ text: 'OK' }]
          );
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [profile?.coupleId, profile?.uid, historyReady, dare, skipOffset, dareDropId]);

  const handleAccept = async () => {
    if (accepting || !dareDropId) return;

    if (!profile?.coupleId || !profile?.uid) {
      Alert.alert('Connect first', 'Link with your partner to play together.');
      return;
    }

    setAccepting(true);
    try {
      await acceptDareDrop(profile.coupleId, dareDropId, profile.uid);

      try {
        await saveGameSession(profile.coupleId, 'dare-drop', {
          stage: 'accepted',
          dareDropId,
          dareId: dare.id,
          userId: profile.uid,
          text: dare.text,
        });
      } catch (sessionError) {
        console.warn('saveGameSession failed:', sessionError.message);
      }

      if (!isMounted.current) return;
      goToComplete({
        id: dareDropId,
        text: dare.text,
        category: dare.category,
        timeEstimate: dare.timeEstimate,
        categoryColor: getCategoryColor(dare.category),
      });
    } catch (error) {
      if (isMounted.current) {
        Alert.alert('Error', error?.message || 'Could not accept this dare.');
      }
    } finally {
      if (isMounted.current) {
        setAccepting(false);
      }
    }
  };

  const handleSkipConfirm = async () => {
    if (skipping || !dareDropId) return;

    setSkipSheetVisible(false);
    setSkipping(true);

    try {
      if (profile?.coupleId) {
        try {
          await skipDareDrop(profile.coupleId, dareDropId);
        } catch (skipError) {
          console.warn('skipDareDrop failed:', skipError.message);
        }

        try {
          await deductPoints(profile.coupleId, POINTS.DARE_SKIP_PENALTY, 'dare-drop-skip');
        } catch (pointsError) {
          console.warn('deductPoints failed:', pointsError.message);
        }
      }

      if (!isMounted.current) return;

      offerCreatedRef.current = false;
      setDareDropId(null);
      setSkipOffset((prev) => prev + 1);
    } catch (error) {
      if (isMounted.current) {
        Alert.alert('Error', error?.message || 'Could not skip dare.');
      }
    } finally {
      if (isMounted.current) {
        setSkipping(false);
      }
    }
  };

  const screenLoading =
    !ready ||
    coupleLoading ||
    (Boolean(profile?.coupleId) && !historyReady) ||
    (Boolean(profile?.coupleId) && historyReady && !offerReady);

  if (screenLoading) {
    return (
      <View style={styles.screen}>
        <StarField />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <View style={styles.backBtn} />
            <Text style={styles.headerTitle} numberOfLines={1}>
              Dare Drop 🎯
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          <DareDropLoader dark />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StarField />

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
            Dare Drop 🎯
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pointsCard}>
            <Text style={styles.pointsLabel}>Your points</Text>
            <Text style={styles.pointsValue}>{formatPoints(pointsBalance)}</Text>
            <Text style={styles.pointsHint}>
              Skip costs {POINTS.DARE_SKIP_PENALTY} pts
            </Text>
          </View>

          <DareCard dare={dare} enteringKey={`${dare.id}-${skipOffset}`} />

          <GradientButton
            title={accepting ? 'Saving...' : "I'll Do This 💪"}
            onPress={handleAccept}
            loading={accepting}
            disabled={accepting || skipping || !dareDropId}
            style={styles.acceptBtn}
          />

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => setSkipSheetVisible(true)}
            disabled={accepting || skipping || !dareDropId}
            activeOpacity={0.85}
          >
            <Text style={styles.skipText}>
              Skip (−{POINTS.DARE_SKIP_PENALTY} pts)
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <SkipConfirmSheet
        visible={skipSheetVisible}
        onCancel={() => {
          if (!skipping) setSkipSheetVisible(false);
        }}
        onConfirm={handleSkipConfirm}
        pointsBalance={pointsBalance}
        confirming={skipping}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.navy,
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
    color: '#FFFFFF',
    lineHeight: 28,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.displayItalic,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    minWidth: 0,
  },
  headerSpacer: {
    width: 36,
  },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 24,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  pointsCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  pointsLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  pointsValue: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: '#FFFFFF',
    marginTop: 2,
  },
  pointsHint: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.pink,
    marginTop: 4,
  },
  dareCardWrap: {
    marginBottom: 20,
  },
  dareCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 20,
    minHeight: 188,
    shadowColor: COLORS.pink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 14,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 16,
    gap: 6,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  dareText: {
    fontFamily: FONTS.medium,
    fontSize: 17,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 27,
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  timePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F0F3',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timeText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  acceptBtn: {
    marginBottom: 12,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  skipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: 'rgba(255,255,255,0.82)',
  },
});
