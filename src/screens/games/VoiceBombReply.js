import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from 'expo-audio';
import { AuthContext } from '../../context/AuthContext';
import GradientButton from '../../components/GradientButton';
import DarkOrbs from '../../components/voiceBomb/DarkOrbs';
import PulseRings from '../../components/voiceBomb/PulseRings';
import CountdownRing from '../../components/voiceBomb/CountdownRing';
import WaveformBars from '../../components/voiceBomb/WaveformBars';
import RecordButton from '../../components/voiceBomb/RecordButton';
import MiniPlayButton from '../../components/voiceBomb/MiniPlayButton';
import SuccessBurst from '../../components/voiceBomb/SuccessBurst';
import VoiceBombLoader from '../../components/voiceBomb/VoiceBombLoader';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import { useGameCompletion } from '../../hooks/useGameCompletion';
import { useCouple } from '../../hooks/useCouple';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING, CONTENT_MAX_WIDTH } from '../../constants/layout';
import { VOICE_BOMB_BG, WAVEFORM_BAR_COUNT } from '../../constants/voiceBomb';
import { uploadVoiceRecording } from '../../utils/firebase';
import { subscribeToVoiceBomb, saveVoiceBombReply } from '../../utils/voiceBomb';
import { notifyPartner, NOTIFICATION_TYPES } from '../../utils/notifications';
import { POINTS } from '../../utils/points';

function OriginalMessageCard({ audioUrl, senderName, prompt }) {
  const [waveformLevels] = useState(() =>
    Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => 0.12 + (i % 4) * 0.07)
  );
  const player = useAudioPlayer(audioUrl || null);
  const playerStatus = useAudioPlayerStatus(player);
  const playerRef = useRef(null);

  useEffect(() => {
    playerRef.current = player;
    return () => {
      try {
        playerRef.current?.pause?.();
      } catch (error) {
        console.warn('Original player cleanup failed:', error.message);
      }
    };
  }, [player]);

  const playbackProgress = useMemo(() => {
    if (!playerStatus.duration) return 0;
    return Math.min(1, playerStatus.currentTime / playerStatus.duration);
  }, [playerStatus.currentTime, playerStatus.duration]);

  const togglePlay = useCallback(async () => {
    if (!audioUrl) return;
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (playerStatus.playing) {
        player.pause();
        return;
      }
      player.replace(audioUrl);
      player.play();
    } catch (error) {
      Alert.alert('Error', error?.message || 'Could not play original message.');
    }
  }, [audioUrl, player, playerStatus.playing]);

  if (!audioUrl) return null;

  return (
    <View style={styles.originalCard}>
      <Text style={styles.originalLabel}>Their voice bomb</Text>
      <Text style={styles.originalPrompt} numberOfLines={3}>
        {prompt}
      </Text>
      <Text style={styles.originalFrom}>From {senderName}</Text>
      <View style={styles.originalPlayRow}>
        <MiniPlayButton onPress={togglePlay} playing={playerStatus.playing} />
      </View>
      <WaveformBars
        levels={waveformLevels}
        frozen
        playbackProgress={playerStatus.playing ? playbackProgress : 0}
        color={COLORS.purple}
      />
    </View>
  );
}

