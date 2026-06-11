import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

export default function GuestPreviewBanner() {
  const { isGuest, exitGuestMode } = useContext(AuthContext);

  const goToSignUp = () => {
    exitGuestMode();
  };

  if (!isGuest) return null;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={styles.text}>
          Preview mode — sign up to save progress, pair with your partner, and play for real
        </Text>
        <TouchableOpacity onPress={goToSignUp} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.link}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#FFF0F6',
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF0F6',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  text: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  link: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.pink,
  },
});
