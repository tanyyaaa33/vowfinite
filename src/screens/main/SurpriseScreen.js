import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientButton from '../../components/GradientButton';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import { AuthContext } from '../../../App';
import { saveGameSession } from '../../utils/firebase';
import { notifyPartner, NOTIFICATION_TYPES } from '../../utils/notifications';

const SURPRISES = [
  { id: 1, emoji: '🌹', title: 'Morning Love Note', desc: 'Send a sweet message before they wake up' },
  { id: 2, emoji: '☕', title: 'Coffee Run', desc: 'Surprise them with their favorite drink' },
  { id: 3, emoji: '🎵', title: 'Playlist Drop', desc: 'Curate a playlist just for them' },
  { id: 4, emoji: '📸', title: 'Memory Lane', desc: 'Share your favorite photo together' },
  { id: 5, emoji: '🍳', title: 'Breakfast in Bed', desc: 'Start their day with something special' },
  { id: 6, emoji: '💌', title: 'Hidden Note', desc: 'Leave a love note somewhere unexpected' },
];

const GREETINGS = [
  {
    id: 'morning',
    emoji: '☀️',
    title: 'Good Morning',
    subtitle: 'Start their day with warmth',
    type: NOTIFICATION_TYPES.GOOD_MORNING,
    gradient: ['#FFE8A3', '#FF6B9D'],
  },
  {
    id: 'night',
    emoji: '🌙',
    title: 'Good Night',
    subtitle: 'Send love before they sleep',
    type: NOTIFICATION_TYPES.GOOD_NIGHT,
    gradient: ['#C084FC', '#1A2340'],
  },
];

export default function SurpriseScreen() {
  const { profile, profileLoading } = useContext(AuthContext);
  const [selected, setSelected] = useState(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [greetingLoading, setGreetingLoading] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleSendGreeting = async (greeting) => {
    if (!profile?.coupleId) {
      Alert.alert('Connect first', 'Link with your partner to send greetings.');
      return;
    }

    if (greetingLoading) return;
    setGreetingLoading(greeting.id);

    try {
      await saveGameSession(profile.coupleId, 'greeting', {
        type: greeting.type,
        sentBy: profile.name,
      });

      try {
        await notifyPartner(profile, greeting.type);
      } catch (notifyError) {
        console.warn('Greeting push failed:', notifyError.message);
      }

      if (!isMounted.current) return;

      Alert.alert(
        `${greeting.title} sent! ${greeting.emoji}`,
        `${profile?.partnerName || 'Your partner'} will get a lovely notification from you.`
      );
    } catch (error) {
      if (isMounted.current) {
        Alert.alert('Error', error?.message || 'Could not send greeting.');
      }
    } finally {
      if (isMounted.current) {
        setGreetingLoading(null);
      }
    }
  };

  const handleSend = async () => {
    if (!selected || loading) return;
    const surprise = SURPRISES.find((s) => s.id === selected);
    if (!surprise) return;

    setLoading(true);
    try {
      if (profile?.coupleId) {
        await saveGameSession(profile.coupleId, 'surprise', {
          surpriseId: selected,
          title: surprise.title,
          sentBy: profile.name,
        });
      }

      if (!isMounted.current) return;
      setSent(true);
      Alert.alert(
        'Surprise sent! 💕',
        `Your "${surprise.title}" idea is on its way to ${profile?.partnerName || 'your partner'}.`
      );
    } catch (error) {
      if (isMounted.current) {
        Alert.alert('Error', error?.message || 'Could not send surprise.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  if (profileLoading) {
    return (
      <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingEmoji}>✨</Text>
            <Text style={styles.loadingText}>Loading surprises...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={GRADIENTS.soft} style={styles.gradient}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Surprise</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            Pick a spontaneous idea to delight {profile?.partnerName || 'your partner'}
          </Text>

          <Text style={styles.sectionLabel}>Send a Sweet Moment</Text>
          <View style={styles.greetingRow}>
            {GREETINGS.map((greeting) => {
              const isSending = greetingLoading === greeting.id;
              const isDisabled = greetingLoading !== null;

              return (
                <TouchableOpacity
                  key={greeting.id}
                  onPress={() => handleSendGreeting(greeting)}
                  disabled={isDisabled}
                  activeOpacity={0.88}
                  style={[styles.greetingCard, SHADOWS.card, isDisabled && !isSending && styles.greetingDisabled]}
                >
                  <LinearGradient colors={greeting.gradient} style={styles.greetingGradient}>
                    <Text style={styles.greetingEmoji}>{greeting.emoji}</Text>
                    <Text style={styles.greetingTitle} numberOfLines={1}>
                      {greeting.title}
                    </Text>
                    <Text style={styles.greetingSubtitle} numberOfLines={2}>
                      {greeting.subtitle}
                    </Text>
                    <Text style={styles.greetingCta}>
                      {isSending ? 'Sending...' : 'Tap to send →'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>

          <LinearGradient colors={GRADIENTS.primary} style={[styles.banner, SHADOWS.strong]}>
            <Text style={styles.bannerEmoji}>✨</Text>
            <Text style={styles.bannerText}>Small surprises keep the spark alive</Text>
          </LinearGradient>

          <Text style={styles.sectionLabel}>Surprise Ideas</Text>
          {SURPRISES.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                setSelected(item.id);
                setSent(false);
              }}
              activeOpacity={0.85}
              style={[
                styles.card,
                selected === item.id && styles.cardSelected,
                SHADOWS.card,
              ]}
            >
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.desc}
                </Text>
              </View>
              {selected === item.id && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          ))}

          <GradientButton
            title={sent ? 'Sent!' : 'Send Surprise Idea'}
            onPress={handleSend}
            loading={loading}
            disabled={!selected || sent || loading}
            style={styles.button}
          />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24 },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  loadingText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.textMuted,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 26,
    color: COLORS.navy,
    marginTop: 8,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 18,
    lineHeight: 21,
  },
  sectionLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.navy,
    marginBottom: 10,
  },
  greetingRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  greetingCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  greetingDisabled: {
    opacity: 0.65,
  },
  greetingGradient: {
    padding: 14,
    minHeight: 128,
    justifyContent: 'space-between',
  },
  greetingEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  greetingTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  greetingSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    lineHeight: 15,
  },
  greetingCta: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
  },
  banner: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  bannerEmoji: { fontSize: 28, marginBottom: 6 },
  bannerText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 12,
  },
  cardSelected: {
    borderColor: COLORS.pink,
    backgroundColor: COLORS.screenBg,
  },
  cardEmoji: { fontSize: 28 },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  check: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.pink,
  },
  button: { marginTop: 10 },
});
