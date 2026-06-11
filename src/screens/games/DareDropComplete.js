import React, { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import GradientButton from '../../components/GradientButton';
import AnimatedCheckmark from '../../components/dareDrop/AnimatedCheckmark';
import HeartBurst from '../../components/dareDrop/HeartBurst';
import DareDropLoader from '../../components/dareDrop/DareDropLoader';
import { usePointsToast } from '../../components/PointsToast';
import { useGameCompletion } from '../../hooks/useGameCompletion';
import { useCouple } from '../../hooks/useCouple';
import { COLORS, SHADOWS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING, CONTENT_MAX_WIDTH } from '../../constants/layout';
import { saveGameSession } from '../../utils/firebase';
import { notifyPartner, NOTIFICATION_TYPES } from '../../utils/notifications';
import { POINTS } from '../../utils/points';
import {
  subscribeToDareDrop,
  subscribeToDareDropHistory,
  completeDareDrop,
  findCompletedDares,
  formatDareDate,
  getCategoryColor,
  normalizeDareParam,
} from '../../utils/dareDrop';

export default function DareDropComplete({ route, navigation }) {
  const { profile } = useContext(AuthContext);
  const { loading: coupleLoading } = useCouple();
  const { showPoints } = usePointsToast();
  const { completeGame } = useGameCompletion();

  const { dareDropId, dare: paramDare } = route.params || {};
  const normalizedParam = useMemo(() => normalizeDareParam(paramDare), [paramDare]);

  const [ready, setReady] = useState(false);
  const [recordReady, setRecordReady] = useState(false);
  const [record, setRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('current');
  const [completing, setCompleting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const pointsAwarded = useRef(false);
  const isMounted = useRef(true);
  const navigatedRef = useRef(false);
  const navigateTimerRef = useRef(null);

  const dare = useMemo(() => {
    const category = record?.category || normalizedParam?.category || 'Today';
    return {
      text: record?.text || normalizedParam?.text || '',
      category,
      timeEstimate: record?.timeEstimate || normalizedParam?.timeEstimate || '10 min',
      categoryColor:
        record?.categoryColor ||
        normalizedParam?.categoryColor ||
        getCategoryColor(category),
    };
  }, [record, normalizedParam]);

  const hasDareContent = Boolean(dare.text);
  const isValid = Boolean(dareDropId && hasDareContent);
  const partnerName = profile?.partnerName || 'Your partner';
  const isCompleted = record?.status === 'completed';

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (navigateTimerRef.current) {
        clearTimeout(navigateTimerRef.current);
        navigateTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMounted.current) setReady(true);
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!profile?.coupleId || !dareDropId) {
      setRecordReady(true);
      return undefined;
    }

    let active = true;

    const unsubscribe = subscribeToDareDrop(
      profile.coupleId,
      dareDropId,
      (doc) => {
        if (!active || !isMounted.current) return;
        try {
          setRecord(doc);
          setRecordReady(true);
        } catch (error) {
          console.warn('Complete record handler failed:', error.message);
          setRecordReady(true);
        }
      },
      (error) => {
        console.warn('Complete record listener failed:', error?.message);
        if (active && isMounted.current) setRecordReady(true);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [profile?.coupleId, dareDropId]);

  useEffect(() => {
    if (!profile?.coupleId) {
      return undefined;
    }

    let active = true;

    const unsubscribe = subscribeToDareDropHistory(
      profile.coupleId,
      (items) => {
        if (!active || !isMounted.current) return;
        try {
          setHistory(Array.isArray(items) ? items : []);
        } catch (error) {
          console.warn('Complete history handler failed:', error.message);
        }
      },
      (error) => {
        console.warn('Complete history listener failed:', error?.message);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [profile?.coupleId]);

  useEffect(() => {
    if (!ready || !recordReady) return undefined;
    if (!dareDropId || !hasDareContent) {
      try {
        navigation.goBack();
      } catch (error) {
        console.warn('Complete goBack failed:', error.message);
      }
    }
    return undefined;
  }, [ready, recordReady, dareDropId, hasDareContent, navigation]);

  const navigateToReaction = useCallback(() => {
    if (navigatedRef.current || !dareDropId) return;
    navigatedRef.current = true;
    try {
      navigation.replace('DareDropReaction', {
        dareDropId,
        dare,
      });
    } catch (error) {
      navigatedRef.current = false;
      console.warn('Navigate to reaction failed:', error.message);
    }
  }, [navigation, dareDropId, dare.text, dare.category, dare.timeEstimate, dare.categoryColor]);

  const handleMarkDone = async () => {
    if (completing || isCompleted) return;

    if (!profile?.coupleId || !profile?.uid || !dareDropId) {
      return;
    }

    setCompleting(true);
    setCelebrating(true);

    try {
      await completeDareDrop(profile.coupleId, dareDropId, profile.uid);

      if (!pointsAwarded.current) {
        pointsAwarded.current = true;
        try {
          await completeGame(
            POINTS.DARE_DROP,
            'dare-drop',
            '✨',
            `dare-drop_${dareDropId}`
          );
        } catch (pointsError) {
          console.warn('Dare points failed:', pointsError.message);
          if (isMounted.current) {
            showPoints(POINTS.DARE_DROP, '✨');
          }
        }
      }

      try {
        await saveGameSession(profile.coupleId, 'dare-drop', {
          stage: 'completed',
          dareDropId,
          userId: profile.uid,
          text: dare.text,
        });
      } catch (sessionError) {
        console.warn('saveGameSession failed:', sessionError.message);
      }

      try {
        await notifyPartner(profile, NOTIFICATION_TYPES.DARE_COMPLETED, {
          dare: {
            text: dare.text,
            category: dare.category,
            categoryColor: dare.categoryColor,
          },
          dareDropId,
        });
      } catch (notifyError) {
        console.warn('Partner notification failed:', notifyError.message);
      }

      if (!isMounted.current) return;

      if (navigateTimerRef.current) {
        clearTimeout(navigateTimerRef.current);
      }
      navigateTimerRef.current = setTimeout(() => {
        navigateTimerRef.current = null;
        if (isMounted.current) {
          navigateToReaction();
        }
      }, 1500);
    } catch (error) {
      if (isMounted.current) {
        setCelebrating(false);
        Alert.alert('Error', error?.message || 'Could not mark dare as done.');
      }
    } finally {
      if (isMounted.current) {
        setCompleting(false);
      }
    }
  };

  const completedHistory = findCompletedDares(history, profile?.uid);

  const waitingForRecord =
    Boolean(profile?.coupleId && dareDropId && !hasDareContent && !recordReady);

  const screenLoading = !ready || coupleLoading || waitingForRecord;

  if (screenLoading || !isValid) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <DareDropLoader />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.orbPink} pointerEvents="none" />
      <View style={styles.orbPurple} pointerEvents="none" />
      <HeartBurst active={celebrating} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <AnimatedCheckmark size={80} />

          <Text style={styles.title} numberOfLines={2}>
            {isCompleted ? 'Dare complete ✨' : 'Your dare awaits'}
          </Text>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'current' && styles.tabActive]}
              onPress={() => setActiveTab('current')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'current' && styles.tabTextActive,
                ]}
              >
                Current
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'history' && styles.tabActive]}
              onPress={() => setActiveTab('history')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'history' && styles.tabTextActive,
                ]}
              >
                History
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'current' ? (
            <>
              <View style={[styles.dareCard, SHADOWS.card]}>
                <View
                  style={[
                    styles.categoryPill,
                    { backgroundColor: `${dare.categoryColor}22` },
                  ]}
                >
                  <Text style={[styles.categoryText, { color: dare.categoryColor }]}>
                    {dare.category}
                  </Text>
                </View>
                <Text style={styles.dareText} numberOfLines={5}>
                  {dare.text}
                </Text>
                <Text style={styles.timeText}>⏱ {dare.timeEstimate}</Text>
              </View>

              {!isCompleted && (
                <>
                  <GradientButton
                    title={completing ? 'Saving...' : 'Mark as Done ✓'}
                    onPress={handleMarkDone}
                    loading={completing}
                    disabled={completing}
                    style={styles.doneBtn}
                  />

                  <View style={styles.partnerPreview}>
                    <Text style={styles.partnerPreviewText} numberOfLines={3}>
                      {partnerName} will get notified that you did something for
                      them 💝
                    </Text>
                  </View>
                </>
              )}

              {isCompleted && (
                <GradientButton
                  title="View Partner Reaction"
                  onPress={navigateToReaction}
                  style={styles.doneBtn}
                />
              )}
            </>
          ) : (
            <View style={styles.historySection}>
              {completedHistory.length === 0 ? (
                <Text style={styles.emptyHistory}>
                  Completed dares will show up here with your partner&apos;s reaction.
                </Text>
              ) : (
                completedHistory.map((item) => (
                  <View key={item.id} style={[styles.historyCard, SHADOWS.card]}>
                    <Text style={styles.historyDate}>{formatDareDate(item)}</Text>
                    <Text style={styles.historyText} numberOfLines={3}>
                      {item.text}
                    </Text>
                    <Text style={styles.historyReaction}>
                      {item.partnerReaction
                        ? `Partner reacted ${item.partnerReaction}`
                        : 'Waiting for partner reaction'}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          <GradientButton
            title="Back to Games"
            onPress={() => {
              try {
                navigation.popToTop();
              } catch (error) {
                try {
                  navigation.goBack();
                } catch (goBackError) {
                  console.warn('Navigation failed:', goBackError.message);
                }
              }
            }}
            style={styles.backBtn}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
  },
  orbPink: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.pink,
    opacity: 0.1,
  },
  orbPurple: {
    position: 'absolute',
    bottom: 80,
    left: -35,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.purple,
    opacity: 0.08,
  },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 12,
    paddingBottom: 24,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  title: {
    fontFamily: FONTS.displayItalic,
    fontSize: 21,
    color: COLORS.navy,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#FFF0F6',
  },
  tabText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    fontFamily: FONTS.semiBold,
    color: COLORS.pink,
  },
  dareCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  categoryText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
  },
  dareText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.textPrimary,
    lineHeight: 25,
    marginBottom: 10,
  },
  timeText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  doneBtn: {
    marginBottom: 14,
  },
  partnerPreview: {
    backgroundColor: '#FFF0F6',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  partnerPreviewText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 21,
  },
  historySection: {
    marginBottom: 16,
  },
  emptyHistory: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  historyCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyDate: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.pink,
    marginBottom: 4,
  },
  historyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 21,
    marginBottom: 6,
  },
  historyReaction: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.purple,
  },
  backBtn: {
    marginTop: 4,
  },
});
