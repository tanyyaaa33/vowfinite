import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

export default function DailyQuestionFeaturedCard({
  question = '',
  statusLabel = 'Answer Now',
  onPress,
}) {
  const handlePress = () => {
    try {
      onPress?.();
    } catch (error) {
      console.warn('DailyQuestionFeaturedCard press failed:', error.message);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={GRADIENTS.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <Text style={styles.title}>Daily Question ✨</Text>
        <Text style={styles.question} numberOfLines={1}>
          {question || 'Today\'s question is loading...'}
        </Text>

        <View style={styles.footer}>
          <View style={styles.statusPill}>
            <Text style={styles.statusText} numberOfLines={1}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
    borderRadius: 18,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    minHeight: 112,
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  question: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 19,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusPill: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    maxWidth: '78%',
  },
  statusText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
});
