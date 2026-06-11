import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import GradientButton from '../../components/GradientButton';
import ShareStoryCard from '../../components/hes10But/ShareStoryCard';
import Hes10Loader from '../../components/hes10But/Hes10Loader';
import { COLORS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import { HES10_INSPIRATION_CHIPS } from '../../constants/gameData';
import { useCouple } from '../../hooks/useCouple';
import { saveGameSession, getCoupleMemberIds } from '../../utils/firebase';
import { notifyPartner, NOTIFICATION_TYPES } from '../../utils/notifications';
import {
  getHes10Starter,
  buildFullSentence,
  normalizeSentenceSuffix,
  createHes10Round,
  subscribeToHes10History,
  findAwaitingRoundForCreator,
  MIN_SENTENCE_LENGTH,
} from '../../utils/hes10But';

export default function Hesa10ButCreate({ navigation }) {
  const { profile } = useContext(AuthContext);
  const { couple, loading: coupleLoading } = useCouple();

  const starter = useMemo(() => getHes10Starter(profile), [profile]);
  const [suffix, setSuffix] = useState('');
  const [focused, setFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [activeRoundId, setActiveRoundId] = useState(null);
  const [historyReady, setHistoryReady] = useState(false);

  const isMounted = useRef(true);
  const membersRef = useRef([]);

  const fullSentence = useMemo(
    () => buildFullSentence(starter, suffix),
    [starter, suffix]
  );
  const canSend = normalizeSentenceSuffix(suffix).length >= MIN_SENTENCE_LENGTH;

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
    if (!profile?.coupleId) return undefined;

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

  const resolveMembers = useCallback(() => {
    if (membersRef.current.length) return membersRef.current;
    if (couple?.members?.length) return couple.members;
    if (profile?.uid) return [profile.uid];
    return [];
  }, [couple?.members, profile?.uid]);

  useEffect(() => {
    if (!profile?.coupleId || !profile?.uid) {
      setHistoryReady(true);
      return undefined;
    }

    let active = true;

    const unsubscribe = subscribeToHes10History(
      profile.coupleId,
      (rounds) => {
        if (!active || !isMounted.current) return;
        try {
          if (!waiting && !activeRoundId) {
            const awaiting = findAwaitingRoundForCreator(rounds, profile.uid);
            if (awaiting?.id) {
              setActiveRoundId(awaiting.id);
              setWaiting(true);
              if (awaiting.sentenceSuffix) {
                setSuffix(awaiting.sentenceSuffix);
              }
            }
          }
          setHistoryReady(true);
        } catch (error) {
          console.warn('Create history handler failed:', error.message);
          setHistoryReady(true);
        }
      },
      (error) => {
        console.warn('Create history listener failed:', error?.message);
        if (active && isMounted.current) setHistoryReady(true);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [profile?.coupleId, profile?.uid, waiting, activeRoundId]);

  const handleChipPress = (chip) => {
    setSuffix(chip);
  };

  const handleSend = async () => {
    if (!canSend || sending || waiting) return;

    if (!profile?.coupleId || !profile?.uid) {
      Alert.alert('Connect first', 'Link with your partner to play together.');
      return;
    }

    if (waiting) {
      Alert.alert(
        'Already sent',
        'Your partner can rate this one anytime. You\'ll get a notification when they do.'
      );
      return;
    }

    setSending(true);
    try {
      const members = resolveMembers();
      const normalized = normalizeSentenceSuffix(suffix);
      const sentence = buildFullSentence(starter, normalized);

      const { roundId } = await createHes10Round(
        profile.coupleId,
        profile.uid,
        members,
        {
          starter,
          sentenceSuffix: normalized,
          fullSentence: sentence,
        }
      );

      try {
        await saveGameSession(profile.coupleId, 'hes-a-10-but', {
          stage: 'create',
          fullSentence: sentence,
          roundId,
          userId: profile.uid,
        });
      } catch (sessionError) {
        console.warn('saveGameSession failed:', sessionError.message);
      }

      try {
        await notifyPartner(profile, NOTIFICATION_TYPES.HESA10BUT_SENT, {
          prompt: sentence,
          roundId,
        });
      } catch (notifyError) {
        console.warn('Partner notification failed:', notifyError.message);
      }

      if (!isMounted.current) return;

      setActiveRoundId(roundId);
      setWaiting(true);
    } catch (error) {
      if (isMounted.current) {
        Alert.alert('Error', error?.message || 'Could not send your sentence.');
      }
    } finally {
      if (isMounted.current) {
        setSending(false);
      }
    }
  };

  const screenLoading = coupleLoading || (Boolean(profile?.coupleId) && !historyReady);

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
              He&apos;s a 10 But 💅
            </Text>
            <View style={styles.headerSpacer} />
          </View>
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
            He&apos;s a 10 But 💅
          </Text>
          <View style={styles.headerSpacer} />
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
            <View style={[styles.starterCard, SHADOWS.strong]}>
              <Text style={styles.starterText}>{starter}...</Text>
              <TextInput
                style={[styles.inlineInput, focused && styles.inlineInputFocused]}
                placeholder="finish the sentence..."
                placeholderTextColor={COLORS.pink}
                value={suffix}
                onChangeText={setSuffix}
                editable={!waiting && !sending}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                multiline={false}
                returnKeyType="done"
              />
            </View>

            {!waiting && (
              <>
                <Text style={styles.chipsLabel}>Need inspiration?</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                >
                  {HES10_INSPIRATION_CHIPS.map((chip) => (
                    <TouchableOpacity
                      key={chip}
                      style={styles.chip}
                      onPress={() => handleChipPress(chip)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.chipText} numberOfLines={2}>
                        {chip}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.previewLabel}>Share preview</Text>
            <ShareStoryCard
              fullSentence={fullSentence}
              creatorName={profile?.name || 'You'}
              partnerName={profile?.partnerName || 'Partner'}
              compact
            />

            {waiting && (
              <View style={styles.waitingBlock}>
                <Text style={styles.waitingTitle}>Sent to {profile?.partnerName || 'your partner'} 💅</Text>
                <Text style={styles.waitingHint} numberOfLines={3}>
                  They can rate it anytime — no need to be online together. We&apos;ll notify you when the score is in.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {waiting ? (
              <GradientButton
                title="Back to Games"
                onPress={() => {
                  try {
                    navigation.navigate('Games');
                  } catch (error) {
                    navigation.goBack();
                  }
                }}
              />
            ) : (
              <GradientButton
                title={sending ? 'Sending...' : 'Send to Partner'}
                onPress={handleSend}
                loading={sending}
                disabled={!canSend || sending}
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
    top: -55,
    left: -45,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.pink,
    opacity: 0.14,
  },
  orbPurple: {
    position: 'absolute',
    bottom: 90,
    right: -35,
    width: 200,
    height: 200,
    borderRadius: 100,
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
    minWidth: 0,
  },
  headerSpacer: {
    width: 36,
  },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 16,
  },
  starterCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.pink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 10,
  },
  starterText: {
    fontFamily: FONTS.displayItalic,
    fontSize: 20,
    color: COLORS.textPrimary,
    lineHeight: 28,
    marginBottom: 10,
  },
  inlineInput: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
    minHeight: 40,
  },
  inlineInputFocused: {
    borderBottomColor: COLORS.pink,
  },
  chipsLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.pink,
    marginBottom: 10,
  },
  chipsRow: {
    gap: 8,
    paddingBottom: 16,
    paddingRight: 4,
  },
  chip: {
    backgroundColor: '#FFF0F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 170,
  },
  chipText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  previewLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  waitingBlock: {
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 8,
  },
  waitingTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.navy,
    textAlign: 'center',
  },
  waitingHint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  footer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 12,
    paddingTop: 8,
  },
});
