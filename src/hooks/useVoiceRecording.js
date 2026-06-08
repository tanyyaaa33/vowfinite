import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { RECORD_MAX_SECONDS, WAVEFORM_BAR_COUNT } from '../constants/voiceBomb';

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

function normalizeMetering(metering) {
  if (typeof metering !== 'number') return 0.12;
  return Math.max(0.1, Math.min(1, (metering + 55) / 45));
}

export function useVoiceRecording(maxDurationSec = RECORD_MAX_SECONDS) {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 60);

  const [phase, setPhase] = useState('idle');
  const [localUri, setLocalUri] = useState(null);
  const [durationSec, setDurationSec] = useState(0);
  const [levels, setLevels] = useState(() => Array(WAVEFORM_BAR_COUNT).fill(0.12));
  const [frozenLevels, setFrozenLevels] = useState(() => Array(WAVEFORM_BAR_COUNT).fill(0.12));
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

  const levelsRef = useRef(Array(WAVEFORM_BAR_COUNT).fill(0.12));
  const isMounted = useRef(true);
  const stopRecordingRef = useRef(async () => {});

  const player = useAudioPlayer(localUri);
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (phase !== 'recording') return;
    const normalized = normalizeMetering(recorderState.metering);
    const next = [...levelsRef.current.slice(1), normalized];
    levelsRef.current = next;
    setLevels(next);
  }, [phase, recorderState.metering]);

  const progress = useMemo(() => {
    if (phase !== 'recording') return 0;
    return Math.min(1, recorderState.durationMillis / (maxDurationSec * 1000));
  }, [maxDurationSec, phase, recorderState.durationMillis]);

  const stopRecording = useCallback(async () => {
    if (phase !== 'recording') return;

    try {
      await recorder.stop();
      const uri = recorder.uri;
      let durationMs = recorderState.durationMillis;
      try {
        const status = recorder.getStatus?.();
        if (status?.durationMillis) {
          durationMs = status.durationMillis;
        }
      } catch (statusError) {
        console.warn('Recorder status read failed:', statusError.message);
      }
      const duration = durationMs / 1000;
      const snapshot = [...levelsRef.current];

      if (!uri) {
        throw new Error('Recording was not saved.');
      }

      if (isMounted.current) {
        setLocalUri(uri);
        setDurationSec(duration);
        setFrozenLevels(snapshot.length ? snapshot : Array(WAVEFORM_BAR_COUNT).fill(0.2));
        setPhase('recorded');
      }
    } catch (error) {
      if (isMounted.current) {
        setPhase('idle');
        Alert.alert('Error', error?.message || 'Could not save recording.');
      }
    }
  }, [phase, recorder, recorderState.durationMillis]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  useEffect(() => {
    if (phase !== 'recording') return undefined;
    if (recorderState.durationMillis >= maxDurationSec * 1000) {
      stopRecordingRef.current();
    }
    return undefined;
  }, [phase, recorderState.durationMillis, maxDurationSec]);

  const startRecording = useCallback(async () => {
    if (phase === 'recording') return;

    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow microphone access to record.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      setLocalUri(null);
      setHasPlayedOnce(false);
      levelsRef.current = Array(WAVEFORM_BAR_COUNT).fill(0.12);
      setLevels(levelsRef.current);

      await recorder.prepareToRecordAsync(RECORDING_OPTIONS);
      recorder.record({ forDuration: maxDurationSec });
      setPhase('recording');
    } catch (error) {
      Alert.alert('Error', error?.message || 'Could not start recording.');
    }
  }, [maxDurationSec, phase, recorder]);

  const toggleRecording = useCallback(async () => {
    try {
      if (phase === 'idle') {
        await startRecording();
        return;
      }
      if (phase === 'recording') {
        await stopRecording();
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Recording action failed.');
    }
  }, [phase, startRecording, stopRecording]);

  const playPreview = useCallback(async () => {
    if (!localUri || hasPlayedOnce) return;

    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      player.replace(localUri);
      player.play();
    } catch (error) {
      Alert.alert('Error', error?.message || 'Could not play recording.');
    }
  }, [hasPlayedOnce, localUri, player]);

  useEffect(() => {
    if (!playerStatus.playing && playerStatus.currentTime > 0 && playerStatus.duration > 0) {
      const finished = playerStatus.currentTime >= playerStatus.duration - 0.05;
      if (finished && isMounted.current) {
        setHasPlayedOnce(true);
        try {
          player.pause();
        } catch (error) {
          console.warn('Pause preview failed:', error.message);
        }
      }
    }
  }, [player, playerStatus.currentTime, playerStatus.duration, playerStatus.playing]);

  const playbackProgress = useMemo(() => {
    if (!playerStatus.duration) return 0;
    return Math.min(1, playerStatus.currentTime / playerStatus.duration);
  }, [playerStatus.currentTime, playerStatus.duration]);

  return {
    phase,
    localUri,
    durationSec,
    levels,
    frozenLevels,
    progress,
    isRecording: phase === 'recording',
    hasRecording: phase === 'recorded' && Boolean(localUri),
    hasPlayedOnce,
    playbackProgress,
    isPreviewPlaying: playerStatus.playing,
    toggleRecording,
    playPreview,
  };
}
