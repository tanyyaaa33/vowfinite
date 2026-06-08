import React, { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../../App';
import GradientButton from '../../components/GradientButton';
import ReactionRow from '../../components/ReactionRow';
import DareDropLoader from '../../components/dareDrop/DareDropLoader';
import { useCouple } from '../../hooks/useCouple';
import { COLORS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING, CONTENT_MAX_WIDTH } from '../../constants/layout';
import {
  subscribeToDareDrop,
  savePartnerDareReaction,
  getCategoryColor,
  normalizeDareParam,
} from '../../utils/dareDrop';

const PARTNER_REACTIONS = ['❤️', '😂', '🥹', '🔥', '👏'];

export default function DareDropReaction({ route, navigation }) {
  const { profile } = useContext(AuthContext);
  const { loading: coupleLoading } = useCouple();

  const { dareDropId, dare: paramDare } = route.params || {};
  const normalizedParam = useMemo(() => normalizeDareParam(paramDare), [paramDare]);

  const [ready, setReady] = useState(false);
  const [recordReady, setRecordReady] = useState(false);
  const [record, setRecord] = useState(null);
  const [selectedReaction, setSelectedReaction] = useState(null);
  const [savingReaction, setSavingReaction] = useState(false);

  const isMounted = useRef(true);

  const dare = useMemo(() => {
    const category = record?.category || normalizedParam?.category || 'Today';
    return {
      text: record?.text || normalizedParam?.text || '',
      category,
      categoryColor:
        record?.categoryColor ||
        normalizedParam?.categoryColor ||
        getCategoryColor(category),
    };
  }, [record, normalizedParam]);

  const hasDareContent = Boolean(dare.text);
  const isValid = Boolean(dareDropId && hasDareContent);
  const recordLoaded = recordReady || !profile?.coupleId;
  const isCompleter = recordLoaded && record?.userId === profile?.uid;
  const canReact =
    recordLoaded &&
    Boolean(record?.userId && record.userId !== profile?.uid);
  const partnerName = profile?.partnerName || 'Your partner';
  const userName = profile?.name || 'You';
  const completerName = isCompleter ? userName : partnerName;

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
    if (!profile?.coupleId || !dareDropId) {
      setRecordReady(true);
      return undefined;
    }

    let active = true;

    const unsubscribe = subscribeToDareDrop(
      profile.coupleId,
      dareDropId,
      (doc) => {
        if (!active || !isMounted.current) return;
        try {
          setRecord(doc);
          if (doc?.partnerReaction) {
            setSelectedReaction(doc.partnerReaction);
          }
          setRecordReady(true);
        } catch (error) {
          console.warn('Reaction record handler failed:', error.message);
          setRecordReady(true);
        }
      },
      (error) => {
        console.warn('Reaction record listener failed:', error?.message);
        if (active && isMounted.current) setRecordReady(true);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [profile?.coupleId, dareDropId]);

  useEffect(() => {
    if (!ready || !recordReady) return undefined;
    if (!dareDropId || !hasDareContent) {
      try {
        navigation.goBack();
      } catch (error) {
        console.warn('Reaction goBack failed:', error.message);
      }
    }
    return undefined;
  }, [ready, recordReady, dareDropId, hasDareContent, navigation]);

  const saveReaction = useCallback(
    async (reaction) => {
      if (!profile?.coupleId || !profile?.uid || !dareDropId || savingReaction) return;
      if (isCompleter) return;

      setSavingReaction(true);
      try {
        await savePartnerDareReaction(
          profile.coupleId,
          dareDropId,
          profile.uid,
          reaction
        );
      } catch (error) {
        console.warn('savePartnerDareReaction failed:', error.message);
        if (isMounted.current) {
          Alert.alert('Error', error?.message || 'Could not save your reaction.');
        }
      } finally {
        if (isMounted.current) {
          setSavingReaction(false);
        }
      }
    },
    [profile?.coupleId, profile?.uid, dareDropId, isCompleter, savingReaction]
  );

  const handleReact = useCallback(
    (reaction) => {
      if (savingReaction || isCompleter) return;
      setSelectedReaction(reaction);
      saveReaction(reaction);
    },
    [isCompleter, saveReaction, savingReaction]
  );

  const waitingForRecord =
    Boolean(profile?.coupleId && dareDropId && !hasDareContent && !recordReady);

  const screenLoading =
    !ready || coupleLoading || waitingForRecord;

  if (screenLoading || !isValid) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <DareDropLoader />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.orbPink} pointerEvents="none" />
      <View style={styles.orbPurple} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.emoji}>💝</Text>
          <Text style={styles.title} numberOfLines={2}>
            {isCompleter
              ? 'Waiting for their reaction'
              : `${completerName} did something sweet`}
          </Text>
          <Text style={styles.subtitle} numberOfLines={3}>
            {isCompleter
              ? `${partnerName} can react when they see your dare.`
              : `React to let ${completerName} know how it felt.`}
          </Text>

          <View style={[styles.dareCard, SHADOWS.card]}>
            <View
              style={[
                styles.categoryPill,
                { backgroundColor: `${dare.categoryColor}22` },
              ]}
            >
              <Text style={[styles.categoryText, { color: dare.categoryColor }]}>
                {dare.category}
              </Text>
            </View>
            <Text style={styles.dareText} numberOfLines={6}>
              {dare.text}
            </Text>
          </View>

          {canReact ? (
            <>
              <Text style={styles.reactLabel}>How did that feel?</Text>
              <ReactionRow
                reactions={PARTNER_REACTIONS}
                selectedReaction={selectedReaction}
                onReact={handleReact}
              />
            </>
          ) : (
            <View style={styles.waitingCard}>
              <Text style={styles.waitingText} numberOfLines={3}>
                {record?.partnerReaction
                  ? `${partnerName} reacted ${record.partnerReaction}`
                  : `We'll notify you when ${partnerName} reacts.`}
              </Text>
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
    top: -45,
    right: -25,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.pink,
    opacity: 0.1,
  },
  orbPurple: {
    position: 'absolute',
    bottom: 70,
    left: -35,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.purple,
    opacity: 0.08,
  },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 12,
    paddingBottom: 24,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  emoji: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.displayItalic,
    fontSize: 21,
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  dareCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  categoryText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
  },
  dareText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.textPrimary,
    lineHeight: 25,
  },
  reactLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.pink,
    textAlign: 'center',
    marginBottom: 8,
  },
  waitingCard: {
    backgroundColor: '#FFF0F6',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  waitingText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 21,
  },
  button: {
    marginTop: 8,
  },
});
