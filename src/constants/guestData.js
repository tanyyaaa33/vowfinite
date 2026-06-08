export const GUEST_COUPLE_ID = 'guest-preview';
export const GUEST_USER_ID = 'guest-user';
export const GUEST_PARTNER_ID = 'guest-partner';

export const GUEST_PROFILE = {
  uid: GUEST_USER_ID,
  email: 'preview@vowfinity.app',
  name: 'Alex',
  partnerName: 'Jordan',
  startDate: '06/01/2024',
  avatarEmoji: '💕',
  loveLanguage: 'Quality Time',
  coupleId: GUEST_COUPLE_ID,
  inviteCode: 'LOVE42',
};

export const GUEST_COUPLE = {
  members: [GUEST_USER_ID, GUEST_PARTNER_ID],
  inviteCode: 'LOVE42',
  points: 185,
  totalPoints: 185,
  currentStreak: 5,
  longestStreak: 12,
  streak: 5,
  activitiesToday: 2,
  lastActivityDate: null,
  freezeTokens: 2,
  unlocks: [],
  pendingMilestone: null,
};

export const GUEST_SESSIONS = [
  { id: 'guest-s1', gameId: 'daily-question', userId: GUEST_USER_ID, createdAt: new Date().toISOString() },
  { id: 'guest-s2', gameId: 'who-more-likely', userId: GUEST_PARTNER_ID, createdAt: new Date().toISOString() },
];
