import {
  db,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from './firebase';
import {
  scheduleStreakRiskNotification,
  sendStreakResetNotification,
} from './notifications';

export const ACTIVITIES_REQUIRED = 3;
export const FREEZE_TOKENS_PER_MONTH = 2;

export const POINTS = {
  DAILY_QUESTION: 15,
  WHO_MORE_LIKELY: 10,
  HES10: 10,
  DARE_DROP: 20,
  DARE_SKIP_PENALTY: 5,
  VOICE_BOMB: 30,
  DAILY_STREAK_BONUS: 5,
  PARTNER_SYNC: 10,
};

export const UNLOCKS = [
  {
    id: 'personality_type',
    points: 100,
    title: 'Personality Type',
    description: 'Discover your couple personality together',
    emoji: '🧠',
  },
  {
    id: 'time_capsule',
    points: 250,
    title: 'Time Capsule',
    description: 'Seal memories to open on a future date',
    emoji: '⏳',
  },
  {
    id: 'premium_week',
    points: 500,
    title: 'Premium Week',
    description: 'One week of premium features unlocked',
    emoji: '👑',
  },
  {
    id: 'exclusive_badge',
    points: 1000,
    title: 'Exclusive Badge',
    description: 'A rare badge only soulmates earn',
    emoji: '💎',
  },
];

export const MILESTONE_DAYS = [7, 30, 100];

export const MILESTONE_COPY = {
  7: {
    emoji: '🌟',
    title: '7 Day Streak!',
    subtitle: 'One full week of showing up for each other',
  },
  30: {
    emoji: '🔥',
    title: '30 Day Streak!',
    subtitle: 'A whole month of love, laughter, and connection',
  },
  100: {
    emoji: '💫',
    title: '100 Day Streak!',
    subtitle: 'Legendary devotion — you two are unstoppable',
  },
};

export function getDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function daysBetween(dateKeyA, dateKeyB) {
  const a = new Date(`${dateKeyA}T12:00:00`);
  const b = new Date(`${dateKeyB}T12:00:00`);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function getStreakCount(couple) {
  if (!couple) return 0;
  return couple.currentStreak ?? couple.streak ?? 0;
}

export function getFreezeTokens(couple) {
  return couple?.freezeTokens ?? 0;
}

export function hasUnlock(couple, unlockId) {
  return (couple?.unlocks || []).includes(unlockId);
}

export function getUnlockedFeatures(couple) {
  const earned = couple?.unlocks || [];
  return UNLOCKS.filter((u) => earned.includes(u.id));
}

export function getNextUnlock(couple) {
  const points = couple?.points ?? 0;
  return UNLOCKS.find((u) => points < u.points) || null;
}

export function checkNewUnlocks(oldPoints, newPoints) {
  return UNLOCKS.filter((u) => oldPoints < u.points && newPoints >= u.points);
}

export function calculateStreakBonus(streakDays) {
  if (streakDays <= 0) return 0;
  if (streakDays >= 30) return 50;
  if (streakDays >= 14) return 25;
  if (streakDays >= 7) return 15;
  return POINTS.DAILY_STREAK_BONUS;
}

export function getLevel(points) {
  if (points >= 500) return { level: 5, title: 'Soulmates', nextAt: null };
  if (points >= 300) return { level: 4, title: 'In Sync', nextAt: 500 };
  if (points >= 150) return { level: 3, title: 'Connected', nextAt: 300 };
  if (points >= 50) return { level: 2, title: 'Growing', nextAt: 150 };
  return { level: 1, title: 'New Love', nextAt: 50 };
}

export function getProgressToNextLevel(points) {
  const { nextAt } = getLevel(points);
  if (!nextAt) return 1;
  const prevThreshold = points >= 300 ? 300 : points >= 150 ? 150 : points >= 50 ? 50 : 0;
  return (points - prevThreshold) / (nextAt - prevThreshold);
}

export function formatPoints(points) {
  return (points ?? 0).toLocaleString();
}

async function fetchCouple(coupleId) {
  const ref = doc(db, 'couples', coupleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Couple not found');
  }
  return { ref, data: snap.data() };
}

async function logPointsEvent(coupleId, points, action, totalPoints) {
  try {
    await addDoc(collection(db, 'couples', coupleId, 'pointsLog'), {
      points,
      action,
      totalPoints,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('logPointsEvent failed:', error.message);
  }
}

export async function replenishFreezeTokens(coupleId, existingData = null) {
  try {
    const monthKey = getMonthKey();
    const { ref, data } = existingData
      ? { ref: doc(db, 'couples', coupleId), data: existingData }
      : await fetchCouple(coupleId);

    if (data.freezeTokensMonth === monthKey) {
      return data.freezeTokens ?? 0;
    }

    await updateDoc(ref, {
      freezeTokens: FREEZE_TOKENS_PER_MONTH,
      freezeTokensMonth: monthKey,
    });
    return FREEZE_TOKENS_PER_MONTH;
  } catch (error) {
    console.warn('replenishFreezeTokens failed:', error.message);
    throw error;
  }
}

export async function addPoints(coupleId, points, action) {
  try {
    if (!coupleId || points <= 0) {
      return { newPoints: 0, newUnlocks: [] };
    }

    const { ref, data } = await fetchCouple(coupleId);
    const oldPoints = data.points ?? 0;
    const newPoints = oldPoints + points;
    const existingUnlocks = data.unlocks || [];
    const crossedUnlocks = checkNewUnlocks(oldPoints, newPoints);
    const newUnlockIds = crossedUnlocks
      .map((u) => u.id)
      .filter((id) => !existingUnlocks.includes(id));

    const updates = {
      points: newPoints,
      totalPoints: newPoints,
    };

    if (newUnlockIds.length > 0) {
      updates.unlocks = [...existingUnlocks, ...newUnlockIds];
    }

    await updateDoc(ref, updates);
    await logPointsEvent(coupleId, points, action, newPoints);

    const newUnlocks = crossedUnlocks.filter((u) => newUnlockIds.includes(u.id));
    return { oldPoints, newPoints, newUnlocks, action };
  } catch (error) {
    console.warn('addPoints failed:', error.message);
    throw error;
  }
}

export async function incrementActivity(coupleId) {
  try {
    const today = getDateKey();
    const { ref, data } = await fetchCouple(coupleId);

    await replenishFreezeTokens(coupleId, data);

    const lastActivityDate = data.lastActivityDate || today;
    let activitiesToday = data.activitiesToday ?? 0;

    if (lastActivityDate === today) {
      activitiesToday += 1;
    } else {
      activitiesToday = 1;
    }

    await updateDoc(ref, {
      activitiesToday,
      lastActivityDate: today,
    });

    const streak = getStreakCount(data);
    try {
      await scheduleStreakRiskNotification(streak, activitiesToday);
    } catch (notifError) {
      console.warn('Streak notification schedule failed:', notifError.message);
    }

    return { activitiesToday, streak };
  } catch (error) {
    console.warn('incrementActivity failed:', error.message);
    throw error;
  }
}

export async function checkStreak(coupleId) {
  try {
    const today = getDateKey();
    const { ref, data } = await fetchCouple(coupleId);

    await replenishFreezeTokens(coupleId, data);

    const lastCheck = data.lastStreakCheckDate || data.lastActivityDate || today;

    if (lastCheck === today) {
      return {
        currentStreak: getStreakCount(data),
        activitiesToday: data.activitiesToday ?? 0,
        streakReset: false,
        pendingMilestone: data.pendingMilestone ?? null,
        freezeTokens: data.freezeTokens ?? 0,
      };
    }

    const gap = daysBetween(lastCheck, today);
    let currentStreak = getStreakCount(data);
    let longestStreak = data.longestStreak ?? currentStreak;
    const activitiesYesterday = data.activitiesToday ?? 0;
    const streakProtected = data.streakProtectedDate === lastCheck;
    let streakReset = false;
    let pendingMilestone = data.pendingMilestone ?? null;

    if (gap === 1) {
      if (activitiesYesterday >= ACTIVITIES_REQUIRED || streakProtected) {
        currentStreak += 1;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
        if (MILESTONE_DAYS.includes(currentStreak)) {
          pendingMilestone = currentStreak;
        }
      } else {
        currentStreak = 0;
        streakReset = true;
      }
    } else if (gap > 1) {
      currentStreak = 0;
      streakReset = true;
    }

    await updateDoc(ref, {
      currentStreak,
      streak: currentStreak,
      longestStreak,
      activitiesToday: 0,
      lastStreakCheckDate: today,
      streakProtectedDate: null,
      pendingMilestone,
    });

    if (streakReset) {
      try {
        await sendStreakResetNotification();
      } catch (notifError) {
        console.warn('Streak reset notification failed:', notifError.message);
      }
    }

    try {
      await scheduleStreakRiskNotification(currentStreak, 0);
    } catch (notifError) {
      console.warn('Streak notification schedule failed:', notifError.message);
    }

    return {
      currentStreak,
      longestStreak,
      activitiesToday: 0,
      streakReset,
      pendingMilestone,
      freezeTokens: data.freezeTokens ?? 0,
    };
  } catch (error) {
    console.warn('checkStreak failed:', error.message);
    throw error;
  }
}

export async function useFreeze(coupleId) {
  try {
    const today = getDateKey();
    const { ref, data } = await fetchCouple(coupleId);

    await replenishFreezeTokens(coupleId, data);

    const tokens = data.freezeTokens ?? 0;
    const activitiesToday = data.activitiesToday ?? 0;
    const currentStreak = getStreakCount(data);

    if (tokens <= 0) {
      throw new Error('No freeze tokens left this month.');
    }

    if (activitiesToday >= ACTIVITIES_REQUIRED) {
      throw new Error('You already completed today\'s activities!');
    }

    if (currentStreak <= 0) {
      throw new Error('Start a streak before using a freeze.');
    }

    if (data.streakProtectedDate === today) {
      throw new Error('Streak is already protected for today.');
    }

    await updateDoc(ref, {
      freezeTokens: tokens - 1,
      streakProtectedDate: today,
    });

    try {
      await scheduleStreakRiskNotification(currentStreak, activitiesToday);
    } catch (notifError) {
      console.warn('Streak notification schedule failed:', notifError.message);
    }

    return {
      freezeTokens: tokens - 1,
      streakProtectedDate: today,
    };
  } catch (error) {
    console.warn('useFreeze failed:', error.message);
    throw error;
  }
}

export async function clearPendingMilestone(coupleId) {
  try {
    await updateDoc(doc(db, 'couples', coupleId), {
      pendingMilestone: null,
    });
  } catch (error) {
    console.warn('clearPendingMilestone failed:', error.message);
    throw error;
  }
}

export async function deductPoints(coupleId, points, action) {
  try {
    if (!coupleId || points <= 0) {
      return { newPoints: 0 };
    }

    const { ref, data } = await fetchCouple(coupleId);
    const oldPoints = data.points ?? 0;
    const newPoints = Math.max(0, oldPoints - points);

    await updateDoc(ref, {
      points: newPoints,
      totalPoints: newPoints,
    });
    await logPointsEvent(coupleId, -points, action, newPoints);

    return { oldPoints, newPoints, action };
  } catch (error) {
    console.warn('deductPoints failed:', error.message);
    throw error;
  }
}

export async function completeGameActivity(coupleId, points, action) {
  try {
    await incrementActivity(coupleId);
    const pointsResult = await addPoints(coupleId, points, action);
    return pointsResult;
  } catch (error) {
    console.warn('completeGameActivity failed:', error.message);
    throw error;
  }
}
