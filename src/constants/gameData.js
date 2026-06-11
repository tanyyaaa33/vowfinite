import { DAILY_QUESTIONS_CATALOG } from './dailyQuestionsCatalog';
import { WHO_MORE_LIKELY } from './whoMoreLikelyCatalog';
import { DARE_CATALOG } from './dareCatalog';

export { DAILY_QUESTIONS_CATALOG, WHO_MORE_LIKELY, DARE_CATALOG };

export const HUB_GAMES = [
  {
    id: 'daily-question',
    title: 'Daily Question',
    description: "Answer today's question together",
    emoji: '📅',
    screens: ['DailyQuestionAnswer', 'DailyQuestionReveal'],
  },
  {
    id: 'who-more-likely',
    title: "Who's More Likely",
    description: 'Answer 5 prompts, reveal when you both finish',
    emoji: '💭',
    screens: ['WhoMoreLikelyQuestion', 'WhoMoreLikelyReveal'],
  },
  {
    id: 'hes-a-10-but',
    title: "He's a 10 But",
    description: 'Send anytime — partner rates when ready',
    emoji: '💅',
    screens: ['Hesa10ButCreate', 'Hesa10ButRate', 'Hesa10ButReveal'],
  },
  {
    id: 'dare-drop',
    title: 'Dare Drop',
    description: 'A real-world challenge awaits',
    emoji: '🎯',
    screens: ['DareDropDare', 'DareDropComplete'],
  },
  {
    id: 'voice-bomb',
    title: 'Voice Bomb',
    description: 'Say it out loud, no typing allowed',
    emoji: '🎙️',
    screens: ['VoiceBombRecord', 'VoiceBombListen', 'VoiceBombReply'],
  },
];

export const GAMES = [
  {
    id: 'daily-question',
    title: 'Daily Question',
    subtitle: 'Answer together, reveal together',
    description: 'Answer together, reveal together',
    emoji: '💬',
    color: '#FF6B9D',
    screens: ['DailyQuestionAnswer', 'DailyQuestionReveal'],
    points: 10,
    timesPlayed: 0,
    isNew: true,
    hasNotification: true,
  },
  {
    id: 'who-more-likely',
    title: 'Who\'s More Likely',
    subtitle: '5 questions — answer anytime, reveal together',
    description: '5 questions — answer anytime, reveal together',
    emoji: '🤔',
    color: '#C084FC',
    screens: ['WhoMoreLikelyQuestion', 'WhoMoreLikelyReveal'],
    points: 10,
    timesPlayed: 0,
    isNew: false,
    hasNotification: false,
  },
  {
    id: 'hes-a-10-but',
    title: 'He\'s a 10 But...',
    subtitle: 'Send anytime — partner rates when ready',
    description: 'Send anytime — partner rates when ready',
    emoji: '🔥',
    color: '#FF6B9D',
    screens: ['Hesa10ButCreate', 'Hesa10ButRate', 'Hesa10ButReveal'],
    points: 10,
    timesPlayed: 0,
    isNew: false,
    hasNotification: false,
  },
  {
    id: 'dare-drop',
    title: 'Dare Drop',
    subtitle: 'Send a surprise dare to your love',
    description: 'Send a surprise dare to your love',
    emoji: '🎲',
    color: '#C084FC',
    screens: ['DareDropDare', 'DareDropComplete'],
    points: 20,
    timesPlayed: 0,
    isNew: false,
    hasNotification: false,
  },
  {
    id: 'voice-bomb',
    title: 'Voice Bomb',
    subtitle: 'Record a secret voice message',
    description: 'Record a secret voice message',
    emoji: '🎙️',
    color: '#FF6B9D',
    screens: ['VoiceBombRecord', 'VoiceBombListen', 'VoiceBombReply'],
    points: 20,
    timesPlayed: 0,
    isNew: false,
    hasNotification: false,
  },
];

/** Day-of-year index so questions don't repeat every month like day-of-month did. */
export function getCatalogIndexForDate(catalogLength, date = new Date()) {
  if (!catalogLength) return 0;
  const yearStart = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - yearStart) / 86400000);
  return (dayOfYear + date.getFullYear() * 13) % catalogLength;
}

export function getDailyQuestionForDate(date = new Date()) {
  if (!DAILY_QUESTIONS_CATALOG.length) {
    return { category: 'Deep', question: 'What makes you feel most loved?' };
  }
  const index = getCatalogIndexForDate(DAILY_QUESTIONS_CATALOG.length, date);
  return DAILY_QUESTIONS_CATALOG[index];
}

export function getTodayDailyQuestion(date = new Date()) {
  return getDailyQuestionForDate(date);
}

export function parseDateKey(dateKey) {
  const [y, m, d] = String(dateKey || '').split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

export const DAILY_QUESTIONS = DAILY_QUESTIONS_CATALOG.map((item) => item.question);

export const WHO_MORE_LIKELY_BATCH_SIZE = 5;

export function getTodayWhoMoreLikelyQuestions(
  batchSize = WHO_MORE_LIKELY_BATCH_SIZE,
  date = new Date()
) {
  if (!WHO_MORE_LIKELY.length) {
    return ['Who\'s more likely to plan a surprise date?'];
  }

  const start = getCatalogIndexForDate(WHO_MORE_LIKELY.length, date);
  const questions = [];
  for (let i = 0; i < batchSize; i += 1) {
    questions.push(WHO_MORE_LIKELY[(start + i) % WHO_MORE_LIKELY.length]);
  }
  return questions;
}

export function getTodayWhoMoreLikelyQuestion() {
  return getTodayWhoMoreLikelyQuestions(1)[0];
}

export const LOVE_LANGUAGES = [
  { id: 'words', label: 'Words of Affirmation', emoji: '💌' },
  { id: 'acts', label: 'Acts of Service', emoji: '🤝' },
  { id: 'gifts', label: 'Receiving Gifts', emoji: '🎁' },
  { id: 'time', label: 'Quality Time', emoji: '⏰' },
  { id: 'touch', label: 'Physical Touch', emoji: '🤗' },
];

export const DARE_CATEGORY_COLORS = {
  'Right Now': '#FF6B9D',
  Today: '#C084FC',
  'This Week': '#60A5FA',
  Vulnerability: '#FFD93D',
  Fun: '#4CAF80',
};

export function getDareByIndex(index) {
  if (!DARE_CATALOG.length) {
    return {
      id: 'fallback',
      text: 'Do something kind for your partner today',
      category: 'Today',
      timeEstimate: '10 min',
    };
  }
  const safeIndex = ((index % DARE_CATALOG.length) + DARE_CATALOG.length) % DARE_CATALOG.length;
  return DARE_CATALOG[safeIndex];
}

export function getTodayDareIndex(date = new Date()) {
  return getCatalogIndexForDate(DARE_CATALOG.length || 1, date);
}

export function getTodayDare() {
  return getDareByIndex(getTodayDareIndex());
}

export const DARES = DARE_CATALOG.map((item) => item.text);

export const HES10_INSPIRATION_CHIPS = [
  'replies with one-word texts',
  'takes 2 hours to get ready',
  'never initiates plans',
  'leaves cabinet doors open',
  'checks their phone during dinner',
  'sings in the shower way too loud',
  'steals the covers every night',
  'is always "five minutes away"',
  'orders the same thing every time',
  'takes forever to pick a movie',
  'leaves wet towels on the bed',
  'laughs at their own jokes first',
];

export const HES10_PROMPTS = [
  '...but they never reply to texts',
  '...but they hate your favorite food',
  '...but they\'re always late',
  '...but they don\'t like pets',
  '...but they\'re a terrible singer',
];
