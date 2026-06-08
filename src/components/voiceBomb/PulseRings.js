import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';

const RINGS = [
  { size: 130, delay: 0 },
  { size: 158, delay: 400 },
  { size: 186, delay: 800 },
];

function PulseRing({ size, delay, active }) {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    if (!active) {
      scale.value = withTiming(0.85, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
      return;
    }

    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1400 }),
          withTiming(0.85, { duration: 1400 })
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.28, { duration: 1400 }),
          withTiming(0.05, { duration: 1400 })
        ),
        -1,
        false
      )
    );
  }, [active, delay, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    />
  );
}

export default function PulseRings({ active = true }) {
  return (
    <>
      {RINGS.map((ring) => (
        <PulseRing key={ring.size} {...ring} active={active} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.pink,
  },
});
