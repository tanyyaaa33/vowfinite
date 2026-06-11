export const VOICE_BOMB_BG = '#0D0A14';
export const RECORD_MAX_SECONDS = 30;
export const WAVEFORM_BAR_COUNT = 20;

import { VOICE_BOMB_PROMPTS } from './voiceBombPrompts';
import { getCatalogIndexForDate } from './gameData';

export { VOICE_BOMB_PROMPTS };

export function getTodayVoiceBombPrompt(date = new Date()) {
  if (!VOICE_BOMB_PROMPTS.length) {
    return { id: 'fallback', text: 'Say something from the heart' };
  }
  const index = getCatalogIndexForDate(VOICE_BOMB_PROMPTS.length, date);
  return { id: `prompt-${index}`, text: VOICE_BOMB_PROMPTS[index] };
}

export const VOICE_BOMB_REACTIONS = ['❤️', '🔥', '😭', '😮', '😂'];
