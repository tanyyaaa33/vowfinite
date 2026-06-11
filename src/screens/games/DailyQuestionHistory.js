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
import { getDateKey } from '../../utils/points';
import {
  subscribeToDailyQuestionHistory,
  hasUserAnswered,
  canRevealAnswers,
  getUserAnswerFromDoc,
  getPartnerAnswerFromDoc,
  getMissedDateKeys,
} from '../../utils/dailyQuestion';
import { useCouple } from '../../hooks/useCouple';
import { parseDateKey } from '../../constants/gameData';

function formatDateKey(dateKey) {
  try {
    const d = parseDateKey(dateKey);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateKey;
  }
}

export default function DailyQuestionHistory({ navigation }) {
  const { profile } = useContext(AuthContext);
  const { couple } = useCouple();
  const [items, setItems] = useState([]);
  const members = couple?.members || [];

  useEffect(() => {
    if (!profile?.coupleId) return undefined;
    return subscribeToDailyQuestionHistory(profile.coupleId, setItems);
  }, [profile?.coupleId]);

  const missed = getMissedDateKeys(items, profile?.uid, members, 7);
  const todayKey = getDateKey();

  const openDay = (dateKey, mode = 'answer') => {
    if (mode === 'reveal') {
      const doc = items.find((i) => i.dateKey === dateKey || i.id === dateKey);
      navigation.navigate('DailyQuestionReveal', {
        question: doc?.question,
        category: doc?.category,
        answer: getUserAnswerFromDoc(doc, profile?.uid, members),
        partnerAnswer: getPartnerAnswerFromDoc(doc, profile?.uid, members),
        dateKey,
      });
      return;
    }
    navigation.navigate('DailyQuestionAnswer', { dateKey });
  };

  return (
    <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Question History</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {missed.length > 0 && (
            <View style={[styles.section, SHADOWS.card]}>
              <Text style={styles.sectionTitle}>Catch up</Text>
              <Text style={styles.sectionHint}>Missed days — answer anytime, no expiry</Text>
              {missed.map((dateKey) => (
                <TouchableOpacity
                  key={dateKey}
                  style={styles.row}
                  onPress={() => openDay(dateKey, 'answer')}
                >
                  <Text style={styles.rowDate}>{formatDateKey(dateKey)}</Text>
                  <Text style={styles.rowAction}>Answer now →</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={[styles.section, SHADOWS.card]}>
            <Text style={styles.sectionTitle}>Past answers</Text>
            {items.length === 0 ? (
              <Text style={styles.empty}>Your shared answers will appear here.</Text>
            ) : (
              items.map((item) => {
                const dateKey = item.dateKey || item.id;
                const answered = hasUserAnswered(item, profile?.uid, members);
                const reveal = canRevealAnswers(item, profile?.uid, members);
                const isToday = dateKey === todayKey;

                return (
                  <TouchableOpacity
                    key={dateKey}
                    style={styles.row}
                    onPress={() => {
                      if (reveal) openDay(dateKey, 'reveal');
                      else if (!answered) openDay(dateKey, 'answer');
                    }}
                    disabled={answered && !reveal}
                  >
                    <View style={styles.rowText}>
                      <Text style={styles.rowDate}>
                        {formatDateKey(dateKey)}{isToday ? ' · Today' : ''}
                      </Text>
                      <Text style={styles.rowQuestion} numberOfLines={2}>
                        {item.question || 'Daily question'}
                      </Text>
                    </View>
                    <Text style={styles.rowBadge}>
                      {reveal ? 'View' : answered ? 'Waiting' : 'Answer'}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
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
  backBtn: { padding: 4, marginRight: 8 },
  backArrow: { fontSize: 24, color: COLORS.navy },
  title: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 22,
    color: COLORS.navy,
    textAlign: 'center',
  },
  headerSpacer: { width: 32 },
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24 },
  section: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sectionHint: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  empty: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowDate: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.pink,
    marginBottom: 2,
  },
  rowQuestion: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  rowAction: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.purple,
  },
  rowBadge: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
