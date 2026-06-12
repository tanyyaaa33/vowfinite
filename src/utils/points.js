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
  VOICE_BOMB: 20,
  VOICE_BOMB_REPLY: 10,
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

export const STREAK_ACTIVITY_ACTIONS = [
  'daily-question',
  'who-more-likely',
  'hes-a-10-but',
  'dare-drop',
  'voice-bomb',
];

function isTimestampIdFromToday(id, todayKey = getDateKey()) {
  const ts = parseInt(String(id).split('_')[0], 10);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  return getDateKey(new Date(ts)) === todayKey;
}

function isStreakClaimKeyFromToday(key, action, todayKey = getDateKey()) {
  const suffix = key.slice(`${action}_`.length);
  if (/^\d{4}-\d{2}-\d{2}$/.test(suffix)) {
    return suffix === todayKey;
  }
  return isTimestampIdFromToday(suffix, todayKey);
}

export function getStreakActivityActionsToday(couple, todayKey = getDateKey()) {
  const claimed = couple?.pointsClaimed;
  if (!claimed || typeof claimed !== 'object') {
    return [];
  }

  const actions = new Set();

  for (const [key, value] of Object.entries(claimed)) {
    if (!value || key.startsWith('partner-sync_')) continue;

    const action = STREAK_ACTIVITY_ACTIONS.find((name) => key.startsWith(`${name}_`));
    if (!action || !isStreakClaimKeyFromToday(key, action, todayKey)) continue;

    actions.add(action);
  }

  return [...actions];
}

export function getDisplayActivitiesToday(couple) {
  return Math.min(getEffectiveActivitiesToday(couple), ACTIVITIES_REQUIRED);
}

export async function reconcileActivitiesToday(coupleId, coupleData = null) {
  try {
    if (!coupleId) return 0;

    const today = getDateKey();
    const { ref, data } = coupleData
      ? { ref: doc(db, 'couples', coupleId), data: coupleData }
      : await fetchCouple(coupleId);

    const claimedCount = getStreakActivityActionsToday(data, today).length;
    const cappedCount = Math.min(claimedCount, ACTIVITIES_REQUIRED);
    const counterToday =
      data?.lastActivityDate === today ? (data?.activitiesToday ?? 0) : 0;
    const effectiveCount = Math.min(Math.max(claimedCount, counterToday), ACTIVITIES_REQUIRED);
    const updates = {};

    if (claimedCount > 0) {
      if (data.lastActivityDate !== today) {
        updates.lastActivityDate = today;
      }
      if ((data.activitiesToday ?? 0) !== cappedCount) {
        updates.activitiesToday = cappedCount;
      }
    } else if (data.lastActivityDate !== today && (data.activitiesToday ?? 0) !== 0) {
      updates.activitiesToday = 0;
    } else if (data.lastActivityDate === today && (data.activitiesToday ?? 0) !== cappedCount) {
      updates.activitiesToday = cappedCount;
    }

    const merged = { ...data, ...updates };
    const streakUpdates = buildStreakGoalUpdates(merged, today);
    if (streakUpdates) {
      Object.assign(updates, streakUpdates);
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(ref, updates);
    }

    return effectiveCount;
  } catch (error) {
    console.warn('reconcileActivitiesToday failed:', error.message);
    return 0;
  }
}

export function shiftDateKey(dateKey, offsetDays) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + offsetDays);
  return getDateKey(date);
}

export function getActiveStreakDateKeys(couple) {
  const streak = getStreakCount(couple);
  if (!streak) return [];

  const lastSecured = couple?.streakSecuredDate || couple?.lastActivityDate || null;
  if (!lastSecured) return [];

  const dates = [];
  for (let i = 0; i < streak; i += 1) {
    dates.push(shiftDateKey(lastSecured, -i));
  }
  return dates;
}

export function getStreakHistoryDates(couple) {
  const dates = new Set();
  const streakDays = couple?.streakDays;

  if (streakDays && typeof streakDays === 'object') {
    Object.entries(streakDays).forEach(([dateKey, secured]) => {
      if (secured) dates.add(dateKey);
    });
  }

  getActiveStreakDateKeys(couple).forEach((dateKey) => dates.add(dateKey));

  return dates;
}

export async function syncStreakHistory(coupleId, coupleData = null) {
  try {
    if (!coupleId) return [];

    const { ref, data } = coupleData
      ? { ref: doc(db, 'couples', coupleId), data: coupleData }
      : await fetchCouple(coupleId);

    const activeDates = getActiveStreakDateKeys(data);
    const existing = data.streakDays || {};
    const updates = {};

    activeDates.forEach((dateKey) => {
      if (!existing[dateKey]) {
        updates[`streakDays.${dateKey}`] = true;
      }
    });

    if (Object.keys(updates).length > 0) {
      await updateDoc(ref, updates);
    }

    return getStreakHistoryDates({ ...data, streakDays: { ...existing, ...Object.fromEntries(activeDates.map((d) => [d, true])) } });
  } catch (error) {
    console.warn('syncStreakHistory failed:', error.message);
    return getStreakHistoryDates(coupleData || {});
  }
}

