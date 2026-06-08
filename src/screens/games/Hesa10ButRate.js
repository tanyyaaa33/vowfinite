import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import GradientButton from '../../components/GradientButton';
import RatingSlider from '../../components/hes10But/RatingSlider';
import Hes10Loader from '../../components/hes10But/Hes10Loader';
import { COLORS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import { useCouple } from '../../hooks/useCouple';
import { saveGameSession } from '../../utils/firebase';
import {
  subscribeToHes10Round,
  subscribeToHes10History,
  submitHes10Rating,
  findPendingRoundForUser,
  canShowHes10Reveal,
} from '../../utils/hes10But';

export default function Hesa10ButRate({ route, navigation }) {
  const { profile } = useContext(AuthContext);
  const { couple, loading: coupleLoading } = useCouple();
  const { roundId: paramRoundId, prompt: legacyPrompt } = route.params || {};

  const [round, setRound] = useState(null);
  const [roundReady, setRoundReady] = useState(false);
  const [rating, setRating] = useState(null);
  const [sliderMoved, setSliderMoved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isMounted = useRef(true);
  const navigatedRef = useRef(false);
  const resolvedRoundId = round?.id || paramRoundId;

  const navigateToReveal = useCallback(
    (roundDoc) => {
      if (navigatedRef.current || !roundDoc?.id) return;
      navigatedRef.current = true;
      try {
        navigation.navigate('Hesa10ButReveal', {
          roundId: roundDoc.id,
          fullSentence: roundDoc.fullSentence,
          partnerRating: roundDoc.partnerRating,
        });
      } catch (error) {
        navigatedRef.current = false;
        console.warn('Navigate to reveal failed:', error.message);
      }
    },
    [navigation]
  );

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!profile?.coupleId) {
      setRoundReady(true);
      return undefined;
    }

    let active = true;

    if (paramRoundId) {
      const unsubscribe = subscribeToHes10Round(
        profile.coupleId,
        paramRoundId,
        (doc) => {
          if (!active || !isMounted.current) return;
          try {
            setRound(doc);
            setRoundReady(true);
            if (doc && canShowHes10Reveal(doc)) {
              navigateToReveal(doc);
            }
          } catch (error) {
            console.warn('Rate round handler failed:', error.message);
            setRoundReady(true);
          }
        },
        (error) => {
          console.warn('Rate round listener failed:', error?.message);
          if (active && isMounted.current) setRoundReady(true);
        }
      );

      return () => {
        active = false;
        unsubscribe();
      };
    }

    const unsubscribe = subscribeToHes10History(
      profile.coupleId,
      (rounds) => {
        if (!active || !isMounted.current) return;
        try {
          const pending = findPendingRoundForUser(rounds, profile.uid);
          if (pending) {
            setRound(pending);
          }
          setRoundReady(true);
        } catch (error) {
          console.warn('Rate history handler failed:', error.message);
          setRoundReady(true);
        }
      },
      (error) => {
        console.warn('Rate history listener failed:', error?.message);
        if (active && isMounted.current) setRoundReady(true);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [profile?.coupleId, profile?.uid, paramRoundId, navigateToReveal]);

  useEffect(() => {
    if (!roundReady) return undefined;
    if (!round?.fullSentence && !legacyPrompt) {
      try {
        navigation.goBack();
      } catch (error) {
        console.warn('Rate goBack failed:', error.message);
      }
    }
    return undefined;
  }, [roundReady, round, legacyPrompt, navigation]);

  const handleRatingChange = useCallback((value) => {
    setRating(value);
    setSliderMoved(true);
  }, []);

  const handleSubmit = async () => {
    if (!sliderMoved || rating == null || submitting) return;

    if (!profile?.coupleId || !profile?.uid) {
      Alert.alert('Error', 'Connect with your partner first.');
      return;
    }

    const roundId = resolvedRoundId;
    if (!roundId) {
      Alert.alert('Error', 'This round is no longer available.');
      return;
    }

    setSubmitting(true);
    try {
      await submitHes10Rating(profile.coupleId, roundId, profile.uid, rating);

      try {
        await saveGameSession(profile.coupleId, 'hes-a-10-but', {
          stage: 'rate',
          roundId,
          rating,
          userId: profile.uid,
          fullSentence: round?.fullSentence,
        });
      } catch (sessionError) {
        console.warn('saveGameSession failed:', sessionError.message);
      }

      if (!isMounted.current) return;

      try {
        navigation.navigate('Hesa10ButReveal', {
          roundId,
          fullSentence: round?.fullSentence || legacyPrompt,
          partnerRating: rating,
        });
      } catch (navError) {
        console.warn('Navigate to reveal failed:', navError.message);
      }
    } catch (error) {
      if (isMounted.current) {
        Alert.alert('Error', error?.message || 'Could not save your rating.');
      }
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  };

  const fullSentence = round?.fullSentence || legacyPrompt || '';
  const screenLoading = coupleLoading || !roundReady;

  if (screenLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.orbPink} pointerEvents="none" />
        <View style={styles.orbPurple} pointerEvents="none" />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <View style={styles.backBtn} />
            <Text style={styles.headerTitle} numberOfLines={1}>
              Rate the scenario
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          <Hes10Loader />
        </SafeAreaView>
      </View>
    );
  }

  if (!fullSentence) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <Hes10Loader />
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
            Rate the scenario
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.promptCard, SHADOWS.card]}>
            <Text style={styles.promptText} numberOfLines={5}>
              {fullSentence}
            </Text>
          </View>

          <Text style={styles.question}>How much does this bother you?</Text>

          <RatingSlider
            value={rating ?? 1}
            onChange={handleRatingChange}
            numberSize={44}
          />
        </ScrollView>

        <View style={styles.footer}>
          <GradientButton
            title={submitting ? 'Submitting...' : 'Submit Rating'}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!sliderMoved || rating == null || submitting}
          />
        </View>
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
    bottom: 100,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
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
    paddingBottom: 16,
  },
  promptCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
  },
  promptText: {
    fontFamily: FONTS.displayItalic,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
  },
  question: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 18,
  },
  footer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 12,
    paddingTop: 8,
  },
});
