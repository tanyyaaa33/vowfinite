import { getDailyQuestionStatus, getWhoMoreLikelyStatus } from './gamesHub';
import { getHes10NavigationTarget } from './hes10But';

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
      const partnerDare = sessions.find?.(
        (s) => s.gameId === 'dare-drop' && s.stage === 'sent_to_partner'
      );
      if (partnerDare?.dareDropId) {
        return { screen: 'DareDropDare', params: { dareDropId: partnerDare.dareDropId } };
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
