import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { GradientRatingNumber } from './ShareStoryCard';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

const THUMB_SIZE = 44;
const MIN_VALUE = 1;
const MAX_VALUE = 10;

export default function RatingSlider({ value, onChange, numberSize = 44 }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const maxTravel = useMemo(
    () => Math.max(trackWidth - THUMB_SIZE, 0),
    [trackWidth]
  );

  const valueToX = useCallback(
    (nextValue) => {
      if (maxTravel <= 0) return 0;
      return ((nextValue - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * maxTravel;
    },
    [maxTravel]
  );

  const xToValue = useCallback(
    (x) => {
      if (maxTravel <= 0) return MIN_VALUE;
      const ratio = Math.min(Math.max(x / maxTravel, 0), 1);
      return Math.round(MIN_VALUE + ratio * (MAX_VALUE - MIN_VALUE));
    },
    [maxTravel]
  );

  const applyValue = useCallback(
    (nextValue) => {
      try {
        const clamped = Math.min(Math.max(nextValue, MIN_VALUE), MAX_VALUE);
        onChange?.(clamped);
        translateX.value = valueToX(clamped);
      } catch (error) {
        console.warn('RatingSlider applyValue failed:', error.message);
      }
    },
    [onChange, translateX, valueToX]
  );

  useEffect(() => {
    if (trackWidth > 0) {
      translateX.value = valueToX(value || MIN_VALUE);
    }
  }, [trackWidth, value, translateX, valueToX]);

  const pan = Gesture.Pan()
    .enabled(maxTravel > 0)
    .onBegin(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      const nextX = Math.min(Math.max(startX.value + event.translationX, 0), maxTravel);
      translateX.value = nextX;
      runOnJS(applyValue)(xToValue(nextX));
    });

  const tap = Gesture.Tap()
    .enabled(maxTravel > 0)
    .onEnd((event) => {
      const nextX = Math.min(Math.max(event.x - THUMB_SIZE / 2, 0), maxTravel);
      translateX.value = nextX;
      runOnJS(applyValue)(xToValue(nextX));
    });

  const composed = Gesture.Race(pan, tap);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE / 2,
  }));

  const displayValue = value ?? MIN_VALUE;

  return (
    <View style={styles.wrap}>
      <View style={styles.numberWrap}>
        <GradientRatingNumber value={displayValue} size={numberSize} />
      </View>

      <View
        style={styles.trackWrap}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      >
        <GestureDetector gesture={composed}>
          <View style={styles.trackHit}>
            <View style={styles.trackBg}>
              <Animated.View style={[styles.trackFillWrap, fillStyle]}>
                <LinearGradient
                  colors={[COLORS.pink, COLORS.purple]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.trackFill}
                />
              </Animated.View>
            </View>

            <Animated.View style={[styles.thumb, thumbStyle]}>
              <Text style={styles.thumbText}>{displayValue}</Text>
            </Animated.View>
          </View>
        </GestureDetector>

        <View style={styles.anchorRow}>
          <Text style={styles.anchorEmoji}>😌</Text>
          <Text style={styles.anchorEmoji}>😤</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
  },
  numberWrap: {
    marginBottom: 8,
    minHeight: 52,
    justifyContent: 'center',
  },
  trackWrap: {
    width: '100%',
    paddingHorizontal: 2,
  },
  trackHit: {
    height: THUMB_SIZE + 8,
    justifyContent: 'center',
  },
  trackBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F0D8E8',
    overflow: 'hidden',
  },
  trackFillWrap: {
    height: '100%',
  },
  trackFill: {
    flex: 1,
    borderRadius: 4,
  },
  thumb: {
    position: 'absolute',
    top: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.pink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  thumbText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.pink,
  },
  anchorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  anchorEmoji: {
    fontSize: 22,
  },
});
