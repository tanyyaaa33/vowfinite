import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { WAVEFORM_BAR_COUNT } from '../../constants/voiceBomb';

export default function WaveformBars({
  levels = [],
  active = false,
  frozen = false,
  playbackProgress = 0,
  color = COLORS.pink,
}) {
  const bars = levels.length === WAVEFORM_BAR_COUNT
    ? levels
    : Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => levels[i] ?? 0.12);

  return (
    <View style={styles.wrap}>
      {bars.map((level, index) => (
        <WaveBar
          key={`bar-${index}`}
          level={level}
          active={active}
          frozen={frozen}
          playbackProgress={playbackProgress}
          index={index}
          color={color}
        />
      ))}
    </View>
  );
}

function WaveBar({ level, active, frozen, playbackProgress, index, color }) {
  const height = useSharedValue(8);

  useEffect(() => {
    if (active) {
      height.value = withTiming(8 + level * 36, { duration: 80 });
      return;
    }

    if (frozen) {
      const wave = 0.35 + Math.sin((index / WAVEFORM_BAR_COUNT) * Math.PI * 2 + playbackProgress * 8) * 0.25;
      const playhead = playbackProgress * WAVEFORM_BAR_COUNT;
      const played = index / WAVEFORM_BAR_COUNT <= playbackProgress;
      const target = played ? 8 + (level * 0.65 + wave * 0.35) * 34 : 8 + level * 18;
      height.value = withTiming(target, { duration: 100 });
      return;
    }

    height.value = withTiming(8 + level * 10, { duration: 120 });
  }, [active, frozen, height, index, level, playbackProgress]);

  const style = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: color, opacity: frozen && index / WAVEFORM_BAR_COUNT > playbackProgress ? 0.35 : 0.95 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
    height: 48,
    marginTop: 18,
    paddingHorizontal: 4,
    width: '100%',
    maxWidth: 280,
    alignSelf: 'center',
  },
  bar: {
    width: 4,
    borderRadius: 2,
    minHeight: 8,
  },
});
