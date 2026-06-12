import {
  HUB_GAMES,
  getTodayDailyQuestion,
  WHO_MORE_LIKELY_BATCH_SIZE,
} from '../constants/gameData';
import { getDateKey } from './points';
import {
  findPendingRoundForUser,
  getHes10ButStatus,
} from './hes10But';

export function getTodayQuestion() {
  return getTodayDailyQuestion().question;
}

export function getCoupleTotalPoints(couple) {
  if (!couple) return 0;
  return couple.totalPoints ?? couple.points ?? 0;
}

const ACTIVITY_ACTIONS = [
  'daily-question',
  'who-more-likely',
  'hes-a-10-but',
  'dare-drop',
  'voice-bomb',
  'voice-bomb-reply',
];

const ACTIVITY_DISPLAY = Object.fromEntries(
  (HUB_GAMES || []).map((game) => [game.id, { title: game.title, emoji: game.emoji }])
);
ACTIVITY_DISPLAY['voice-bomb-reply'] = { title: 'Voice Bomb Reply', emoji: '💬' };

function isTimestampIdFromToday(id, todayKey = getDateKey()) {
  const ts = parseInt(String(id).split('_')[0], 10);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  return getDateKey(new Date(ts)) === todayKey;
}

function isClaimKeyFromToday(key, action, todayKey = getDateKey()) {
  const suffix = key.slice(`${action}_`.length);
  if (/^\d{4}-\d{2}-\d{2}$/.test(suffix)) {
    return suffix === todayKey;
  }
  return isTimestampIdFromToday(suffix, todayKey);
}

function getClaimSortTime(key, action) {
  const suffix = key.slice(`${action}_`.length);
  if (/^\d{4}-\d{2}-\d{2}$/.test(suffix)) {
    return new Date(`${suffix}T12:00:00`).getTime();
  }
  const ts = parseInt(String(suffix).split('_')[0], 10);
  return Number.isFinite(ts) ? ts : 0;
}

function getGuestTodaysActivities(sessions, todayKey = getDateKey()) {
  const list = Array.isArray(sessions) ? sessions : [];
  const seen = new Set();
  const activities = [];

  for (const session of list) {
    if (!isSessionToday(session, todayKey)) continue;
    const meta = ACTIVITY_DISPLAY[session.gameId];
    if (!meta || seen.has(session.gameId)) continue;
    seen.add(session.gameId);
    activities.push({
      id: session.gameId,
      title: meta.title,
      emoji: meta.emoji,
    });
  }

  return activities;
}

export function getTodaysCompletedActivities(
  couple,
  { sessions = [], todayKey = getDateKey() } = {}
) {
  if (couple?.lastActivityDate && couple.lastActivityDate !== todayKey) {
    return [];
  }

  const claimed = couple?.pointsClaimed;
  if (!claimed || typeof claimed !== 'object') {
    return getGuestTodaysActivities(sessions, todayKey);
  }

  const activities = [];

  for (const [key, value] of Object.entries(claimed)) {
    if (!value || key.startsWith('partner-sync_')) continue;

    const action = ACTIVITY_ACTIONS.find((name) => key.startsWith(`${name}_`));
    if (!action || !isClaimKeyFromToday(key, action, todayKey)) continue;

    const meta = ACTIVITY_DISPLAY[action];
    if (!meta) continue;

    activities.push({
      id: key,
      title: meta.title,
      emoji: meta.emoji,
      sortTime: getClaimSortTime(key, action),
    });
  }

  return activities
    .sort((a, b) => a.sortTime - b.sortTime)
    .map(({ id, title, emoji }) => ({ id, title, emoji }));
}

function sessionDateKey(session) {
  if (session?.dateKey) return session.dateKey;
  const ts = session?.createdAt;
  if (!ts) return null;
  try {
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    return getDateKey(date);
  } catch {
    return null;
  }
}

export function isSessionToday(session, todayKey = getDateKey()) {
  return sessionDateKey(session) === todayKey;
}

export function countGameSessions(sessions, gameId) {
  const list = Array.isArray(sessions) ? sessions : [];
  return list.filter((session) => session?.gameId === gameId).length;
}

export function getTodaySessions(sessions, gameId, todayKey = getDateKey()) {
  const list = Array.isArray(sessions) ? sessions : [];
  return list.filter(
    (session) => session?.gameId === gameId && isSessionToday(session, todayKey)
  );
}

export function userPlayedToday(sessions, gameId, userId, todayKey = getDateKey()) {
  if (!userId) return false;
  return getTodaySessions(sessions, gameId, todayKey).some(
    (session) => session.userId === userId
  );
}

export function partnerPlayedToday(sessions, gameId, partnerId, todayKey = getDateKey()) {
  if (!partnerId) return false;
  return getTodaySessions(sessions, gameId, todayKey).some(
    (session) => session.userId === partnerId
  );
}

