import React, { useCallback, useEffect, useState } from 'react';
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
  const maxTravel = useSharedValue(0);

  useEffect(() => {
    maxTravel.value = Math.max(trackWidth - THUMB_SIZE, 0);
    if (trackWidth > 0) {
      const clamped = Math.min(Math.max(value || MIN_VALUE, MIN_VALUE), MAX_VALUE);
      const travel = maxTravel.value;
      translateX.value =
        travel <= 0
          ? 0
          : ((clamped - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * travel;
    }
  }, [trackWidth, value, maxTravel, translateX]);

  const emitValue = useCallback(
    (nextValue) => {
      try {
        const clamped = Math.min(Math.max(nextValue, MIN_VALUE), MAX_VALUE);
        onChange?.(clamped);
      } catch (error) {
        console.warn('RatingSlider onChange failed:', error.message);
      }
    },
    [onChange]
  );

  const pan = Gesture.Pan()
    .enabled(trackWidth > THUMB_SIZE)
    .onBegin(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      const travel = maxTravel.value;
      const nextX = Math.min(Math.max(startX.value + event.translationX, 0), travel);
      translateX.value = nextX;

      if (travel <= 0) {
        runOnJS(emitValue)(MIN_VALUE);
        return;
      }

      const ratio = Math.min(Math.max(nextX / travel, 0), 1);
      const nextValue = Math.round(MIN_VALUE + ratio * (MAX_VALUE - MIN_VALUE));
      runOnJS(emitValue)(nextValue);
    });

  const tap = Gesture.Tap()
    .enabled(trackWidth > THUMB_SIZE)
    .onEnd((event) => {
      const travel = maxTravel.value;
      const nextX = Math.min(Math.max(event.x - THUMB_SIZE / 2, 0), travel);
      translateX.value = nextX;

      if (travel <= 0) {
        runOnJS(emitValue)(MIN_VALUE);
        return;
      }

      const ratio = Math.min(Math.max(nextX / travel, 0), 1);
      const nextValue = Math.round(MIN_VALUE + ratio * (MAX_VALUE - MIN_VALUE));
      runOnJS(emitValue)(nextValue);
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
