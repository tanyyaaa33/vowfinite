import { notifyPartner, NOTIFICATION_TYPES } from './notifications';

const NUDGE_COOLDOWN_MS = 60 * 60 * 1000;
const lastNudgeByKey = {};

function canNudge(key) {
  const last = lastNudgeByKey[key];
  if (!last) return true;
  return Date.now() - last > NUDGE_COOLDOWN_MS;
}

export async function nudgePartner(profile, gameId, extra = {}) {
  const key = `${profile?.uid}_${gameId}_${extra.dateKey || extra.roundId || 'today'}`;
  if (!canNudge(key)) {
    return { sent: false, reason: 'cooldown' };
  }

  const typeMap = {
    'daily-question': NOTIFICATION_TYPES.PARTNER_NUDGE,
    'who-more-likely': NOTIFICATION_TYPES.PARTNER_NUDGE,
    'hes-a-10-but': NOTIFICATION_TYPES.PARTNER_NUDGE,
    'dare-drop': NOTIFICATION_TYPES.PARTNER_NUDGE,
    'voice-bomb': NOTIFICATION_TYPES.PARTNER_NUDGE,
  };

  await notifyPartner(profile, typeMap[gameId] || NOTIFICATION_TYPES.PARTNER_NUDGE, {
    gameId,
    ...extra,
  });

  lastNudgeByKey[key] = Date.now();
  return { sent: true };
}
