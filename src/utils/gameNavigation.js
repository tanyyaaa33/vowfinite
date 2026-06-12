import { getDailyQuestionStatus, getWhoMoreLikelyStatus } from './gamesHub';
import { getHes10NavigationTarget } from './hes10But';
import {
  findPartnerDareNeedingReaction,
  findUserDareToday,
  getDareNavigationParams,
} from './dareDrop';

export function navigateToGamesHub(navigation) {
  if (!navigation?.navigate) return;

  try {
    navigation.navigate('MainTabs', { screen: 'Games' });
  } catch (error) {
    try {
      navigation.goBack();
    } catch {
      console.warn('navigateToGamesHub failed:', error?.message);
    }
  }
}

export function getGameNavigationTarget(gameId, context = {}) {
  const {
    sessions = [],
    hes10Rounds = [],
    dareDropHistory = [],
    userId,
    partnerId,
    partnerName,
  } = context;

  switch (gameId) {
    case 'hes-a-10-but':
      return getHes10NavigationTarget(hes10Rounds, userId);

    case 'daily-question': {
      const status = getDailyQuestionStatus(sessions, userId, partnerId, partnerName);
      if (status.status === 'both') {
        return { screen: 'DailyQuestionReveal', params: {} };
      }
      return { screen: 'DailyQuestionAnswer', params: {} };
    }

    case 'who-more-likely': {
      const status = getWhoMoreLikelyStatus(sessions, userId, partnerId, partnerName);
      if (status.status === 'both') {
        return { screen: 'WhoMoreLikelyReveal', params: {} };
      }
      return { screen: 'WhoMoreLikelyQuestion', params: {} };
    }

    case 'dare-drop': {
      const partnerReactionDare = findPartnerDareNeedingReaction(dareDropHistory, userId);
      if (partnerReactionDare) {
        return {
          screen: 'DareDropReaction',
          params: getDareNavigationParams(partnerReactionDare),
        };
      }

      const userDareToday = findUserDareToday(dareDropHistory, userId);
      if (userDareToday?.status === 'completed' || userDareToday?.status === 'accepted') {
        return {
          screen: 'DareDropComplete',
          params: getDareNavigationParams(userDareToday),
        };
      }

      const partnerDare = dareDropHistory.find?.(
        (item) => item.status === 'sent_to_partner' && item.targetUserId === userId
      );
      if (partnerDare) {
        return {
          screen: 'DareDropDare',
          params: getDareNavigationParams(partnerDare),
        };
      }

      if (userDareToday?.status === 'offered') {
        return {
          screen: 'DareDropDare',
          params: getDareNavigationParams(userDareToday),
        };
      }

      return { screen: 'DareDropDare', params: {} };
    }

    case 'voice-bomb': {
      const todayKey = new Date().toISOString().slice(0, 10);
      const partnerSent = sessions.some(
        (s) =>
          s.gameId === 'voice-bomb' &&
          s.userId === partnerId &&
          s.userId !== userId
      );
      if (partnerSent) {
        return { screen: 'VoiceBombListen', params: {} };
      }
      return { screen: 'VoiceBombRecord', params: {} };
    }

    default:
      return null;
  }
}
