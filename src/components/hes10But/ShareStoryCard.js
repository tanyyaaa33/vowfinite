import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import AvatarCircle from '../AvatarCircle';
import { COLORS, GRADIENTS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

export default function ShareStoryCard({
  fullSentence,
  creatorName,
  partnerName,
  creatorRating = 10,
  partnerRating,
  compact = false,
}) {
  const showRatings = partnerRating != null;

  return (
    <View style={[styles.outer, compact && styles.outerCompact]}>
      <LinearGradient
        colors={GRADIENTS.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, compact && styles.cardCompact]}
      >
        <Text style={styles.brand}>VowFinity</Text>
        <Text style={[styles.sentence, compact && styles.sentenceCompact]} numberOfLines={5}>
          {fullSentence}
        </Text>

        {showRatings && (
          <View style={styles.ratingsRow}>
            <View style={styles.ratingCol}>
              <AvatarCircle initial={creatorName} size={compact ? 32 : 36} />
              <Text style={styles.ratingNum}>{creatorRating}</Text>
              <Text style={styles.ratingName} numberOfLines={1}>
                {creatorName}
              </Text>
            </View>
            <Text style={styles.vs}>vs</Text>
            <View style={styles.ratingCol}>
              <AvatarCircle
                initial={partnerName}
                size={compact ? 32 : 36}
                gradient={['#C084FC', '#9B7EDE']}
              />
              <Text style={styles.ratingNum}>{partnerRating}</Text>
              <Text style={styles.ratingName} numberOfLines={1}>
                {partnerName}
              </Text>
            </View>
          </View>
        )}

        {!showRatings && (
          <View style={styles.avatarRow}>
            <AvatarCircle initial={creatorName} size={compact ? 32 : 36} />
            <AvatarCircle
              initial={partnerName}
              size={compact ? 32 : 36}
              gradient={['#C084FC', '#9B7EDE']}
            />
          </View>
        )}

        <Text style={styles.footer}>vowfinity.app</Text>
      </LinearGradient>
    </View>
  );
}

export function GradientRatingNumber({ value, size = 48 }) {
  return (
    <MaskedView
      maskElement={
        <Text
          style={[
            styles.gradientNumber,
            { fontSize: size, lineHeight: size * 1.05 },
          ]}
        >
          {value}
        </Text>
      }
    >
      <LinearGradient
        colors={GRADIENTS.primary}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
      >
        <Text
          style={[
            styles.gradientNumber,
            styles.gradientNumberHidden,
            { fontSize: size, lineHeight: size * 1.05 },
          ]}
        >
          {value}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignItems: 'center',
  },
  outerCompact: {
    transform: [{ scale: 0.92 }],
  },
  card: {
    width: '100%',
    aspectRatio: 9 / 14,
    maxHeight: 360,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 24,
    justifyContent: 'space-between',
    shadowColor: COLORS.pink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 12,
  },
  cardCompact: {
    maxHeight: 300,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  brand: {
    fontFamily: FONTS.displayItalic,
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sentence: {
    fontFamily: FONTS.displayItalic,
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 32,
    paddingHorizontal: 4,
    flexShrink: 1,
  },
  sentenceCompact: {
    fontSize: 18,
    lineHeight: 26,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  ratingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 8,
  },
  ratingCol: {
    alignItems: 'center',
    gap: 4,
    minWidth: 72,
  },
  ratingNum: {
    fontFamily: FONTS.displayItalic,
    fontSize: 28,
    color: '#FFFFFF',
    fontStyle: 'italic',
  },
  ratingName: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    maxWidth: 80,
    textAlign: 'center',
  },
  vs: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  footer: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
  gradientNumber: {
    fontFamily: FONTS.displayItalic,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#000000',
  },
  gradientNumberHidden: {
    opacity: 0,
  },
});
