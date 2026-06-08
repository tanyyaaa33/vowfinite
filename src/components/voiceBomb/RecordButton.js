import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, GRADIENTS } from '../../constants/colors';

function MicIcon({ size = 28, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
        fill={color}
      />
      <Path
        d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.08A7 7 0 0 0 19 11Z"
        fill={color}
      />
    </Svg>
  );
}

function RecordingDot({ visible }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!visible) {
      opacity.value = withTiming(0, { duration: 150 });
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      true
    );
  }, [opacity, visible]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!visible) return null;

  return <Animated.View style={[styles.dot, style]} />;
}

export default function RecordButton({ onPress, disabled = false, isRecording = false }) {
  return (
    <View style={styles.wrap}>
      <RecordingDot visible={isRecording} />
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.9}
        style={styles.touchable}
      >
        <LinearGradient colors={GRADIENTS.primary} style={styles.ring}>
          <View style={styles.inner}>
            <MicIcon />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchable: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 116,
    height: 116,
    borderRadius: 58,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#15101F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: COLORS.pink,
  },
});

export { MicIcon };
