import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getDateKey } from '../utils/points';

const SCREEN_W = Math.min(Dimensions.get('window').width, 390);
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function toDateKey(year, month, day) {
  return getDateKey(new Date(year, month, day));
}

function buildMonthCells(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export default function StreakCalendarModal({
  visible,
  onClose,
  streakDates = new Set(),
  currentStreak = 0,
}) {
  const todayKey = getDateKey();
  const [viewDate, setViewDate] = useState(() => new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const monthStreakCount = useMemo(() => {
    let count = 0;
    streakDates.forEach((dateKey) => {
      const [y, m] = dateKey.split('-').map(Number);
      if (y === year && m === month + 1) count += 1;
    });
    return count;
  }, [streakDates, year, month]);

  const shiftMonth = (delta) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Streak Calendar</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryEmoji}>💗</Text>
            <Text style={styles.summaryText}>
              {currentStreak} day streak · {monthStreakCount} heart
              {monthStreakCount === 1 ? '' : 's'} this month
            </Text>
          </View>

          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.navBtn}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTHS[month]} {year}
            </Text>
            <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.navBtn}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((label, index) => (
              <Text key={`weekday-${index}`} style={styles.weekday}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, index) => {
              if (!day) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }

              const dateKey = toDateKey(year, month, day);
              const isStreakDay = streakDates.has(dateKey);
              const isToday = dateKey === todayKey;

              return (
                <View key={dateKey} style={styles.dayCell}>
                  {isStreakDay ? (
                    <LinearGradient
                      colors={GRADIENTS.primary}
                      style={[styles.streakDay, isToday && styles.todayRing]}
                    >
                      <Text style={styles.streakHeart}>♥</Text>
                      <Text style={styles.streakDayNum}>{day}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.plainDay, isToday && styles.todayOutline]}>
                      <Text style={[styles.dayNum, isToday && styles.todayNum]}>{day}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <LinearGradient colors={GRADIENTS.primary} style={styles.legendSwatch}>
                <Text style={styles.legendHeart}>♥</Text>
              </LinearGradient>
              <Text style={styles.legendLabel}>Streak maintained</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, styles.legendToday]}>
                <Text style={styles.legendTodayNum}>12</Text>
              </View>
              <Text style={styles.legendLabel}>Today</Text>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 35, 64, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: SCREEN_W - 40,
    maxWidth: 360,
    backgroundColor: COLORS.cardBg,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontFamily: FONTS.displayItalic,
    fontSize: 22,
    color: COLORS.navy,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  summaryEmoji: {
    fontSize: 18,
  },
  summaryText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {
    fontFamily: FONTS.semiBold,
    fontSize: 22,
    color: COLORS.pink,
    lineHeight: 24,
  },
  monthLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plainDay: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayOutline: {
    borderWidth: 1.5,
    borderColor: COLORS.purple,
  },
  dayNum: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  todayNum: {
    color: COLORS.purple,
    fontFamily: FONTS.semiBold,
  },
  streakDay: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayRing: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  streakHeart: {
    position: 'absolute',
    top: 4,
    fontSize: 9,
    color: 'rgba(255,255,255,0.95)',
  },
  streakDayNum: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 6,
  },
  legend: {
    marginTop: 14,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendHeart: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  legendToday: {
    backgroundColor: COLORS.screenBg,
    borderWidth: 1.5,
    borderColor: COLORS.purple,
  },
  legendTodayNum: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.purple,
  },
  legendLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
