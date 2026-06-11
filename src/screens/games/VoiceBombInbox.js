import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import { subscribeToVoiceBombHistory } from '../../utils/voiceBomb';

function formatDate(item) {
  try {
    const ts = item?.createdAt;
    if (!ts) return 'Recent';
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}

export default function VoiceBombInbox({ navigation }) {
  const { profile } = useContext(AuthContext);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!profile?.coupleId) return undefined;
    return subscribeToVoiceBombHistory(profile.coupleId, setItems);
  }, [profile?.coupleId]);

  const openBomb = (item) => {
    const isReply = item.replySenderId && item.replySenderId !== profile?.uid;
    const isMine = item.senderId === profile?.uid;

    if (!isMine && item.senderId !== profile?.uid) {
      navigation.navigate('VoiceBombListen', {
        voiceBombId: item.voiceBombId || item.id,
        audioUrl: item.audioUrl,
        prompt: item.prompt,
        senderName: item.senderName,
        mode: 'message',
      });
      return;
    }

    if (item.status === 'replied' && item.replyAudioUrl) {
      navigation.navigate('VoiceBombListen', {
        voiceBombId: item.voiceBombId || item.id,
        audioUrl: item.replyAudioUrl,
        prompt: item.prompt,
        senderName: profile?.partnerName,
        mode: 'reply',
      });
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Voice Bomb Inbox</Text>
          <View style={styles.spacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {items.length === 0 ? (
            <Text style={styles.empty}>Voice bombs you send and receive live here forever.</Text>
          ) : (
            items.map((item) => {
              const id = item.voiceBombId || item.id;
              const fromPartner = item.senderId !== profile?.uid;
              const unheard = fromPartner && !item.listenedBy;
              const status =
                item.status === 'replied'
                  ? 'Replied'
                  : unheard
                    ? 'New'
                    : fromPartner
                      ? 'Heard'
                      : 'Sent';

              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.card, SHADOWS.card, unheard && styles.cardNew]}
                  onPress={() => openBomb(item)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.cardDate}>{formatDate(item)}</Text>
                  <Text style={styles.cardPrompt} numberOfLines={2}>
                    {item.prompt || 'Voice message'}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {fromPartner ? `${profile?.partnerName || 'Partner'} → you` : 'You → partner'} · {status}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.screenBg },
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
  cardNew: {
    borderColor: COLORS.pink,
  },
  cardDate: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.pink,
    marginBottom: 6,
  },
  cardPrompt: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  cardMeta: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