export default function VoiceBombReply({ route, navigation }) {
  const { profile } = useContext(AuthContext);
  const { loading: coupleLoading } = useCouple();
  const { completeGame } = useGameCompletion();

  const {
    voiceBombId,
    prompt: paramPrompt,
    originalAudioUrl: paramOriginalUrl,
    senderName: paramSenderName,
  } = route.params || {};

  const [ready, setReady] = useState(false);
  const [recordReady, setRecordReady] = useState(false);
  const [record, setRecord] = useState(null);
  const [sending, setSending] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const isMounted = useRef(true);
  const navigatedRef = useRef(false);
  const navigateTimerRef = useRef(null);

  const {
    phase,
    localUri,
    durationSec,
    levels,
    frozenLevels,
    progress,
    isRecording,
    hasRecording,
    hasPlayedOnce,
    playbackProgress,
    isPreviewPlaying,
    toggleRecording,
    playPreview,
  } = useVoiceRecording();

  const prompt = record?.prompt || paramPrompt || 'Their voice message';
  const originalAudioUrl = record?.audioUrl || paramOriginalUrl;
  const senderName = record?.senderName || paramSenderName || 'Your partner';

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
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
          setRecordReady(true);
        } catch (error) {
          console.warn('Reply record handler failed:', error.message);
          setRecordReady(true);
        }
      },
      (error) => {
        console.warn('Reply listener failed:', error?.message);
        if (active && isMounted.current) setRecordReady(true);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [profile?.coupleId, voiceBombId]);

  useEffect(() => {
    if (!ready || !recordReady) return undefined;
    if (!voiceBombId) {
      try {
        navigation.goBack();
      } catch (error) {
        console.warn('Reply goBack failed:', error.message);
      }
      return undefined;
    }
    if (!originalAudioUrl) {
      try {
        navigation.goBack();
      } catch (error) {
        console.warn('Reply goBack failed:', error.message);
      }
    }
    return undefined;
  }, [ready, recordReady, voiceBombId, originalAudioUrl, navigation]);

  const handleSendReply = async () => {
    if (!localUri || sending || !voiceBombId) return;

    if (!profile?.coupleId || !profile?.uid) {
      Alert.alert('Connect first', 'Link with your partner to send a reply.');
      return;
    }

    setSending(true);
    try {
      const replyAudioUrl = await uploadVoiceRecording(
        profile.coupleId,
        voiceBombId,
        localUri,
        'reply'
      );

      await saveVoiceBombReply(profile.coupleId, voiceBombId, profile.uid, {
        replyAudioUrl,
        replyDurationSec: durationSec,
      });

      try {
        await completeGame(POINTS.VOICE_BOMB, 'voice-bomb-reply', '🎙️');
      } catch (pointsError) {
        console.warn('Reply points failed:', pointsError.message);
      }

      try {
        await notifyPartner(profile, NOTIFICATION_TYPES.VOICE_BOMB_REPLY, {
          voiceBombId,
          replyAudioUrl,
          prompt,
          senderName: profile.name,
        });
      } catch (notifyError) {
        console.warn('Reply notification failed:', notifyError.message);
      }

      if (!isMounted.current) return;

      setCelebrating(true);
      navigateTimerRef.current = setTimeout(() => {
        if (!isMounted.current || navigatedRef.current) return;
        navigatedRef.current = true;
        try {
          navigation.replace('VoiceBombListen', {
            voiceBombId,
            mode: 'message',
            prompt,
          });
        } catch (error) {
          try {
            navigation.popToTop();
          } catch (goBackError) {
            console.warn('Navigation failed:', goBackError.message);
          }
        }
      }, 1600);
    } catch (error) {
      if (isMounted.current) {
        setCelebrating(false);
        Alert.alert('Error', error?.message || 'Could not send your reply.');
      }
    } finally {
      if (isMounted.current) {
        setSending(false);
      }
    }
  };

  const waitingForFirestore = Boolean(
    profile?.coupleId && voiceBombId && !paramOriginalUrl && !recordReady
  );
  const hasOriginal = Boolean(originalAudioUrl);

  const screenLoading = !ready || coupleLoading || waitingForFirestore;

  if (screenLoading || !hasOriginal) {
    return (
      <View style={styles.screen}>
        <DarkOrbs />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <View style={styles.backBtn} />
            <Text style={styles.headerTitle} numberOfLines={1}>
              Your Reply 🎙️
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          <VoiceBombLoader />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <DarkOrbs />
      <SuccessBurst active={celebrating} />

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
            Your Reply 🎙️
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <OriginalMessageCard
            audioUrl={originalAudioUrl}
            senderName={senderName}
            prompt={prompt}
          />

          <Text style={styles.sectionTitle}>Your reply</Text>
          <Text style={styles.sectionHint} numberOfLines={2}>
            Respond in your own words — no re-dos, just real.
          </Text>

          <View style={styles.recordStage}>
            <View style={styles.ringStack}>
              <PulseRings active={phase === 'idle'} />
              <CountdownRing progress={progress} visible={isRecording} />
              <View style={styles.controlsRow}>
                {hasRecording ? (
                  <MiniPlayButton
                    onPress={playPreview}
                    playing={isPreviewPlaying}
                    disabled={hasPlayedOnce && !isPreviewPlaying}
                  />
                ) : (
                  <View style={styles.playSpacer} />
                )}
                <RecordButton
                  onPress={toggleRecording}
                  disabled={hasRecording || sending || celebrating}
                  isRecording={isRecording}
                />
                <View style={styles.playSpacer} />
              </View>
            </View>

            <WaveformBars
              levels={hasRecording ? frozenLevels : levels}
              active={isRecording}
              frozen={hasRecording}
              playbackProgress={hasRecording ? playbackProgress : 0}
            />
          </View>

          {hasRecording && (
            <>
              <GradientButton
                title={sending ? 'Sending...' : 'Send Reply 💝'}
                onPress={handleSendReply}
                loading={sending}
                disabled={sending || celebrating}
                style={styles.sendBtn}
              />
              <Text style={styles.quote}>Unscripted is more beautiful</Text>
              <Text style={styles.archiveNote} numberOfLines={2}>
                Both recordings will be saved to your archive forever.
              </Text>
            </>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  backArrow: { fontSize: 24, color: '#FFFFFF', lineHeight: 28 },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.displayItalic,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSpacer: { width: 36 },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 28,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  originalCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  originalLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.pink,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  originalPrompt: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 6,
  },
  originalFrom: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  originalPlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.displayItalic,
    fontSize: 21,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  sectionHint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  recordStage: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ringStack: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  playSpacer: { width: 52 },
  sendBtn: { marginTop: 8 },
  quote: {
    marginTop: 14,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  archiveNote: {
    marginTop: 10,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.purple,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