function getEffectiveActivitiesToday(data, today = getDateKey()) {
  const fromClaims = getStreakActivityActionsToday(data, today).length;
  const fromCounter =
    data?.lastActivityDate === today ? (data?.activitiesToday ?? 0) : 0;
  return Math.min(Math.max(fromClaims, fromCounter), ACTIVITIES_REQUIRED);
}

export async function trySecureStreakGoal(coupleId, coupleData = null) {
  try {
    if (!coupleId) return null;

    const today = getDateKey();
    const { ref, data } = coupleData
      ? { ref: doc(db, 'couples', coupleId), data: coupleData }
      : await fetchCouple(coupleId);

    const streakUpdates = buildStreakGoalUpdates(data, today);
    if (!streakUpdates) return null;

    await updateDoc(ref, streakUpdates);
    return streakUpdates;
  } catch (error) {
    console.warn('trySecureStreakGoal failed:', error.message);
    return null;
  }
}

function buildStreakGoalUpdates(data, today = getDateKey()) {
  if (getEffectiveActivitiesToday(data, today) < ACTIVITIES_REQUIRED) {
    return null;
  }
  if (data?.streakSecuredDate === today) {
    return null;
  }

  const lastSecured = data?.streakSecuredDate;
  let currentStreak = getStreakCount(data);

  if (!lastSecured) {
    currentStreak = 1;
  } else {
    const gap = daysBetween(lastSecured, today);
    if (gap === 1) {
      currentStreak += 1;
    } else if (gap > 1) {
      currentStreak = 1;
    }
  }

  const longestStreak = Math.max(data?.longestStreak ?? 0, currentStreak);
  const updates = {
    currentStreak,
    streak: currentStreak,
    longestStreak,
    streakSecuredDate: today,
  };

  for (let i = 0; i < currentStreak; i += 1) {
    updates[`streakDays.${shiftDateKey(today, -i)}`] = true;
  }

  if (MILESTONE_DAYS.includes(currentStreak)) {
    updates.pendingMilestone = currentStreak;
  }

  return updates;
}

export function getFreezeTokens(couple) {
  return couple?.freezeTokens ?? 0;
}

export function getCouplePoints(couple) {
  if (!couple) return 0;
  return couple.points ?? couple.totalPoints ?? 0;
}

export function hasUnlock(couple, unlockId) {
  if (!couple) return false;
  if ((couple.unlocks || []).includes(unlockId)) return true;

  const unlock = UNLOCKS.find((u) => u.id === unlockId);
  if (!unlock) return false;

  return getCouplePoints(couple) >= unlock.points;
}

export function getEarnedUnlockIds(couple) {
  if (!couple) return [];
  const points = getCouplePoints(couple);
  const fromPoints = UNLOCKS.filter((u) => points >= u.points).map((u) => u.id);
  return [...new Set([...(couple.unlocks || []), ...fromPoints])];
}

export function getUnlockedFeatures(couple) {
  const earned = getEarnedUnlockIds(couple);
  return UNLOCKS.filter((u) => earned.includes(u.id));
}

export async function syncCoupleUnlocks(coupleId, coupleData = null) {
  try {
    if (!coupleId) return [];

    const { ref, data } = coupleData
      ? { ref: doc(db, 'couples', coupleId), data: coupleData }
      : await fetchCouple(coupleId);
    const points = getCouplePoints(data);
    const existing = data.unlocks || [];
    const earned = UNLOCKS.filter((u) => points >= u.points).map((u) => u.id);
    const merged = [...new Set([...existing, ...earned])];

    if (merged.length !== existing.length) {
      await updateDoc(ref, { unlocks: merged });
    }

    return merged;
  } catch (error) {
    console.warn('syncCoupleUnlocks failed:', error.message);
    return [];
  }
}

