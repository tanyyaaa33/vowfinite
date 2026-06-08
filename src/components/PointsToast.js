import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { SCREEN_PADDING, CONTENT_MAX_WIDTH } from '../constants/layout';

const DISMISS_MS = 2500;
const NOTIFICATION_DISMISS_MS = 4000;

const PointsToastContext = createContext(null);

export function PointsToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const showPoints = useCallback((points, suffix = '⭐') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ type: 'points', points, suffix, id: Date.now() });
  }, []);

  const showUnlock = useCallback((unlock) => {
    if (!unlock?.title) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ type: 'unlock', unlock, id: Date.now() });
  }, []);

  const showNotification = useCallback((message) => {
    if (!message) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ type: 'notification', message, id: Date.now() });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <PointsToastContext.Provider value={{ showPoints, showUnlock, showNotification }}>
      {children}
      {toast ? (
        <ToastOverlay
          key={toast.id}
          toast={toast}
          onDismiss={hideToast}
          onTimerRef={(id) => { timerRef.current = id; }}
        />
      ) : null}
    </PointsToastContext.Provider>
  );
}

export function usePointsToast() {
  const context = useContext(PointsToastContext);
  if (!context) {
    return { showPoints: () => {}, showUnlock: () => {}, showNotification: () => {} };
  }
  return context;
}

function ToastOverlay({ toast, onDismiss, onTimerRef }) {
  const insets = useSafeAreaInsets();
  const isNotification = toast.type === 'notification';
  const translateY = useSharedValue(isNotification ? -80 : 80);
  const opacity = useSharedValue(0);
  const dismissMs = isNotification ? NOTIFICATION_DISMISS_MS : DISMISS_MS;

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 16, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 200 });

    const exitOffset = isNotification ? -80 : 80;
    const timer = setTimeout(() => {
      translateY.value = withTiming(exitOffset, { duration: 250 });
      opacity.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) runOnJS(onDismiss)();
      });
    }, dismissMs);

    onTimerRef(timer);
    return () => clearTimeout(timer);
  }, [translateY, opacity, onDismiss, onTimerRef, dismissMs, isNotification]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const isUnlock = toast.type === 'unlock' && toast.unlock?.title;
  const unlock = toast.unlock;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        isNotification ? { top: insets.top + 12 } : { bottom: insets.bottom + 24 },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={isNotification ? ['#FFF0F6', '#F9ECFF'] : isUnlock ? ['#C084FC', '#FF6B9D'] : GRADIENTS.primary}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.pill, isNotification && styles.notificationPill]}
      >
        {isNotification ? (
          <>
            <Text style={styles.notificationEmoji}>💕</Text>
            <Text style={styles.notificationText} numberOfLines={3}>
              {toast.message}
            </Text>
          </>
        ) : isUnlock ? (
          <>
            <Text style={styles.unlockEmoji}>{unlock?.emoji || '🎁'}</Text>
            <Text style={styles.text} numberOfLines={2}>
              Unlocked: {unlock.title}
            </Text>
          </>
        ) : (
          <Text style={styles.text}>
            +{toast.points ?? 0} points {toast.suffix ?? '⭐'}
          </Text>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SCREEN_PADDING,
    right: SCREEN_PADDING,
    alignItems: 'center',
    zIndex: 9999,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: CONTENT_MAX_WIDTH,
    shadowColor: COLORS.pink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  text: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  unlockEmoji: {
    fontSize: 20,
  },
  notificationPill: {
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  notificationEmoji: {
    fontSize: 18,
  },
  notificationText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.navy,
    flexShrink: 1,
    lineHeight: 20,
  },
});
