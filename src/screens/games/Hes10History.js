import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../../context/AuthContext';
import GradientButton from '../../components/GradientButton';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import {
  subscribeToHes10History,
  cancelHes10Round,
  formatRoundDate,
} from '../../utils/hes10But';

export default function Hes10History({ navigation }) {
  const { profile } = useContext(AuthContext);
  const [rounds, setRounds] = useState([]);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    if (!profile?.coupleId) return undefined;
    return subscribeToHes10History(profile.coupleId, setRounds);
  }, [profile?.coupleId]);

  const handleCancel = (round) => {
    Alert.alert('Cancel this round?', 'Your partner will no longer see it to rate.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel round',
        style: 'destructive',
        onPress: async () => {
          setCancelling(round.id);
          try {
            await cancelHes10Round(profile.coupleId, round.id, profile.uid);
          } catch (error) {
            Alert.alert('Could not cancel', error?.message);
          } finally {
            setCancelling(null);
          }
        },
      },
    ]);
  };

  const openRound = (round) => {
    if (round.status === 'rated' || round.partnerRating != null) {
      navigation.navigate('Hesa10ButReveal', {
        roundId: round.id,
        fullSentence: round.fullSentence,
        partnerRating: round.partnerRating,
      });
      return;
    }
    if (round.creatorId !== profile?.uid && round.status === 'awaiting_rating') {
      navigation.navigate('Hesa10ButRate', {
        roundId: round.id,
        prompt: round.fullSentence,
      });
    }
  };

  const active = rounds.filter((r) => r.status !== 'cancelled');

  return (
    <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>10 But History</Text>
          <View style={styles.spacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {active.length === 0 ? (
            <Text style={styles.empty}>Sent and rated rounds appear here.</Text>
          ) : (
            active.map((round) => {
              const isCreator = round.creatorId === profile?.uid;
              const awaiting = round.status === 'awaiting_rating' && round.partnerRating == null;
              const rated = round.partnerRating != null;

              return (
                <View key={round.id} style={[styles.card, SHADOWS.card]}>
                  <Text style={styles.date}>{formatRoundDate(round)}</Text>
                  <Text style={styles.sentence} numberOfLines={3}>
                    {round.fullSentence}
                  </Text>
                  <Text style={styles.status}>
                    {rated
                      ? `Score: ${round.partnerRating}/10`
                      : isCreator
                        ? 'Waiting for partner to rate'
                        : 'Tap to rate'}
                  </Text>
                  <View style={styles.actions}>
                    {(rated || (!isCreator && awaiting)) && (
                      <GradientButton
                        title={rated ? 'View score' : 'Rate now'}
                        onPress={() => openRound(round)}
                      />
                    )}
                    {isCreator && awaiting && (
                      <TouchableOpacity
                        onPress={() => handleCancel(round)}
                        disabled={cancelling === round.id}
                        style={styles.cancelBtn}
                      >
                        <Text style={styles.cancelText}>
                          {cancelling === round.id ? 'Cancelling...' : 'Cancel round'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 24, color: COLORS.navy },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.display,
    fontSize: 22,
    color: COLORS.navy,
  },
  spacer: { width: 32 },
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24 },
  empty: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  date: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.pink,
    marginBottom: 8,
  },
  sentence: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
    marginBottom: 8,
  },
  status: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  actions: { gap: 8 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textMuted,
  },
});
