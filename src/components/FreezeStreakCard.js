import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import {
  ACTIVITIES_REQUIRED,
  getStreakCount,
  getFreezeTokens,
  getDateKey,
  useFreeze,
} from '../utils/points';

export default function FreezeStreakCard({ couple, coupleId }) {
  const [loading, setLoading] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const streak = getStreakCount(couple);
  const activitiesToday = couple?.activitiesToday ?? 0;
  const freezeTokens = getFreezeTokens(couple);
  const isProtected = couple?.streakProtectedDate === getDateKey();
  const needsActivities = activitiesToday < ACTIVITIES_REQUIRED;
  const showCard = streak > 0 && needsActivities && freezeTokens > 0;

  if (!showCard) return null;

  const handleFreeze = async () => {
    if (!coupleId || loading) return;
    setLoading(true);
    try {
      await useFreeze(coupleId);
      Alert.alert(
        'Streak Protected! 🧊',
        'Your streak is safe tonight even if you don\'t finish all activities.'
      );
    } catch (error) {
      Alert.alert('Freeze unavailable', error.message || 'Could not use freeze token.');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  return (
    <View style={[styles.card, SHADOWS.card]}>
      <LinearGradient colors={['#E8F4FF', '#FFF5F9']} style={styles.inner}>
        <Text style={styles.emoji}>🧊</Text>
        <View style={styles.content}>
          <Text style={styles.title}>
            {isProtected ? 'Streak protected tonight' : 'Protect your streak'}
          </Text>
          <Text style={styles.desc}>
            {activitiesToday}/{ACTIVITIES_REQUIRED} activities done · {freezeTokens} freeze
            {freezeTokens === 1 ? '' : 's'} left
          </Text>
        </View>
        {!isProtected && (
          <TouchableOpacity onPress={handleFreeze} disabled={loading} style={styles.freezeBtn}>
            <LinearGradient colors={GRADIENTS.primary} style={styles.freezeGradient}>
              <Text style={styles.freezeText}>{loading ? '...' : 'Use'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        {isProtected && <Text style={styles.protectedBadge}>✓</Text>}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  emoji: {
    fontSize: 28,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.navy,
  },
  desc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  freezeBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  freezeGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  freezeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  protectedBadge: {
    fontSize: 22,
    color: COLORS.green,
    fontFamily: FONTS.bold,
  },
});
