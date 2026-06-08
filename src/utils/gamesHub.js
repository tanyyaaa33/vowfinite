import { HUB_GAMES, getTodayDailyQuestion } from '../constants/gameData';
import { getDateKey } from './points';

export function getTodayQuestion() {
  return getTodayDailyQuestion().question;
}

export function getCoupleTotalPoints(couple) {
  if (!couple) return 0;
  return couple.totalPoints ?? couple.points ?? 0;
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
    return { status: 'answer', label: 'Answer Now' };
  } catch {
    return { status: 'answer', label: 'Answer Now' };
  }
}

export function isPartnerWaiting(sessions, gameId, userId, partnerId) {
  if (!partnerId || !userId) return false;

  const todayKey = getDateKey();
  const todaySessions = getTodaySessions(sessions, gameId, todayKey);
  if (todaySessions.length === 0) return false;

  const userPlayed = userPlayedToday(sessions, gameId, userId, todayKey);
  const partnerPlayed = partnerPlayedToday(sessions, gameId, partnerId, todayKey);

  switch (gameId) {
    case 'daily-question':
    case 'who-more-likely':
      return partnerPlayed && !userPlayed;
    case 'hes-a-10-but':
      return (
        todaySessions.some(
          (session) => session.userId === partnerId && session.stage === 'create'
        ) && !userPlayed
      );
    case 'dare-drop':
    case 'voice-bomb':
      return partnerPlayed && !userPlayed;
    default:
      return partnerPlayed && !userPlayed;
  }
}

export function buildHubGameCards(sessions, userId, partnerId) {
  const list = Array.isArray(sessions) ? sessions : [];
  return (HUB_GAMES || []).map((game) => ({
    ...game,
    timesPlayed: countGameSessions(list, game.id),
    isNew: countGameSessions(list, game.id) === 0,
    partnerWaiting: isPartnerWaiting(list, game.id, userId, partnerId),
  }));
}
