import React, { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Share,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../../context/AuthContext';
import GradientButton from '../../components/GradientButton';
import AvatarCircle from '../../components/AvatarCircle';
import ReactionRow from '../../components/ReactionRow';
import ShareStoryCard, { GradientRatingNumber } from '../../components/hes10But/ShareStoryCard';
import Hes10Loader from '../../components/hes10But/Hes10Loader';
import { usePointsToast } from '../../components/PointsToast';
import { useGameCompletion } from '../../hooks/useGameCompletion';
import { useCouple } from '../../hooks/useCouple';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import { getCoupleMemberIds } from '../../utils/firebase';
import { POINTS } from '../../utils/points';
import {
  subscribeToHes10Round,
  subscribeToHes10History,
  saveHes10Reaction,
  saveHes10Comment,
  getUserCommentFromRound,
  getPartnerCommentFromRound,
  getUserReactionFromRound,
  shouldShowBotherNudge,
  getPartnerSubjectPronoun,
  formatRoundDate,
  CREATOR_DISPLAY_RATING,
} from '../../utils/hes10But';

const HES10_REACTIONS = ['😂', '😮', '❤️', '🙄'];
const MAX_COMMENT_LENGTH = 280;
const PARTNER_GRADIENT = ['#C084FC', '#9B7EDE'];

export default function Hesa10ButReveal({ route, navigation }) {
  const { profile } = useContext(AuthContext);
  const { couple, loading: coupleLoading } = useCouple();
  const { showPoints } = usePointsToast();
  const { completeGame } = useGameCompletion();

  const {
    roundId,
    fullSentence: paramSentence,
    partnerRating: paramRating,
  } = route.params || {};

  const [ready, setReady] = useState(false);
  const [roundReady, setRoundReady] = useState(false);
  const [round, setRound] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedReaction, setSelectedReaction] = useState(null);
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);

  const pointsAwarded = useRef(false);
  const isMounted = useRef(true);
  const membersRef = useRef([]);

  const userName = profile?.name || 'You';
  const partnerName = profile?.partnerName || 'Partner';

  const fullSentence = round?.fullSentence || paramSentence || '';
  const partnerRating = round?.partnerRating ?? paramRating;
  const creatorRating = round?.creatorRating ?? CREATOR_DISPLAY_RATING;
  const isValid = Boolean(roundId && fullSentence && partnerRating != null);

  const memberList = useMemo(() => {
    if (membersRef.current.length) return membersRef.current;
    if (couple?.members?.length) return couple.members;
    return [];
  }, [couple?.members, round]);

  const creatorDisplayName =
    round?.creatorId != null
      ? round.creatorId === profile?.uid
        ? userName
        : partnerName
      : userName;
  const raterDisplayName =
    round?.creatorId != null
      ? round.creatorId === profile?.uid
        ? partnerName
        : userName
      : partnerName;

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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMounted.current) setReady(true);
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!profile?.coupleId || !roundId) {
      setRoundReady(true);
      return undefined;
    }

    let active = true;

    const unsubscribe = subscribeToHes10Round(
      profile.coupleId,
      roundId,
      (doc) => {
        if (!active || !isMounted.current) return;
        try {
          setRound(doc);
          setRoundReady(true);
        } catch (error) {
          console.warn('Reveal round handler failed:', error.message);
          setRoundReady(true);
        }
      },
      (error) => {
        console.warn('Reveal round listener failed:', error?.message);
        if (active && isMounted.current) setRoundReady(true);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [profile?.coupleId, roundId]);

  useEffect(() => {
    if (!profile?.coupleId) return undefined;

    let active = true;

    const unsubscribe = subscribeToHes10History(
      profile.coupleId,
      (rounds) => {
        if (!active || !isMounted.current) return;
        try {
          setHistory(Array.isArray(rounds) ? rounds : []);
        } catch (error) {
          console.warn('Reveal history handler failed:', error.message);
        }
      },
      (error) => {
        console.warn('Reveal history listener failed:', error?.message);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [profile?.coupleId]);

  useEffect(() => {
    if (!ready || !roundReady) return undefined;
    if (!roundId || !fullSentence || partnerRating == null) {
      try {
        navigation.goBack();
      } catch (error) {
        console.warn('Reveal goBack failed:', error.message);
      }
    }
    return undefined;
  }, [ready, roundReady, roundId, fullSentence, partnerRating, navigation]);

  useEffect(() => {
    if (!round || !profile?.uid) return undefined;
    try {
      const reaction = getUserReactionFromRound(round, profile.uid, memberList);
      if (reaction) setSelectedReaction(reaction);
    } catch (error) {
      console.warn('Sync reaction failed:', error.message);
    }
    return undefined;
  }, [round, profile?.uid, memberList]);

  useEffect(() => {
    if (!isValid || pointsAwarded.current) return undefined;

    let active = true;
    pointsAwarded.current = true;

    (async () => {
      try {
        await completeGame(POINTS.HES10, 'hes-a-10-but');
        if (active && isMounted.current) {
          showPoints(POINTS.HES10, '✨');
        }
      } catch (error) {
        console.warn('Hes10 completion failed:', error.message);
        if (active && isMounted.current) {
          showPoints(POINTS.HES10, '✨');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [isValid, completeGame, showPoints]);

  const saveReaction = useCallback(
    async (reaction) => {
      if (!profile?.coupleId || !profile?.uid || !roundId) return;
      try {
        let members = memberList;
        if (!members.length) {
          members = await getCoupleMemberIds(profile.coupleId);
          membersRef.current = members;
        }
        await saveHes10Reaction(
          profile.coupleId,
          roundId,
          profile.uid,
          members,
          reaction
        );
      } catch (error) {
        console.warn('saveHes10Reaction failed:', error.message);
      }
    },
    [profile?.coupleId, profile?.uid, roundId, memberList]
  );

  const handleReact = useCallback(
    (reaction) => {
      setSelectedReaction(reaction);
      (async () => {
        try {
          await saveReaction(reaction);
        } catch (error) {
          console.warn('handleReact failed:', error.message);
        }
      })();
    },
    [saveReaction]
  );

  const handleSendComment = useCallback(async () => {
    const trimmed = comment.trim();
    if (!trimmed || sendingComment) return;

    if (!profile?.coupleId || !profile?.uid || !roundId) {
      Alert.alert('Error', 'Could not save your comment.');
      return;
    }

    setSendingComment(true);
    try {
      let members = membersRef.current.length
        ? membersRef.current
        : couple?.members || [];
      if (!members.length) {
        members = await getCoupleMemberIds(profile.coupleId);
        membersRef.current = members;
      }
      await saveHes10Comment(
        profile.coupleId,
        roundId,
        profile.uid,
        members,
        trimmed
      );
      if (isMounted.current) setComment('');
    } catch (error) {
      if (isMounted.current) {
        Alert.alert('Error', error?.message || 'Could not send comment.');
      }
    } finally {
      if (isMounted.current) setSendingComment(false);
    }
  }, [
    comment,
    sendingComment,
    profile?.coupleId,
    profile?.uid,
    roundId,
    couple?.members,
  ]);

  const handleShare = useCallback(async () => {
    try {
      setShareVisible(true);
      const message = `${fullSentence}\n${userName}: ${creatorRating}/10 · ${partnerName}: ${partnerRating}/10\n— VowFinity 💕`;
      await Share.share({ message });
    } catch (error) {
      console.warn('Share failed:', error.message);
    }
  }, [fullSentence, userName, partnerName, creatorRating, partnerRating]);

  const showNudge = shouldShowBotherNudge(history);
  const partnerPronoun = getPartnerSubjectPronoun(profile);

  const userComment = round
    ? getUserCommentFromRound(round, profile?.uid, memberList)
    : '';
  const partnerComment = round
    ? getPartnerCommentFromRound(round, profile?.uid, memberList)
    : '';

  const screenLoading =
    !ready ||
    coupleLoading ||
    (Boolean(profile?.coupleId && roundId) && !roundReady);

  if (screenLoading || !isValid) {
    return (
      <View style={styles.screen}>
        <View style={styles.orbPink} pointerEvents="none" />
        <View style={styles.orbPurple} pointerEvents="none" />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <Hes10Loader />
        </SafeAreaView>
      </View>
    );
  }

  const pastRounds = history.filter(
    (item) => item?.partnerRating != null && item.id !== roundId
  );

  return (
    <View style={styles.screen}>
      <View style={styles.orbPink} pointerEvents="none" />
      <View style={styles.orbPurple} pointerEvents="none" />

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
            <Text style={styles.title} numberOfLines={2}>
              The verdict is in ✨
            </Text>

            <View style={[styles.sentenceCard, SHADOWS.card]}>
              <Text style={styles.sentenceText} numberOfLines={4}>
                {fullSentence}
              </Text>
            </View>

            <View style={styles.ratingsRow}>
              <View style={styles.ratingCol}>
                <AvatarCircle initial={creatorDisplayName} size={48} />
                <GradientRatingNumber value={creatorRating} size={32} />
                <Text style={styles.ratingLabel} numberOfLines={1}>
                  {creatorDisplayName}
                </Text>
              </View>
              <Text style={styles.vs}>vs</Text>
              <View style={styles.ratingCol}>
                <AvatarCircle
                  initial={raterDisplayName}
                  size={48}
                  gradient={PARTNER_GRADIENT}
                />
                <GradientRatingNumber value={partnerRating} size={32} />
                <Text style={styles.ratingLabel} numberOfLines={1}>
                  {raterDisplayName}
                </Text>
              </View>
            </View>

            <ReactionRow
              reactions={HES10_REACTIONS}
              selectedReaction={selectedReaction}
              onReact={handleReact}
            />

            {(userComment || partnerComment) ? (
              <View style={styles.commentsBlock}>
                {userComment ? (
                  <View style={styles.commentBubble}>
                    <Text style={styles.commentAuthor}>{userName}</Text>
                    <Text style={styles.commentText}>{userComment}</Text>
                  </View>
                ) : null}
                {partnerComment ? (
                  <View style={[styles.commentBubble, styles.commentBubblePartner]}>
                    <Text style={styles.commentAuthor}>{partnerName}</Text>
                    <Text style={styles.commentText}>{partnerComment}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.commentBox}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add your take..."
                placeholderTextColor={COLORS.placeholder}
                value={comment}
                onChangeText={(text) => setComment(text.slice(0, MAX_COMMENT_LENGTH))}
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!comment.trim() || sendingComment) && styles.sendBtnDisabled,
                ]}
                onPress={handleSendComment}
                disabled={!comment.trim() || sendingComment}
              >
                <LinearGradient colors={GRADIENTS.primary} style={styles.sendGradient}>
                  <Text style={styles.sendText}>
                    {sendingComment ? 'Sending...' : 'Send'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <GradientButton
              title="Share Card"
              onPress={handleShare}
              style={styles.shareBtn}
            />

            {showNudge && (
              <TouchableOpacity
                style={styles.nudgeCard}
                activeOpacity={0.9}
                onPress={() => {
                  try {
                    navigation.navigate('MainTabs', { screen: 'Surprise' });
                  } catch (error) {
                    console.warn('Surprise navigation failed:', error.message);
                  }
                }}
              >
                <LinearGradient
                  colors={['#FFF0F6', '#FFFFFF']}
                  style={styles.nudgeGradient}
                >
                  <Text style={styles.nudgeEmoji}>💝</Text>
                  <View style={styles.nudgeTextWrap}>
                    <Text style={styles.nudgeTitle} numberOfLines={2}>
                      {partnerPronoun} seems genuinely bothered. Here&apos;s what you can do 💝
                    </Text>
                    <Text style={styles.nudgeLink}>Open Surprise →</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {pastRounds.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.historyTitle}>Past rounds</Text>
                {pastRounds.slice(0, 12).map((item) => (
                  <View key={item.id} style={[styles.historyCard, SHADOWS.card]}>
                    <Text style={styles.historyDate}>{formatRoundDate(item)}</Text>
                    <Text style={styles.historySentence} numberOfLines={2}>
                      {item.fullSentence}
                    </Text>
                    <Text style={styles.historyRating}>
                      Bother level: {item.partnerRating}/10
                    </Text>
                  </View>
                ))}
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
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal
        visible={shareVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShareVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ShareStoryCard
              fullSentence={fullSentence}
              creatorName={creatorDisplayName}
              partnerName={raterDisplayName}
              creatorRating={creatorRating}
              partnerRating={partnerRating}
              compact
            />
            <GradientButton
              title="Close"
              onPress={() => setShareVisible(false)}
              style={styles.modalClose}
            />
          </View>
        </View>
      </Modal>
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
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.pink,
    opacity: 0.12,
  },
  orbPurple: {
    position: 'absolute',
    bottom: 70,
    left: -35,
    width: 170,
    height: 170,
    borderRadius: 85,
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
  title: {
    fontFamily: FONTS.displayItalic,
    fontSize: 20,
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sentenceCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sentenceText: {
    fontFamily: FONTS.displayItalic,
    fontSize: 17,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },
  ratingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  ratingCol: {
    alignItems: 'center',
    gap: 5,
    flex: 1,
    minWidth: 0,
  },
  ratingLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.textPrimary,
    maxWidth: 90,
    textAlign: 'center',
  },
  vs: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.pink,
    flexShrink: 0,
  },
  commentsBlock: {
    gap: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  commentBubble: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'flex-start',
    maxWidth: '88%',
  },
  commentBubblePartner: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFF0F6',
  },
  commentAuthor: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.pink,
    marginBottom: 4,
  },
  commentText: {
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
    marginTop: 8,
    marginBottom: 12,
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
  shareBtn: {
    marginBottom: 14,
  },
  nudgeCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nudgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  nudgeEmoji: {
    fontSize: 28,
  },
  nudgeTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  nudgeTitle: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  nudgeLink: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.pink,
    marginTop: 6,
  },
  historySection: {
    marginBottom: 16,
  },
  historyTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  historyCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyDate: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.pink,
    marginBottom: 4,
  },
  historySentence: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 19,
    marginBottom: 4,
  },
  historyRating: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.purple,
  },
  button: {
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,35,64,0.55)',
    justifyContent: 'center',
    paddingHorizontal: SCREEN_PADDING,
  },
  modalCard: {
    alignItems: 'center',
    gap: 16,
  },
  modalClose: {
    width: '100%',
  },
});
