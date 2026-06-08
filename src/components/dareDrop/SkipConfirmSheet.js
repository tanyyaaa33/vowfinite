import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { SCREEN_PADDING } from '../../constants/layout';
import { POINTS, formatPoints } from '../../utils/points';

export default function SkipConfirmSheet({
  visible,
  onCancel,
  onConfirm,
  pointsBalance,
  confirming = false,
}) {
  const translateY = useSharedValue(320);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdrop.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
    } else {
      backdrop.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(320, { duration: 220 });
    }
  }, [visible, backdrop, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={styles.wrap}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        </Animated.View>

        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Skip this dare?</Text>
          <Text style={styles.body}>
            Skipping costs {POINTS.DARE_SKIP_PENALTY} points. You&apos;ll get a fresh dare
            instead.
          </Text>
          <Text style={styles.balance}>
            Current balance: {formatPoints(pointsBalance ?? 0)} pts
          </Text>

          <TouchableOpacity
            style={[styles.confirmBtn, confirming && styles.btnDisabled]}
            onPress={onConfirm}
            disabled={confirming}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmText}>
              {confirming ? 'Skipping...' : `Skip (−${POINTS.DARE_SKIP_PENALTY} pts)`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelBtn, confirming && styles.btnDisabled]}
            onPress={onCancel}
            disabled={confirming}
            activeOpacity={0.85}
          >
            <Text style={styles.cancelText}>Keep this dare</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 12,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  balance: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.pink,
    textAlign: 'center',
    marginBottom: 18,
  },
  confirmBtn: {
    backgroundColor: '#FFF0F6',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  confirmText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.pink,
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.navy,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
