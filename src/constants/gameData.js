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
    description: 'Tap who you think it is',
    emoji: '💭',
    screens: ['WhoMoreLikelyQuestion', 'WhoMoreLikelyReveal'],
  },
  {
    id: 'hes-a-10-but',
    title: "He's a 10 But",
    description: 'Finish the sentence, they rate it',
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
    subtitle: 'Guess what your partner thinks',
    description: 'Guess what your partner thinks',
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
    subtitle: 'Rate the dealbreakers together',
    description: 'Rate the dealbreakers together',
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
    points: 30,
    timesPlayed: 0,
    isNew: false,
    hasNotification: false,
  },
];

export const DAILY_QUESTIONS_CATALOG = [
  { category: 'Deep', question: "What's one small thing I do that makes you feel loved?" },
  { category: 'Funny', question: 'If we switched bodies for a day, what would you do first?' },
  { category: 'Deep', question: "What's your favorite memory of us from this month?" },
  { category: 'Romantic', question: 'What song reminds you of our relationship?' },
  { category: 'Fun', question: 'If we could teleport anywhere right now, where would we go?' },
  { category: 'Deep', question: "What's something new you'd love to try together?" },
  { category: 'Funny', question: 'What is the most "us" thing we do without trying?' },
  { category: 'Romantic', question: 'When did you first know you were falling for me?' },
  { category: 'Fun', question: 'What would our couple superpower be?' },
  { category: 'Deep', question: 'What do you need more of from me this week?' },
];

export function getTodayDailyQuestion() {
  if (!DAILY_QUESTIONS_CATALOG.length) {
    return { category: 'Deep', question: 'What makes you feel most loved?' };
  }
  return DAILY_QUESTIONS_CATALOG[new Date().getDate() % DAILY_QUESTIONS_CATALOG.length];
}

export const DAILY_QUESTIONS = DAILY_QUESTIONS_CATALOG.map((item) => item.question);

export const WHO_MORE_LIKELY = [
  'Who\'s more likely to plan a surprise date?',
  'Who\'s more likely to stay up late binge-watching?',
  'Who\'s more likely to cry during a movie?',
  'Who\'s more likely to forget an anniversary?',
  'Who\'s more likely to start a dance party in the kitchen?',
];

export function getTodayWhoMoreLikelyQuestion() {
  if (!WHO_MORE_LIKELY.length) {
    return 'Who\'s more likely to plan a surprise date?';
  }
  return WHO_MORE_LIKELY[new Date().getDate() % WHO_MORE_LIKELY.length];
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

export const DARE_CATALOG = [
  {
    id: 'voice-note',
    text: 'Send your partner a voice note saying three things you love about them',
    category: 'Right Now',
    timeEstimate: '5 min',
  },
  {
    id: 'surprise-15',
    text: 'Plan a 15-minute surprise for your partner today',
    category: 'Today',
    timeEstimate: '15 min',
  },
  {
    id: 'hidden-note',
    text: 'Write a handwritten note and hide it somewhere they\'ll find it',
    category: 'This Week',
    timeEstimate: '10 min',
  },
  {
    id: 'love-song',
    text: 'Pick a song that describes your partner and share why',
    category: 'Vulnerability',
    timeEstimate: '8 min',
  },
  {
    id: 'compliment-marathon',
    text: 'Give your partner a 60-second compliment marathon',
    category: 'Fun',
    timeEstimate: '2 min',
  },
  {
    id: 'coffee-run',
    text: 'Pick up their favorite drink and leave it with a sweet note',
    category: 'Today',
    timeEstimate: '20 min',
  },
  {
    id: 'memory-text',
    text: 'Text them your favorite memory together and why it still matters',
    category: 'Vulnerability',
    timeEstimate: '5 min',
  },
  {
    id: 'dance-kitchen',
    text: 'Start a two-song kitchen dance party when you see them next',
    category: 'Fun',
    timeEstimate: '10 min',
  },
];

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
  return date.getDate() % (DARE_CATALOG.length || 1);
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
];

export const HES10_PROMPTS = [
  '...but they never reply to texts',
  '...but they hate your favorite food',
  '...but they\'re always late',
  '...but they don\'t like pets',
  '...but they\'re a terrible singer',
];
