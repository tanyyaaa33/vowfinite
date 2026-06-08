import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../../App';
import GradientButton from '../../components/GradientButton';
import DarkOrbs from '../../components/voiceBomb/DarkOrbs';
import PromptGlow from '../../components/voiceBomb/PromptGlow';
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
import { VOICE_BOMB_BG, getTodayVoiceBombPrompt, RECORD_MAX_SECONDS } from '../../constants/voiceBomb';
import { uploadVoiceRecording } from '../../utils/firebase';
import { createVoiceBomb } from '../../utils/voiceBomb';
import { notifyPartner, NOTIFICATION_TYPES } from '../../utils/notifications';
import { POINTS } from '../../utils/points';

export default function VoiceBombRecord({ navigation }) {
  const { profile } = useContext(AuthContext);
  const { loading: coupleLoading } = useCouple();
  const { completeGame } = useGameCompletion();

  const promptMeta = useMemo(() => getTodayVoiceBombPrompt(), []);
  const [ready, setReady] = useState(false);
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

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (navigateTimerRef.current) {
        clearTimeout(navigateTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMounted.current) setReady(true);
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = async () => {
    if (!localUri || sending) return;

    if (!profile?.coupleId || !profile?.uid) {
      Alert.alert('Connect first', 'Link with your partner to send a voice bomb.');
      return;
    }

    setSending(true);
    try {
      const voiceBombId = `${Date.now()}_${String(profile.uid).slice(0, 6)}`;
      const audioUrl = await uploadVoiceRecording(
        profile.coupleId,
        voiceBombId,
        localUri,
        'message'
      );

      await createVoiceBomb(
        profile.coupleId,
        profile.uid,
        {
          senderName: profile.name || 'You',
          prompt: promptMeta.text,
          promptId: promptMeta.id,
          audioUrl,
          durationSec,
        },
        voiceBombId
      );

      try {
        await completeGame(POINTS.VOICE_BOMB, 'voice-bomb', '🎙️');
      } catch (pointsError) {
        console.warn('Voice bomb points failed:', pointsError.message);
      }

      try {
        await notifyPartner(profile, NOTIFICATION_TYPES.VOICE_BOMB_SENT, {
          voiceBombId,
          audioUrl,
          prompt: promptMeta.text,
          senderName: profile.name,
        });
      } catch (notifyError) {
        console.warn('Partner notification failed:', notifyError.message);
      }

      if (!isMounted.current) return;

      setCelebrating(true);
      navigateTimerRef.current = setTimeout(() => {
        if (!isMounted.current || navigatedRef.current) return;
        navigatedRef.current = true;
        try {
          navigation.popToTop();
        } catch (error) {
          try {
            navigation.goBack();
          } catch (goBackError) {
            console.warn('Navigation failed:', goBackError.message);
          }
        }
      }, 1600);
    } catch (error) {
      if (isMounted.current) {
        setCelebrating(false);
        Alert.alert('Error', error?.message || 'Could not send voice bomb.');
      }
    } finally {
      if (isMounted.current) {
        setSending(false);
      }
    }
  };

  if (!ready || coupleLoading) {
    return (
      <View style={styles.screen}>
        <DarkOrbs />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <View style={styles.backBtn} />
            <Text style={styles.headerTitle} numberOfLines={1}>
              Voice Bomb 🎙️
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
            Voice Bomb 🎙️
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <PromptGlow text={promptMeta.text} />

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

            {isRecording && (
              <Text style={styles.timerText}>
                {Math.max(0, Math.ceil(RECORD_MAX_SECONDS - progress * RECORD_MAX_SECONDS))}s left
              </Text>
            )}
          </View>

          {hasRecording && (
            <>
              <GradientButton
                title={sending ? 'Sending...' : 'Send 💝'}
                onPress={handleSend}
                loading={sending}
                disabled={sending || celebrating}
                style={styles.sendBtn}
              />
              <Text style={styles.quote}>Unscripted is more beautiful</Text>
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
  backBtn: {
    width: 36,
    alignItems: 'flex-start',
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
  },
  headerSpacer: { width: 36 },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 28,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  recordStage: {
    alignItems: 'center',
    marginBottom: 24,
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
  playSpacer: {
    width: 52,
  },
  timerText: {
    marginTop: 10,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.pink,
  },
  sendBtn: {
    marginTop: 8,
  },
  quote: {
    marginTop: 14,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
