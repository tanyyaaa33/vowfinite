import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { GUEST_PARTNER_ID, GUEST_SESSIONS } from '../constants/guestData';
import { useCouple } from './useCouple';
import { subscribeToCoupleGames, getPartnerUserId } from '../utils/firebase';
import {
  buildHubGameCards,
  getCoupleTotalPoints,
  getDailyQuestionStatus,
  getTodayQuestion,
} from '../utils/gamesHub';
import { getStreakCount } from '../utils/points';

const EMPTY_DAILY_STATUS = { status: 'answer', label: 'Answer Now' };

export function useGamesHub() {
  const { profile, profileLoading, isGuest } = useContext(AuthContext);
  const { couple, loading: coupleLoading, error: coupleError } = useCouple();
  const [sessions, setSessions] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [partnerLoading, setPartnerLoading] = useState(Boolean(profile?.coupleId));

  useEffect(() => {
    if (isGuest) {
      setPartnerId(GUEST_PARTNER_ID);
      setPartnerLoading(false);
      return undefined;
    }

    if (!profile?.coupleId || !profile?.uid) {
      setPartnerId(null);
      setPartnerLoading(false);
      return undefined;
    }

    let isActive = true;
    setPartnerLoading(true);

    (async () => {
      try {
        const id = await getPartnerUserId(profile.coupleId, profile.uid);
        if (isActive) setPartnerId(id);
      } catch (error) {
        console.warn('getPartnerUserId failed:', error.message);
        if (isActive) setPartnerId(null);
      } finally {
        if (isActive) setPartnerLoading(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [profile?.coupleId, profile?.uid, isGuest]);

  useEffect(() => {
    if (isGuest) {
      setSessions(GUEST_SESSIONS);
      setGamesLoading(false);
      setGamesError(null);
      return undefined;
    }

    if (!profile?.coupleId) {
      setSessions([]);
      setGamesLoading(false);
      setGamesError(null);
      return undefined;
    }

    let isActive = true;
    setGamesLoading(true);
    setGamesError(null);

    const unsubscribe = subscribeToCoupleGames(
      profile.coupleId,
      (data) => {
        if (!isActive) return;
        setSessions(Array.isArray(data) ? data : []);
        setGamesLoading(false);
      },
      (error) => {
        if (!isActive) return;
        setGamesError(error);
        setSessions([]);
        setGamesLoading(false);
      }
    );

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [profile?.coupleId, isGuest]);

  const hubData = useMemo(() => {
    try {
      const streak = getStreakCount(couple);
      const activitiesToday = couple?.activitiesToday ?? 0;
      const totalPoints = getCoupleTotalPoints(couple);
      const todayQuestion = getTodayQuestion();
      const dailyStatus = getDailyQuestionStatus(
        sessions,
        profile?.uid,
        partnerId,
        profile?.partnerName
      );
      const games = buildHubGameCards(sessions, profile?.uid, partnerId);

      return {
        streak,
        activitiesToday,
        totalPoints,
        todayQuestion,
        dailyStatus,
        games,
      };
    } catch (error) {
      console.warn('useGamesHub hubData failed:', error.message);
      return {
        streak: 0,
        activitiesToday: 0,
        totalPoints: 0,
        todayQuestion: getTodayQuestion(),
        dailyStatus: EMPTY_DAILY_STATUS,
        games: buildHubGameCards([], profile?.uid, partnerId),
      };
    }
  }, [couple, sessions, profile?.uid, profile?.partnerName, partnerId]);

  const hasCouple = Boolean(profile?.coupleId);
  const loading = isGuest
    ? coupleLoading
    : profileLoading || (hasCouple && (coupleLoading || gamesLoading || partnerLoading));

  return {
    ...hubData,
    couple,
    loading,
    error: coupleError || gamesError,
    partnerId,
  };
}
