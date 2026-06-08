import { Alert } from 'react-native';
import { GUEST_COUPLE_ID } from '../constants/guestData';

export function isGuestCoupleId(coupleId) {
  return coupleId === GUEST_COUPLE_ID;
}

export function showGuestSignupPrompt(
  message = 'Create a free account to save answers and play with your partner.'
) {
  Alert.alert('Preview mode', message, [{ text: 'OK' }]);
}

export function blockGuestWrite(isGuest, message) {
  if (!isGuest) return false;
  showGuestSignupPrompt(message);
  return true;
}