export function getNextUnlock(couple) {
  const points = getCouplePoints(couple);
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

async function logPointsEvent(coupleId, points, action, totalPoints, dedupKey = null) {
  try {
    await addDoc(collection(db, 'couples', coupleId, 'pointsLog'), {
      points,
      action,
      totalPoints,
      dedupKey,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('logPointsEvent failed:', error.message);
  }
}

function isPointsClaimed(coupleData, claimKey) {
  return Boolean(coupleData?.pointsClaimed?.[claimKey]);
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

export async function addPoints(coupleId, points, action, dedupKey = null) {
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
    await logPointsEvent(coupleId, points, action, newPoints, dedupKey);

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
      if (activitiesToday < ACTIVITIES_REQUIRED) {
        activitiesToday += 1;
      }
    } else {
      activitiesToday = 1;
    }

    const updates = {
      activitiesToday,
      lastActivityDate: today,
    };

    const streakGoalData = { ...data, activitiesToday };
    const streakUpdates = buildStreakGoalUpdates(streakGoalData, today);
    if (streakUpdates) {
      Object.assign(updates, streakUpdates);
    }

    await updateDoc(ref, updates);

    const streak = streakUpdates?.currentStreak ?? getStreakCount(data);
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
      await reconcileActivitiesToday(coupleId, data);
      const fresh = await fetchCouple(coupleId);
      const streakUpdates = buildStreakGoalUpdates(fresh.data, today);
      if (streakUpdates) {
        await updateDoc(fresh.ref, streakUpdates);
        return {
          currentStreak: streakUpdates.currentStreak,
          activitiesToday: getEffectiveActivitiesToday(fresh.data, today),
          streakReset: false,
          pendingMilestone: streakUpdates.pendingMilestone ?? fresh.data.pendingMilestone ?? null,
          freezeTokens: fresh.data.freezeTokens ?? 0,
        };
      }

      return {
        currentStreak: getStreakCount(fresh.data),
        activitiesToday: getEffectiveActivitiesToday(fresh.data, today),
        streakReset: false,
        pendingMilestone: fresh.data.pendingMilestone ?? null,
        freezeTokens: fresh.data.freezeTokens ?? 0,
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
      if (activitiesYesterday < ACTIVITIES_REQUIRED && !streakProtected) {
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

export async function completeGameActivity(
  coupleId,
  points,
  action,
  dedupKey = null,
  { countsTowardStreak = true } = {}
) {
  try {
    const claimKey = dedupKey || `${action}_${getDateKey()}`;
    const { ref, data } = await fetchCouple(coupleId);

    if (isPointsClaimed(data, claimKey)) {
      const streakUpdates = await trySecureStreakGoal(coupleId, data);
      return {
        newPoints: data.points ?? 0,
        newUnlocks: [],
        alreadyAwarded: true,
        activitiesToday: getEffectiveActivitiesToday(data),
        currentStreak: streakUpdates?.currentStreak ?? getStreakCount(data),
      };
    }

    const activityResult = countsTowardStreak
      ? await incrementActivity(coupleId)
      : {
          activitiesToday: data.activitiesToday ?? 0,
          streak: getStreakCount(data),
        };
    const pointsResult = await addPoints(coupleId, points, action, claimKey);

    const syncKey = `partner-sync_${getDateKey()}`;
    const claimUpdates = { [`pointsClaimed.${claimKey}`]: true };
    let syncBonus = null;

    if (
      activityResult.activitiesToday >= ACTIVITIES_REQUIRED &&
      !isPointsClaimed(data, syncKey)
    ) {
      syncBonus = await addPoints(coupleId, POINTS.PARTNER_SYNC, 'partner-sync', syncKey);
      claimUpdates[`pointsClaimed.${syncKey}`] = true;
    }

    await updateDoc(ref, claimUpdates);

    const streakUpdates = await trySecureStreakGoal(coupleId);
    const effectiveActivities = streakUpdates
      ? getEffectiveActivitiesToday({
          ...data,
          ...claimUpdates,
          pointsClaimed: { ...(data.pointsClaimed || {}), [claimKey]: true },
        })
      : activityResult.activitiesToday;

    return {
      ...pointsResult,
      syncBonus,
      alreadyAwarded: false,
      activitiesToday: effectiveActivities,
      currentStreak: streakUpdates?.currentStreak ?? activityResult.streak,
    };
  } catch (error) {
    console.warn('completeGameActivity failed:', error.message);
    throw error;
  }
}

export const DARE_SKIPS_PER_WEEK = 2;

export async function canSkipDare(coupleId) {
  try {
    const weekKey = getMonthKey() + '-W' + Math.ceil(new Date().getDate() / 7);
    const { data } = await fetchCouple(coupleId);
    const skips = data.dareSkipsThisWeek ?? 0;
    const skipWeek = data.dareSkipWeekKey;
    if (skipWeek !== weekKey) return { allowed: true, remaining: DARE_SKIPS_PER_WEEK };
    return {
      allowed: skips < DARE_SKIPS_PER_WEEK,
      remaining: Math.max(0, DARE_SKIPS_PER_WEEK - skips),
    };
  } catch {
    return { allowed: true, remaining: DARE_SKIPS_PER_WEEK };
  }
}

export async function recordDareSkip(coupleId) {
  try {
    const weekKey = getMonthKey() + '-W' + Math.ceil(new Date().getDate() / 7);
    const { ref, data } = await fetchCouple(coupleId);
    const currentWeek = data.dareSkipWeekKey;
    const skips = currentWeek === weekKey ? (data.dareSkipsThisWeek ?? 0) + 1 : 1;
    await updateDoc(ref, { dareSkipWeekKey: weekKey, dareSkipsThisWeek: skips });
    return skips;
  } catch (error) {
    console.warn('recordDareSkip failed:', error.message);
    throw error;
  }
}
