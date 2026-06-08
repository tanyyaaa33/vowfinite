import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SCREEN_PADDING, GRID_CARD_GAP, getGridCardWidth } from '../../constants/layout';

function SkeletonBlock({ style }) {
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.85, { duration: 900 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.block, style, animatedStyle]} />;
}

export default function GamesHubSkeleton() {
  const cardWidth = getGridCardWidth();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <SkeletonBlock style={styles.titleSkeleton} />
        <SkeletonBlock style={styles.pillSkeleton} />
      </View>

      <SkeletonBlock style={styles.streakCard} />
      <SkeletonBlock style={styles.featuredCard} />
      <SkeletonBlock style={styles.sectionLabel} />

      <View style={styles.grid}>
        <SkeletonBlock style={[styles.gridCard, { width: cardWidth }]} />
        <SkeletonBlock style={[styles.gridCard, { width: cardWidth }]} />
        <SkeletonBlock style={[styles.gridCard, { width: cardWidth }]} />
        <SkeletonBlock style={[styles.gridCard, { width: cardWidth }]} />
        <SkeletonBlock style={[styles.gridCard, { width: cardWidth }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 24,
  },
  block: {
    backgroundColor: '#FFD6E8',
    borderRadius: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    gap: 10,
  },
  titleSkeleton: {
    width: 96,
    height: 30,
    borderRadius: 10,
    flex: 1,
    maxWidth: 120,
  },
  pillSkeleton: {
    width: 80,
    height: 32,
    borderRadius: 16,
  },
  streakCard: {
    height: 84,
    marginBottom: 16,
  },
  featuredCard: {
    height: 112,
    marginBottom: 24,
  },
  sectionLabel: {
    width: 90,
    height: 12,
    borderRadius: 6,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 0,
  },
  gridCard: {
    height: 140,
    marginBottom: GRID_CARD_GAP,
  },
});
