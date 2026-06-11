import assert from 'node:assert/strict';

function getDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function checkNewUnlocks(oldPoints, newPoints) {
  const UNLOCKS = [
    { id: 'personality_type', points: 100 },
    { id: 'time_capsule', points: 250 },
  ];
  return UNLOCKS.filter((u) => oldPoints < u.points && newPoints >= u.points);
}

function getDailyQuestionStatus(sessions, userId, partnerId) {
  const userAnswered = sessions.some((s) => s.userId === userId);
  const partnerAnswered = sessions.some((s) => s.userId === partnerId);
  if (userAnswered && partnerAnswered) return { status: 'both' };
  if (userAnswered) return { status: 'waiting' };
  return { status: 'answer' };
}

function findPendingRoundForUser(rounds, userId) {
  return rounds.find(
    (r) =>
      r.status === 'awaiting_rating' &&
      r.creatorId !== userId &&
      r.partnerRating == null
  );
}

const userId = 'user-a';
const partnerId = 'user-b';

assert.equal(getDateKey(new Date('2026-06-10')).slice(0, 7), '2026-06');
assert.ok(checkNewUnlocks(90, 110).length > 0);

const sessions = [{ gameId: 'daily-question', userId }];
assert.equal(getDailyQuestionStatus(sessions, userId, partnerId).status, 'waiting');

const rounds = [
  { id: 'r1', creatorId: partnerId, status: 'awaiting_rating', partnerRating: null },
];
assert.equal(findPendingRoundForUser(rounds, userId)?.id, 'r1');

console.log('All utility tests passed.');
