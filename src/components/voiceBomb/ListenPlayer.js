import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { GRADIENTS } from '../../constants/colors';
import WaveformBars from './WaveformBars';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 96;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ListenPlayer({
  playing = false,
  progress = 0,
  onPress,
  waveformLevels = [],
  disabled = false,
}) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.max(0, Math.min(1, progress)), {
      duration: 120,
    });
  }, [animatedProgress, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - animatedProgress.value),
  }));

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.9}>
        <View style={styles.player}>
          <Svg width={SIZE} height={SIZE} style={styles.ringSvg}>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth={STROKE}
              fill="none"
            />
            <AnimatedCircle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke="#FFFFFF"
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={animatedProps}
              strokeLinecap="round"
              rotation="-90"
              origin={`${SIZE / 2}, ${SIZE / 2}`}
            />
          </Svg>
          <LinearGradient colors={GRADIENTS.primary} style={styles.circle}>
            <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
              {playing ? (
                <>
                  <Path d="M8 5v14h3V5H8Zm5 0v14h3V5h-3Z" fill="#FFFFFF" />
                </>
              ) : (
                <Path d="M8 5v14l11-7L8 5Z" fill="#FFFFFF" />
              )}
            </Svg>
          </LinearGradient>
        </View>
      </TouchableOpacity>
      <Text style={styles.hint}>{playing ? 'Playing...' : 'Tap to listen'}</Text>
      <WaveformBars
        levels={waveformLevels}
        active={false}
        frozen
        playbackProgress={playing ? progress : 0}
        color="#FF6B9D"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    width: '100%',
  },
  player: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSvg: {
    position: 'absolute',
  },
  circle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginTop: 14,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    fontStyle: 'italic',
  },
});
