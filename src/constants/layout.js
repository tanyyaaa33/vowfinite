import { Dimensions } from 'react-native';

export const SCREEN_PADDING = 16;
export const SCREEN_WIDTH = 390;
export const CONTENT_MAX_WIDTH = 358;
export const GRID_CARD_GAP = 10;

export function getLayoutWidth() {
  return Math.min(Dimensions.get('window').width, SCREEN_WIDTH);
}

export function getGridCardWidth() {
  return (getLayoutWidth() - SCREEN_PADDING * 2 - GRID_CARD_GAP) / 2;
}

export const GRID_CARD_WIDTH = getGridCardWidth();
