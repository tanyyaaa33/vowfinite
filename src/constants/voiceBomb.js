export const VOICE_BOMB_BG = '#0D0A14';
export const RECORD_MAX_SECONDS = 30;
export const WAVEFORM_BAR_COUNT = 20;

export const VOICE_BOMB_PROMPTS = [
  "Tell them something you've never said out loud",
  'Say why you are proud of them today',
  'Share a memory that still makes you smile',
  'Tell them what you noticed about them lately',
  'Say the thing you have been meaning to say',
  'Describe the moment you knew they were yours',
  'Tell them what you love most about their voice',
  'Share one thing they do that melts you',
];

export function getTodayVoiceBombPrompt(date = new Date()) {
  const prompts = VOICE_BOMB_PROMPTS;
  if (!prompts.length) {
    return { id: 'fallback', text: 'Say something from the heart' };
  }
  const index = date.getDate() % prompts.length;
  return { id: `prompt-${index}`, text: prompts[index] };
}

export const VOICE_BOMB_REACTIONS = ['❤️', '🔥', '😭', '😮', '😂'];
