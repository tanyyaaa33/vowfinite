import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from 'expo-audio';
import { AuthContext } from '../../../App';
import GradientButton from '../../components/GradientButton';
import AvatarCircle from '../../components/AvatarCircle';
import ReactionRow from '../../components/ReactionRow';
import DarkOrbs from '../../components/voiceBomb/DarkOrbs';
import ListenPlayer from '../../components/voiceBomb/ListenPlayer';
import VoiceBombLoader from '../../components/voiceBomb/VoiceBombLoader';
import { useCouple } from '../../hooks/useCouple';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING, CONTENT_MAX_WIDTH } from '../../constants/layout';
import {
  VOICE_BOMB_BG,
  VOICE_BOMB_REACTIONS,
  WAVEFORM_BAR_COUNT,
} from '../../constants/voiceBomb';
import {
  subscribeToVoiceBomb,
  markVoiceBombListened,
  saveVoiceBombReaction,
} from '../../utils/voiceBomb';

function SpringIn({ children, delay = 0, style }) {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 140 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 140 }));
  }, [delay, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

export default function VoiceBombListen({ route, navigation }) {
  const { profile } = useContext(AuthContext);
  const { loading: coupleLoading } = useCouple();

  const {
    voiceBombId,
    audioUrl: paramAudioUrl,
    prompt: paramPrompt,
    senderName: paramSenderName,
    mode = 'message',
  } = route.params || {};

  const [ready, setReady] = useState(false);
  const [recordReady, setRecordReady] = useState(false);
  const [record, setRecord] = useState(null);
  const [selectedReaction, setSelectedReaction] = useState(null);
  const [hasFinished, setHasFinished] = useState(false);
  const [waveformLevels] = useState(() =>
    Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => 0.15 + (i % 5) * 0.08)
  );

  const isMounted = useRef(true);
  const finishedRef = useRef(false);
  const playerRef = useRef(null);

  const playbackUrl = useMemo(() => {
    if (mode === 'reply') {
      return record?.replyAudioUrl || paramAudioUrl;
    }
    return record?.audioUrl || paramAudioUrl;
  }, [mode, paramAudioUrl, record?.audioUrl, record?.replyAudioUrl]);

  const prompt = record?.prompt || paramPrompt || 'A voice message from the heart';
  const senderName = record?.senderName || paramSenderName || profile?.partnerName || 'Your partner';
  const isReplyView = mode === 'reply';
  const displayName = isReplyView ? profile?.partnerName || 'Your partner' : senderName;
  const isRecipient = record?.senderId
    ? record.senderId !== profile?.uid
    : mode === 'message';
  const canReply = Boolean(isRecipient && hasFinished && record?.status !== 'replied');
  const hasPlayback = Boolean(playbackUrl);

  const player = useAudioPlayer(playbackUrl || null);
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const playbackProgress = useMemo(() => {
    if (!playerStatus.duration) return 0;
    return Math.min(1, playerStatus.currentTime / playerStatus.duration);
  }, [playerStatus.currentTime, playerStatus.duration]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      try {
        playerRef.current?.pause?.();
      } catch (error) {
        console.warn('Listen player cleanup failed:', error.message);
      }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMounted.current) setReady(true);
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!profile?.coupleId || !voiceBombId) {
      setRecordReady(true);
      return undefined;
    }

    let active = true;

    const unsubscribe = subscribeToVoiceBomb(
      profile.coupleId,
      voiceBombId,
      (doc) => {
        if (!active || !isMounted.current) return;
        try {
          setRecord(doc);
          if (doc?.reaction) setSelectedReaction(doc.reaction);
          setRecordReady(true);
        } catch (error) {
          console.warn('Voice bomb record handler failed:', error.message);
          setRecordReady(true);
        }
      },
      (error) => {
        console.warn('Voice bomb listener failed:', error?.message);
        if (active && isMounted.current) setRecordReady(true);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [profile?.coupleId, voiceBombId]);

  useEffect(() => {
    finishedRef.current = false;
    setHasFinished(false);
    try {
      player.pause();
    } catch (error) {
      console.warn('Reset player failed:', error.message);
    }
  }, [playbackUrl, player]);

  useEffect(() => {
    if (!ready || !recordReady) return undefined;
    if (!voiceBombId && !paramAudioUrl) {
      try {
        navigation.goBack();
      } catch (error) {
        console.warn('Listen goBack failed:', error.message);
      }
      return undefined;
    }
    if (!hasPlayback) {
      try {
        navigation.goBack();
      } catch (error) {
        console.warn('Listen goBack failed:', error.message);
      }
    }
    return undefined;
  }, [ready, recordReady, voiceBombId, paramAudioUrl, hasPlayback, navigation]);

  useEffect(() => {
    if (!playerStatus.playing && playerStatus.currentTime > 0 && playerStatus.duration > 0) {
      const finished = playerStatus.currentTime >= playerStatus.duration - 0.08;
      if (finished && !finishedRef.current && isMounted.current) {
        finishedRef.current = true;
        setHasFinished(true);
        if (profile?.coupleId && voiceBombId && isRecipient && profile?.uid) {
          markVoiceBombListened(profile.coupleId, voiceBombId, profile.uid).catch((error) => {
            console.warn('markVoiceBombListened failed:', error.message);
          });
        }
      }
    }
  }, [
    isRecipient,
    playerStatus.currentTime,
    playerStatus.duration,
    playerStatus.playing,
    profile?.coupleId,
    profile?.uid,
    voiceBombId,
  ]);

  const togglePlay = useCallback(async () => {
    if (!playbackUrl) return;

    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      if (playerStatus.playing) {
        player.pause();
        return;
      }

      if (
        playerStatus.duration > 0 &&
        playerStatus.currentTime > 0 &&
        playerStatus.currentTime < playerStatus.duration - 0.05
      ) {
        player.play();
        return;
      }

      player.replace(playbackUrl);
      player.play();
    } catch (error) {
      Alert.alert('Error', error?.message || 'Could not play this voice bomb.');
    }
  }, [playbackUrl, player, playerStatus.currentTime, playerStatus.duration, playerStatus.playing]);

  const handleReaction = useCallback(
    async (reaction) => {
      setSelectedReaction(reaction);
      if (!profile?.coupleId || !profile?.uid || !voiceBombId || !isRecipient) return;

      try {
        await saveVoiceBombReaction(profile.coupleId, voiceBombId, profile.uid, reaction);
      } catch (error) {
        Alert.alert('Error', error?.message || 'Could not save reaction.');
      }
    },
    [isRecipient, profile?.coupleId, profile?.uid, voiceBombId]
  );

  const waitingForFirestore = Boolean(
    profile?.coupleId && voiceBombId && !paramAudioUrl && !recordReady
  );

  const screenLoading = !ready || coupleLoading || waitingForFirestore;

  if (screenLoading || !hasPlayback) {
    return (
      <View style={styles.screen}>
        <DarkOrbs />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <VoiceBombLoader />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <DarkOrbs />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <AvatarCircle initial={displayName} size={76} />
          <Text style={styles.name} numberOfLines={2}>
            {displayName}
          </Text>
          <Text style={styles.subline} numberOfLines={2}>
            {isReplyView ? 'sent you a voice reply' : 'has something to tell you'}
          </Text>

          <View style={styles.promptCard}>
            <Text style={styles.promptText} numberOfLines={5}>
              {prompt}
            </Text>
          </View>

          <ListenPlayer
            playing={playerStatus.playing}
            progress={playbackProgress}
            onPress={togglePlay}
            waveformLevels={waveformLevels}
          />

          {record?.status === 'replied' && record?.audioUrl && record?.replyAudioUrl && (
            <View style={styles.archiveSection}>
              <Text style={styles.archiveTitle}>Your voice thread</Text>
              <Text style={styles.archiveHint} numberOfLines={2}>
                Both recordings are saved in your archive forever.
              </Text>
              <View style={styles.archiveButtons}>
                <GradientButton
                  title={mode === 'message' ? 'Playing original ✓' : 'Play original'}
                  onPress={() => {
                    try {
                      navigation.setParams({ mode: 'message', audioUrl: record.audioUrl });
                    } catch (error) {
                      console.warn('Switch archive track failed:', error.message);
                    }
                  }}
                  style={styles.archiveBtn}
                />
                <GradientButton
                  title={mode === 'reply' ? 'Playing reply ✓' : 'Play reply'}
                  onPress={() => {
                    try {
                      navigation.setParams({
                        mode: 'reply',
                        audioUrl: record.replyAudioUrl,
                      });
                    } catch (error) {
                      console.warn('Switch archive track failed:', error.message);
                    }
                  }}
                  style={styles.archiveBtn}
                />
              </View>
            </View>
          )}

          {hasFinished && isRecipient && (
            <SpringIn delay={0} style={styles.reactionsWrap}>
              <ReactionRow
                reactions={VOICE_BOMB_REACTIONS}
                selectedReaction={selectedReaction}
                onReact={handleReaction}
              />
            </SpringIn>
          )}

          {canReply && (
            <SpringIn delay={120}>
              <GradientButton
                title="Record your reply"
                onPress={() => {
                  try {
                    navigation.navigate('VoiceBombReply', {
                      voiceBombId,
                      prompt,
                      originalAudioUrl: record?.audioUrl || paramAudioUrl,
                      senderName,
                    });
                  } catch (error) {
                    console.warn('Navigate to reply failed:', error.message);
                  }
                }}
                style={styles.replyBtn}
              />
            </SpringIn>
          )}

          {record?.status === 'replied' && !isRecipient && (
            <SpringIn delay={80}>
              <View style={styles.replyNotice}>
                <Text style={styles.replyNoticeText} numberOfLines={3}>
                  {profile?.partnerName || 'Your partner'} replied to your voice bomb 💝
                </Text>
              </View>
            </SpringIn>
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
            style={styles.backBtn}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: VOICE_BOMB_BG,
  },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 12,
    paddingBottom: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  name: {
    fontFamily: FONTS.displayItalic,
    fontSize: 22,
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  subline: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  promptCard: {
    width: '100%',
    backgroundColor: 'rgba(255,107,157,0.14)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,107,157,0.25)',
  },
  promptText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: '#FFD6E8',
    textAlign: 'center',
    lineHeight: 22,
  },
  archiveSection: {
    width: '100%',
    marginTop: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  archiveTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  archiveHint: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  archiveButtons: {
    width: '100%',
    gap: 10,
  },
  archiveBtn: {
    width: '100%',
  },
  reactionsWrap: {
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
  },
  replyBtn: {
    marginTop: 8,
    width: '100%',
  },
  replyNotice: {
    width: '100%',
    marginTop: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(192,132,252,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.28)',
  },
  replyNoticeText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 21,
  },
  backBtn: {
    marginTop: 16,
    width: '100%',
  },
});