export function getWhoMoreLikelyStatus(sessions, userId, partnerId, partnerName) {
  try {
    const todayKey = getDateKey();
    const todaySessions = getTodaySessions(sessions, 'who-more-likely', todayKey);
    const userAnswered = userId
      ? todaySessions.some((session) => session.userId === userId && session.completed)
      : false;
    const partnerAnswered = partnerId
      ? todaySessions.some((session) => session.userId === partnerId && session.completed)
      : todaySessions.some((session) => session.completed && session.userId !== userId);

    if (userAnswered && partnerAnswered) {
      return { status: 'both', label: 'Reveal ready ✓' };
    }
    if (userAnswered && !partnerAnswered) {
      return {
        status: 'waiting',
        label: `Waiting for ${partnerName || 'partner'}`,
      };
    }
    if (!userAnswered && partnerAnswered) {
      return {
        status: 'answer',
        label: `${partnerName || 'Partner'} finished — your turn`,
      };
    }
    const userSessions = todaySessions.filter((s) => s.userId === userId);
    if (userSessions.length > 0 && !userAnswered) {
      return {
        status: 'answer',
        label: `In progress — finish ${WHO_MORE_LIKELY_BATCH_SIZE} questions`,
      };
    }
    return { status: 'answer', label: `Answer ${WHO_MORE_LIKELY_BATCH_SIZE} questions` };
  } catch {
    return { status: 'answer', label: `Answer ${WHO_MORE_LIKELY_BATCH_SIZE} questions` };
  }
}

export function getDailyQuestionStatus(sessions, userId, partnerId, partnerName) {
  try {
    const todayKey = getDateKey();
    const todaySessions = getTodaySessions(sessions, 'daily-question', todayKey);
    const userAnswered = userId
      ? todaySessions.some((session) => session.userId === userId)
      : false;
    const partnerAnswered = partnerId
      ? todaySessions.some((session) => session.userId === partnerId)
      : todaySessions.length > 0 && !userAnswered;

    if (userAnswered && partnerAnswered) {
      return { status: 'both', label: 'Both Answered ✓' };
    }
    if (userAnswered && !partnerAnswered) {
      return {
        status: 'waiting',
        label: `Waiting for ${partnerName || 'partner'}`,
      };
    }
    if (!userAnswered && partnerAnswered) {
      return {
        status: 'answer',
        label: `${partnerName || 'Partner'} answered — your turn`,
      };
    }
    return { status: 'answer', label: 'Answer Now' };
  } catch {
    return { status: 'answer', label: 'Answer Now' };
  }
}

export function isPartnerWaiting(sessions, gameId, userId, partnerId, hes10Rounds = []) {
  if (!userId) return false;

  if (gameId === 'hes-a-10-but') {
    return Boolean(findPendingRoundForUser(hes10Rounds, userId));
  }

  if (!partnerId) return false;

  const todayKey = getDateKey();
  const todaySessions = getTodaySessions(sessions, gameId, todayKey);
  if (todaySessions.length === 0) return false;

  const userPlayed = userPlayedToday(sessions, gameId, userId, todayKey);
  const partnerPlayed = partnerPlayedToday(sessions, gameId, partnerId, todayKey);

  switch (gameId) {
    case 'daily-question':
    case 'who-more-likely':
      return partnerPlayed && !userPlayed;
    case 'dare-drop':
    case 'voice-bomb':
      return partnerPlayed && !userPlayed;
    default:
      return partnerPlayed && !userPlayed;
  }
}

function getGameHubStatus(gameId, sessions, userId, partnerId, partnerName, hes10Rounds) {
  switch (gameId) {
    case 'daily-question':
      return getDailyQuestionStatus(sessions, userId, partnerId, partnerName);
    case 'who-more-likely':
      return getWhoMoreLikelyStatus(sessions, userId, partnerId, partnerName);
    case 'hes-a-10-but':
      return getHes10ButStatus(hes10Rounds, userId, partnerName);
    case 'dare-drop': {
      const todayKey = getDateKey();
      const partnerCompleted = getTodaySessions(sessions, 'dare-drop', todayKey).some(
        (s) => s.userId === partnerId && s.stage === 'complete'
      );
      if (partnerCompleted) {
        return { status: 'react', label: 'React to partner\'s dare' };
      }
      const partnerSent = sessions.some(
        (s) => s.gameId === 'dare-drop' && s.stage === 'sent_to_partner'
      );
      if (partnerSent) {
        return { status: 'partner', label: 'Dare from partner' };
      }
      return { status: 'play', label: 'Today\'s dare awaits' };
    }
    case 'voice-bomb': {
      const partnerSent = sessions.some(
        (s) => s.gameId === 'voice-bomb' && s.userId === partnerId
      );
      if (partnerSent && !userPlayedToday(sessions, 'voice-bomb', userId)) {
        return { status: 'listen', label: 'Listen to voice bomb' };
      }
      return { status: 'play', label: 'Record a message' };
    }
    default:
      return null;
  }
}

export function buildHubGameCards(
  sessions,
  userId,
  partnerId,
  { hes10Rounds = [], partnerName = 'partner' } = {}
) {
  const list = Array.isArray(sessions) ? sessions : [];
  return (HUB_GAMES || []).map((game) => {
    const hubStatus = getGameHubStatus(
      game.id,
      list,
      userId,
      partnerId,
      partnerName,
      hes10Rounds
    );

    return {
      ...game,
      timesPlayed: countGameSessions(list, game.id),
      isNew: countGameSessions(list, game.id) === 0,
      partnerWaiting: isPartnerWaiting(
        list,
        game.id,
        userId,
        partnerId,
        hes10Rounds
      ),
      hubStatus,
      statusLabel: hubStatus?.label || null,
    };
  });
}
