/**
 * Expands game content catalogs to 520+ unique items each.
 * Run: node scripts/generate-catalogs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TARGET = 520;

const { DAILY_QUESTIONS_CATALOG } = await import('../src/constants/dailyQuestionsCatalog.js');
const { WHO_MORE_LIKELY } = await import('../src/constants/whoMoreLikelyCatalog.js');
const { DARE_CATALOG } = await import('../src/constants/dareCatalog.js');
const { VOICE_BOMB_PROMPTS } = await import('../src/constants/voiceBombPrompts.js');

function uniquePush(set, list, item, keyFn = (x) => x) {
  const key = keyFn(item);
  if (set.has(key)) return false;
  set.add(key);
  list.push(item);
  return true;
}

function fillToTarget(existing, generate, keyFn, target = TARGET) {
  const set = new Set(existing.map(keyFn));
  const list = [...existing];
  let round = 0;
  while (list.length < target && round < 200) {
    round += 1;
    const batch = generate(round, list.length);
    for (const item of batch) {
      uniquePush(set, list, item, keyFn);
      if (list.length >= target) break;
    }
  }
  if (list.length < target) {
    throw new Error(`Only generated ${list.length} items (target ${target})`);
  }
  return list;
}

// ─── Daily Questions ─────────────────────────────────────────────────────────

const DAILY_CATEGORIES = ['Deep', 'Funny', 'Romantic', 'Fun', 'Gratitude', 'Future'];

const dailyTemplates = [
  { cat: 'Deep', q: "What's one thing about {topic} you've been thinking about lately?" },
  { cat: 'Deep', q: 'When do you feel most connected to me around {topic}?' },
  { cat: 'Deep', q: 'What has {topic} taught you about love?' },
  { cat: 'Deep', q: 'How do you want us to grow in {topic}?' },
  { cat: 'Deep', q: 'What fear about {topic} can I help ease?' },
  { cat: 'Deep', q: 'What moment involving {topic} made you trust me more?' },
  { cat: 'Funny', q: 'What is the most "us" thing about {topic}?' },
  { cat: 'Funny', q: 'If {topic} were a sitcom episode, what would it be called?' },
  { cat: 'Funny', q: 'What would our pet think about our {topic}?' },
  { cat: 'Funny', q: 'What meme best describes our {topic}?' },
  { cat: 'Romantic', q: 'What small {topic} moment still gives you butterflies?' },
  { cat: 'Romantic', q: 'What would a perfect {topic} date look like?' },
  { cat: 'Romantic', q: 'What song matches our {topic} energy?' },
  { cat: 'Romantic', q: 'What detail about our {topic} feels most romantic?' },
  { cat: 'Fun', q: 'What {topic} adventure should we try next?' },
  { cat: 'Fun', q: 'What game or challenge around {topic} should we do?' },
  { cat: 'Fun', q: 'What would a fun weekend focused on {topic} include?' },
  { cat: 'Gratitude', q: 'What about {topic} are you grateful for in us?' },
  { cat: 'Gratitude', q: 'What did I do around {topic} that you appreciated?' },
  { cat: 'Gratitude', q: 'What quality of mine shows up in our {topic}?' },
  { cat: 'Future', q: 'What {topic} goal should we set for this year?' },
  { cat: 'Future', q: 'What dream about {topic} do you want us to chase?' },
  { cat: 'Future', q: 'How do you picture our {topic} in five years?' },
];

const dailyTopics = [
  'communication', 'trust', 'conflict', 'affection', 'quality time', 'humor',
  'support', 'ambition', 'family', 'friendships', 'travel', 'food', 'music',
  'movies', 'weekends', 'mornings', 'bedtime routines', 'texting', 'surprises',
  'apologies', 'celebrations', 'stress', 'success', 'failure', 'patience',
  'boundaries', 'intimacy', 'adventure', 'home life', 'date nights', 'inside jokes',
  'compliments', 'listening', 'teamwork', 'finances', 'health', 'fitness',
  'creativity', 'learning', 'traditions', 'holidays', 'gifts', 'kindness',
  'forgiveness', 'loyalty', 'flirting', 'cuddling', 'cooking', 'cleaning',
  'planning', 'spontaneity', 'social life', 'alone time', 'phone habits',
  'sleep', 'dreams', 'memories', 'first dates', 'anniversaries', 'road trips',
  'pets', 'future plans', 'careers', 'gratitude', 'vulnerability', 'laughter',
  'reassurance', 'jealousy', 'space', 'closeness', 'routine', 'change',
  'growth', 'values', 'faith', 'community', 'volunteering', 'photography',
  'dancing', 'singing', 'gaming', 'reading', 'writing', 'art', 'fashion',
  'style', 'chores', 'errands', 'weather', 'seasons', 'birthdays', 'nostalgia',
];

const dailyStandalone = [
  { category: 'Deep', question: "What's one small thing I do that makes you feel loved?" },
  { category: 'Deep', question: 'What do you need more of from me this week?' },
  { category: 'Deep', question: 'When do you feel most emotionally connected to me?' },
  { category: 'Deep', question: 'What makes you feel safe with me?' },
  { category: 'Deep', question: 'How has being with me changed you?' },
  { category: 'Deep', question: 'What does commitment mean to you in our relationship?' },
  { category: 'Funny', question: 'If we switched bodies for a day, what would you do first?' },
  { category: 'Funny', question: "What's the dumbest argument we've ever had?" },
  { category: 'Funny', question: 'What would our reality show be called?' },
  { category: 'Funny', question: 'Who would play us in a movie about our relationship?' },
  { category: 'Romantic', question: 'What song reminds you of our relationship?' },
  { category: 'Romantic', question: 'When did you first know you were falling for me?' },
  { category: 'Romantic', question: "What's your favorite way I show affection?" },
  { category: 'Romantic', question: "What's a moment with me you replay in your head?" },
  { category: 'Fun', question: 'If we could teleport anywhere right now, where would we go?' },
  { category: 'Fun', question: 'What would our couple superpower be?' },
  { category: 'Fun', question: 'If we opened a business together, what would it be?' },
  { category: 'Gratitude', question: 'What made you choose me?' },
  { category: 'Gratitude', question: "When did you last feel proud to be my partner?" },
  { category: 'Future', question: 'Where do you see us in five years — be specific.' },
  { category: 'Future', question: "What's on your couple bucket list that we haven't done yet?" },
];

function generateDailyQuestions(round) {
  const items = [];
  for (const tpl of dailyTemplates) {
    for (const topic of dailyTopics) {
      items.push({ category: tpl.cat, question: tpl.q.replace('{topic}', topic) });
    }
  }
  for (const item of dailyStandalone) {
    items.push(item);
    items.push({
      category: item.category,
      question: `${item.question.replace(/\?$/, '')} — tell me more?`,
    });
  }
  return items;
}

const dailyQuestions = fillToTarget(
  DAILY_QUESTIONS_CATALOG.filter((q) => !q.question.includes('— tell me more?')),
  generateDailyQuestions,
  (q) => q.question.toLowerCase().trim()
);

// ─── Who's More Likely ───────────────────────────────────────────────────────

const wmlActions = [
  'plan a surprise date', 'stay up late binge-watching', 'cry during a movie', 'forget an anniversary',
  'start a dance party in the kitchen', 'apologize first after a fight', 'order dessert for the table',
  'get lost even with GPS', 'send a good morning text', 'hog the blankets at night',
  'suggest a spontaneous road trip', 'remember everyone\'s birthday', 'burn something while cooking',
  'fall asleep during a movie', 'take forever getting ready', 'start singing in public',
  'win an argument', 'be the bigger flirt', 'plan the vacation', 'spend money on something silly',
  'get hangry', 'befriend a stranger', 'send a meme at 2 AM', 'cry at a wedding',
  'be the designated photographer', 'suggest staying in over going out', 'have a secret snack stash',
  'be the first one on the dance floor', 'forget where they parked', 'say "I love you" first',
  'pick the restaurant', 'binge a new show in one weekend', 'be the cuddlier one',
  'get competitive during a game', 'leave voice notes instead of texting', 'wake up early on a weekend',
  'be the messy one', 'plan a picnic', 'talk to pets like they\'re people', 'suggest a couple selfie',
  'double-text when nervous', 'cry happy tears', 'forget to reply for hours', 'plan every detail of a trip',
  'suggest trying a new restaurant', 'fall for a scam email', 'be the peacemaker in a group',
  'have a five-step skincare routine', 'laugh at their own jokes', 'read the menu before arriving',
  'suggest a couples workout', 'keep every ticket stub and memento', 'be the designated driver',
  'start a deep conversation at midnight', 'overshare on social media', 'be scared of spiders',
  'suggest a board game night', 'remember what you ordered last time', 'be the early bird',
  'suggest rewatching a comfort show', 'buy gifts "just because"', 'get sunburned on vacation',
  'initiate a hug after a long day', 'be the better cook', 'talk through a problem immediately',
  'need alone time to recharge', 'suggest a fancy date night', 'be the bigger foodie',
  'cry during a commercial', 'be the planner for holidays', 'suggest a staycation',
  'win at trivia night', 'be the handyman or handywoman', 'suggest matching outfits',
  'be the life of the party', 'read relationship advice online', 'suggest a digital detox day',
  'be the sentimental one', 'suggest adopting a pet', 'be the better gift wrapper',
  'start a pillow fight', 'be the one who says "we need to talk"', 'suggest a couples bucket list',
  'be the bigger procrastinator', 'suggest learning a language together', 'fix things around the house',
  'suggest a sunrise hike', 'be the bigger dreamer', 'suggest writing love letters',
  'remember inside jokes', 'suggest a cooking class together', 'be the more patient one',
  'suggest a thrift-store date', 'initiate "I\'m sorry"', 'suggest stargazing',
  'be the bigger worrier', 'suggest a no-phones dinner', 'plan surprises for friends too',
  'suggest a couples journal', 'be the better dancer', 'suggest volunteering together',
  'need the most reassurance', 'suggest a random act of kindness for a stranger', 'be the bigger romantic',
  'suggest building something together', 'remember anniversaries of small moments',
  'text during a meeting', 'order the same thing every time', 'take the longest shower',
  'suggest a nap instead of going out', 'be the first to try a new trend', 'lose their phone',
  'send a playlist instead of a text', 'cry at a dog video', 'be the better gift giver',
  'suggest karaoke', 'forget to charge their phone', 'be the one who packs too much',
  'suggest a food crawl', 'get sunburned after forgetting sunscreen', 'be the bigger worrier about flights',
  'suggest matching pajamas', 'laugh at the wrong time', 'be the one who hogs the aux cord',
  'suggest a puzzle night', 'forget a reusable bag', 'be the one who tips extra',
  'suggest a photo walk', 'get way too into a hobby', 'be the one who reads the manual',
  'suggest breakfast for dinner', 'talk to plants', 'be the one who remembers passwords',
  'suggest a museum date', 'order too much coffee', 'be the one who cleans before guests arrive',
  'suggest a comedy show', 'fall asleep on the couch', 'be the one who saves leftovers',
  'suggest a farmers market trip', 'get emotional during speeches', 'be the one who fixes the Wi-Fi',
  'suggest a paint-and-sip night', 'leave the lights on', 'be the one who remembers appointments',
  'suggest a beach day', 'buy something they do not need', 'be the one who sends calendar invites',
  'suggest a bookstore date', 'get lost in a mall', 'be the one who knows all the shortcuts',
  'suggest ice cream at midnight', 'watch the same show twice', 'be the one who hypes you up',
];

const wmlContexts = [
  '', 'on vacation', 'when stressed', 'after a long day', 'on a road trip',
  'at a party', 'during an argument', 'on a lazy Sunday', 'when hangry',
  'when meeting new people', 'during a horror movie', 'at a wedding',
  'when the Wi-Fi is down', 'on a rainy day', 'during game night',
  'when trying something new', 'at a concert', 'when packing for a trip',
  'during a grocery run', 'on a first date redo', 'when someone is sad',
  'during the holidays', 'on a workday morning', 'before bed',
  'when celebrating good news', 'during a long drive', 'at a restaurant',
  'when planning a surprise', 'during a power outage', 'on a hike',
];

function generateWhoMoreLikely(round) {
  const items = [];
  for (const action of wmlActions) {
    for (const ctx of wmlContexts) {
      const suffix = ctx ? ` ${ctx}` : '';
      items.push(`Who's more likely to ${action}${suffix}?`);
    }
  }
  return items;
}

const whoMoreLikely = fillToTarget(
  WHO_MORE_LIKELY,
  generateWhoMoreLikely,
  (q) => q.toLowerCase().trim()
);

// ─── Dare Catalog ────────────────────────────────────────────────────────────

const dareCategories = ['Right Now', 'Today', 'This Week', 'Vulnerability', 'Fun'];
const dareTimes = ['2 min', '5 min', '8 min', '10 min', '12 min', '15 min', '20 min', '25 min', '30 min', '45 min', '60 min'];

const dareVerbs = [
  'Send your partner a voice note about',
  'Write a note about',
  'Text your partner about',
  'Share with your partner',
  'Tell your partner about',
  'Plan a surprise around',
  'Create a playlist inspired by',
  'Record a short video about',
  'Do something kind related to',
  'Research and pitch an idea about',
  'Compliment your partner on',
  'Recreate a memory involving',
  'Offer to help with',
  'Hide a sweet surprise about',
  'Call your partner to talk about',
];

const dareTopics = [
  'something you admire about them', 'your favorite memory this month', 'three things you are grateful for',
  'a dream for your future together', 'a song that reminds you of them', 'a compliment you have been holding back',
  'a moment you felt proud of them', 'something they do that makes you feel safe', 'your favorite inside joke',
  'a small thing they did that mattered', 'what you love about their laugh', 'a date idea you want to try',
  'a quality that still surprises you', 'how they made your week better', 'a photo that reminds you of them',
  'something you want to do together soon', 'a habit of theirs you secretly love', 'what you miss when apart',
  'a promise you want to make them', 'a story from when you first met', 'their kindness to others',
  'how they handle stress', 'a meal you want to share', 'a place you want to visit together',
  'a show you want to watch together', 'a challenge you want to tackle as a team', 'a tradition to start',
  'a book or article that made you think of them', 'what you are rooting for them on', 'a silly moment you loved',
  'their patience with you', 'a gift idea "just because"', 'a hug they gave that you remember',
  'a goal you want to support', 'a fear you want to ease for them', 'a moment they made you laugh',
  'how they show love in small ways', 'a photo scavenger hunt theme', 'a playlist for a road trip',
  'a handwritten letter', 'a breakfast surprise', 'a chore you can take off their plate',
  'a cozy night in plan', 'a public compliment', 'a dance party in the kitchen',
  'a stargazing moment', 'a walk with no destination', 'a favorite photo and its story',
  'a 60-second compliment marathon', 'a thank-you for something small',
];

const dareTiming = [
  'today', 'before bed', 'when you see them next', 'this week', 'without telling them first',
  'with a specific detail from this week', 'in person if you can', 'as a mid-day surprise',
  'and follow up with a hug', 'and read it aloud if possible',
];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function generateDares(round) {
  const items = [];
  let idx = 0;
  for (const verb of dareVerbs) {
    for (const topic of dareTopics) {
      const category = dareCategories[idx % dareCategories.length];
      const timeEstimate = dareTimes[idx % dareTimes.length];
      const timing = dareTiming[idx % dareTiming.length];
      const text = `${verb} ${topic} ${timing}`;
      items.push({
        id: slugify(`dare-${verb}-${topic}-${idx}`),
        text,
        category,
        timeEstimate,
      });
      idx += 1;
    }
  }
  return items;
}

const dareCatalog = fillToTarget(
  DARE_CATALOG,
  generateDares,
  (d) => d.text.toLowerCase().trim()
);

dareCatalog.forEach((dare, index) => {
  dare.id = `dare-${index + 1}`;
});

// ─── Voice Bomb Prompts ────────────────────────────────────────────────────────

const voiceOpeners = [
  'Tell them', 'Say', 'Share', 'Describe', 'Explain', 'Admit', 'Promise',
  'Whisper', 'Confess', 'Recall', 'Celebrate', 'Acknowledge',
];

const voiceSubjects = [
  'something you have never said out loud',
  'why you are proud of them today',
  'a memory that still makes you smile',
  'what you noticed about them lately',
  'the thing you have been meaning to say',
  'the moment you knew they were yours',
  'what you love most about their voice',
  'one thing they do that melts you',
  'what you are grateful for this week',
  'your favorite ordinary moment together',
  'what you are looking forward to with them',
  'how they made your day better',
  'a compliment you have been holding back',
  'what you admire about how they love you',
  'one thing that made you fall harder',
  'how you feel when you see their name pop up',
  'a dream you want to build together',
  'what you would do on a perfect day with them',
  'thank you for something small they did',
  'what you miss when you are apart',
  'what you are excited to tell them in person',
  'what makes your relationship uniquely yours',
  'a secret wish for your future together',
  'the last time they made you laugh',
  'what you love about their laugh',
  'what you want them to know before sleep',
  'a moment you felt lucky to be with them',
  'one thing that still gives you butterflies',
  'how they calm you down',
  'what you appreciate about their patience',
  'a story from when you first met',
  'what you are proud of us for',
  'what you hope they never forget about you',
  'what song reminds you of them and why',
  'your favorite hug from them',
  'what you are excited about this month',
  'one way they inspire you',
  'what you love about lazy days together',
  'what you would tell them if you had 30 seconds',
  'what you are rooting for them on',
  'a fear you want them to know about',
  'what you love about their kindness',
  'a moment they surprised you',
  'what you want more of in your relationship',
  'how they make hard days easier',
  'what you admire about their ambition',
  'a tiny detail you find adorable',
  'what you are sorry for lately',
  'what you forgive them for',
  'what you want them to forgive you for',
];

const voiceStyles = [
  '', '— be specific', '— keep it honest', '— no filter', '— like they are right here',
  '— start with their name', '— include one tiny detail', '— say it like a secret',
  '— make it playful', '— make it tender', '— end with I love you if it feels true',
  '— keep it under 30 seconds', '— say it slowly', '— smile while you say it',
];

function generateVoicePrompts(round) {
  const items = [];
  for (const opener of voiceOpeners) {
    for (const subject of voiceSubjects) {
      for (const style of voiceStyles) {
        const text = `${opener} ${subject}${style ? ` ${style}` : ''}`;
        items.push(text.charAt(0).toUpperCase() + text.slice(1));
      }
    }
  }
  return items;
}

const voiceBombPrompts = fillToTarget(
  VOICE_BOMB_PROMPTS,
  generateVoicePrompts,
  (p) => p.toLowerCase().trim()
);

// ─── Write files ─────────────────────────────────────────────────────────────

function jsString(value) {
  return JSON.stringify(value);
}

function writeDailyQuestions(filePath, items) {
  const lines = items.map(
    (item) => `  { category: ${jsString(item.category)}, question: ${jsString(item.question)} },`
  );
  const content = `// ${items.length} daily prompts — ~${Math.round(items.length / 7)} weeks before the same question returns (day-of-year rotation).
export const DAILY_QUESTIONS_CATALOG = [
${lines.join('\n')}
];
`;
  fs.writeFileSync(filePath, content, 'utf8');
}

function writeWhoMoreLikely(filePath, items) {
  const lines = items.map((q) => `  ${jsString(q)},`);
  const content = `// ${items.length} "Who's more likely" prompts — ${Math.floor(items.length / 5)} unique daily batches before the cycle repeats.
export const WHO_MORE_LIKELY = [
${lines.join('\n')}
];
`;
  fs.writeFileSync(filePath, content, 'utf8');
}

function writeDares(filePath, items) {
  const lines = items.map(
    (d) =>
      `  {\n    id: ${jsString(d.id)},\n    text: ${jsString(d.text)},\n    category: ${jsString(d.category)},\n    timeEstimate: ${jsString(d.timeEstimate)},\n  },`
  );
  const content = `// ${items.length} dares — ~${Math.round(items.length / 30)} months before the same dare returns.
export const DARE_CATALOG = [
${lines.join('\n')}
];
`;
  fs.writeFileSync(filePath, content, 'utf8');
}

function writeVoicePrompts(filePath, items) {
  const lines = items.map((p) => `  ${jsString(p)},`);
  const content = `// ${items.length} voice bomb prompts — ~${Math.round(items.length / 7)} weeks of unique daily prompts.
export const VOICE_BOMB_PROMPTS = [
${lines.join('\n')}
];
`;
  fs.writeFileSync(filePath, content, 'utf8');
}

const outDir = path.join(ROOT, 'src/constants');
writeDailyQuestions(path.join(outDir, 'dailyQuestionsCatalog.js'), dailyQuestions);
writeWhoMoreLikely(path.join(outDir, 'whoMoreLikelyCatalog.js'), whoMoreLikely);
writeDares(path.join(outDir, 'dareCatalog.js'), dareCatalog);
writeVoicePrompts(path.join(outDir, 'voiceBombPrompts.js'), voiceBombPrompts);

console.log('Catalog sizes:');
console.log('  Daily questions:', dailyQuestions.length);
console.log('  Who more likely:', whoMoreLikely.length);
console.log('  Dares:', dareCatalog.length);
console.log('  Voice bomb prompts:', voiceBombPrompts.length);
