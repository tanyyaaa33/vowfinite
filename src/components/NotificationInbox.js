import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import {
  subscribeToNotifications,
  markNotificationRead,
} from '../utils/firebase';

function formatTime(item) {
  try {
    const ts = item?.createdAt;
    if (!ts) return '';
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function NotificationInbox({ visible, onClose }) {
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!visible || !user?.uid) return undefined;

    const unsubscribe = subscribeToNotifications(user.uid, setItems);
    return unsubscribe;
  }, [visible, user?.uid]);

  const unreadCount = items.filter((item) => !item.read).length;

  const handleOpen = async (item) => {
    if (!item.read && user?.uid) {
      await markNotificationRead(user.uid, item.id);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.badge}>{unreadCount} new</Text>
            )}
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {items.length === 0 ? (
              <Text style={styles.empty}>No notifications yet.</Text>
            ) : (
              items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.row, !item.read && styles.rowUnread]}
                  onPress={() => handleOpen(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title || 'VowFinity'}
                  </Text>
                  <Text style={styles.rowBody} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={styles.rowTime}>{formatTime(item)}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  badge: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.pink,
  },
  close: {
    fontSize: 18,
    color: COLORS.textMuted,
    paddingLeft: 8,
  },
  list: {
    padding: 16,
  },
  empty: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  row: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.screenBg,
    marginBottom: 10,
  },
  rowUnread: {
    borderWidth: 1,
    borderColor: COLORS.pink,
  },
  rowTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  rowBody: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  rowTime: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },
});
