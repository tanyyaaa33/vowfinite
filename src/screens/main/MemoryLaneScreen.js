import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import { subscribeToDailyQuestionHistory } from '../../utils/dailyQuestion';
import { subscribeToVoiceBombHistory } from '../../utils/voiceBomb';
import { subscribeToHes10History } from '../../utils/hes10But';
import { subscribeToDareDropHistory } from '../../utils/dareDrop';
import { canRevealAnswers, getUserAnswerFromDoc, getPartnerAnswerFromDoc } from '../../utils/dailyQuestion';
import { useCouple } from '../../hooks/useCouple';
import { parseDateKey } from '../../constants/gameData';

export default function MemoryLaneScreen({ navigation }) {
  const { profile } = useContext(AuthContext);
  const { couple } = useCouple();
  const [daily, setDaily] = useState([]);
  const [voice, setVoice] = useState([]);
  const [hes10, setHes10] = useState([]);
  const [dares, setDares] = useState([]);

  const members = couple?.members || [];

  useEffect(() => {
    if (!profile?.coupleId) return undefined;
    const unsubs = [
      subscribeToDailyQuestionHistory(profile.coupleId, setDaily),
      subscribeToVoiceBombHistory(profile.coupleId, setVoice),
      subscribeToHes10History(profile.coupleId, setHes10),
      subscribeToDareDropHistory(profile.coupleId, setDares),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [profile?.coupleId]);

  const memories = [
    ...daily
      .filter((d) => canRevealAnswers(d, profile?.uid, members))
      .slice(0, 10)
      .map((d) => ({
        id: `dq-${d.dateKey || d.id}`,
        type: 'daily',
        date: d.dateKey || d.id,
        title: d.question,
        subtitle: 'Both answered — tap to relive',
        onPress: () =>
          navigation.navigate('DailyQuestionReveal', {
            question: d.question,
            category: d.category,
            answer: getUserAnswerFromDoc(d, profile?.uid, members),
            partnerAnswer: getPartnerAnswerFromDoc(d, profile?.uid, members),
            dateKey: d.dateKey || d.id,
          }),
      })),
    ...hes10
      .filter((r) => r.partnerRating != null && r.status !== 'cancelled')
      .slice(0, 8)
      .map((r) => ({
        id: `h10-${r.id}`,
        type: 'hes10',
        date: r.id,
        title: r.fullSentence,
        subtitle: `Rated ${r.partnerRating}/10`,
        onPress: () =>
          navigation.navigate('Hesa10ButReveal', {
            roundId: r.id,
            fullSentence: r.fullSentence,
            partnerRating: r.partnerRating,
          }),
      })),
    ...voice.slice(0, 8).map((v) => ({
      id: `vb-${v.id}`,
      type: 'voice',
      date: v.id,
      title: v.prompt || 'Voice bomb',
      subtitle: v.senderId === profile?.uid ? 'You sent' : 'From partner',
      onPress: () => navigation.navigate('VoiceBombInbox'),
    })),
    ...dares
      .filter((d) => d.status === 'completed')
      .slice(0, 8)
      .map((d) => ({
        id: `dare-${d.id}`,
        type: 'dare',
        date: d.id,
        title: d.text,
        subtitle: 'Dare completed',
        onPress: () => navigation.navigate('DareDropComplete'),
      })),
  ].slice(0, 24);

  return (
    <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Memory Lane</Text>
          <Text style={styles.subtitle}>
            Your shared moments — browse anytime, no partner needed online
          </Text>

          <View style={styles.quickRow}>
            <TouchableOpacity
              style={[styles.quickCard, SHADOWS.card]}
              onPress={() => navigation.navigate('DailyQuestionHistory')}
            >
              <Text style={styles.quickEmoji}>💬</Text>
              <Text style={styles.quickLabel}>Questions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickCard, SHADOWS.card]}
              onPress={() => navigation.navigate('VoiceBombInbox')}
            >
              <Text style={styles.quickEmoji}>🎙️</Text>
              <Text style={styles.quickLabel}>Voice bombs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickCard, SHADOWS.card]}
              onPress={() => navigation.navigate('Hes10History')}
            >
              <Text style={styles.quickEmoji}>💅</Text>
              <Text style={styles.quickLabel}>10 But</Text>
            </TouchableOpacity>
          </View>

          {memories.length === 0 ? (
            <Text style={styles.empty}>Play games together — memories will collect here.</Text>
          ) : (
            memories.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.memoryCard, SHADOWS.card]}
                onPress={item.onPress}
                activeOpacity={0.85}
              >
                <Text style={styles.memoryType}>
                  {item.type === 'daily'
                    ? 'Daily Question'
                    : item.type === 'hes10'
                      ? "He's a 10 But"
                      : item.type === 'voice'
                        ? 'Voice Bomb'
                        : 'Dare Drop'}
                </Text>
                <Text style={styles.memoryTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.memorySub}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24 },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: COLORS.navy,
    marginTop: 8,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 20,
    lineHeight: 20,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickEmoji: { fontSize: 24, marginBottom: 6 },
  quickLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  empty: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  memoryCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memoryType: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.pink,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memoryTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  memorySub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
