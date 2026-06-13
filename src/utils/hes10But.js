import {
  db,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  collection,
  serverTimestamp,
} from './firebase';
import { getPlayerSlot } from './dailyQuestion';
import { isGuestCoupleId, showGuestSignupPrompt } from './guestMode';
import { getDateKey } from './points';

export const MIN_SENTENCE_LENGTH = 10;
export const CREATOR_DISPLAY_RATING = 10;

export function getHes10RoundRef(coupleId, roundId) {
  return doc(db, 'couples', coupleId, 'hes10But', roundId);
}

export function getHes10Starter() {
  return "They're a 10 but";
}

export function getPartnerSubjectPronoun() {
  return 'They';
}

export function buildFullSentence(starter, suffix) {
  const base = starter?.trim() || "They're a 10 but";
  const trimmed = suffix?.trim();
  if (!trimmed) return base;
  return `${base} ${trimmed}`;
}

export function normalizeSentenceSuffix(text) {
  return String(text || '')
    .trim()
    .replace(/^\.{3}\s*/i, '')
    .replace(/^but\s+/i, '');
}

export function getRoundTimestamp(round) {
  try {
    const ts = round?.ratedAt || round?.createdAt;
    if (!ts) return 0;
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') {
      const parsed = new Date(ts).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    return 0;
  } catch {
    return 0;
  }
}

export function sortRoundsByDate(rounds = []) {
  return [...rounds].sort((a, b) => getRoundTimestamp(b) - getRoundTimestamp(a));
}

export function isRoundFromToday(round, todayKey = getDateKey()) {
  const ts = getRoundTimestamp(round);
  if (!ts) return false;
  return getDateKey(new Date(ts)) === todayKey;
}

export function subscribeToHes10Round(coupleId, roundId, callback, onError) {
  if (!coupleId || !roundId) {
    return () => {};
  }

  if (isGuestCoupleId(coupleId)) {
    callback(null);
    return () => {};
  }

  return onSnapshot(
    getHes10RoundRef(coupleId, roundId),
    (snap) => {
      try {
        callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      } catch (error) {
        console.warn('subscribeToHes10Round callback error:', error.message);
        callback(null);
      }
    },
    (error) => {
      console.warn('subscribeToHes10Round error:', error.message);
      onError?.(error);
      callback(null);
    }
  );
}

export function subscribeToHes10History(coupleId, callback, onError) {
  if (!coupleId) {
    return () => {};
  }

  if (isGuestCoupleId(coupleId)) {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, 'couples', coupleId, 'hes10But'),
    (snap) => {
      try {
        const rounds = sortRoundsByDate(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
        );
        callback(rounds);
      } catch (error) {
        console.warn('subscribeToHes10History callback error:', error.message);
        callback([]);
      }
    },
    (error) => {
      console.warn('subscribeToHes10History error:', error.message);
      onError?.(error);
      callback([]);
    }
  );
}

export function findPendingRoundForUser(rounds, userId) {
  if (!userId || !Array.isArray(rounds)) return null;
  const sorted = sortRoundsByDate(rounds);
  return (
    sorted.find(
      (round) =>
        round?.status === 'awaiting_rating' &&
        round?.status !== 'cancelled' &&
        round?.creatorId &&
        round.creatorId !== userId &&
        round.partnerRating == null
    ) || null
  );
}

export function findAwaitingRoundForCreator(rounds, userId) {
  if (!userId || !Array.isArray(rounds)) return null;
  const sorted = sortRoundsByDate(rounds);
  return (
    sorted.find(
      (round) =>
        round?.creatorId === userId &&
        round?.status === 'awaiting_rating' &&
        round.partnerRating == null
    ) || null
  );
}

export function findRatedRoundForCreator(rounds, userId, todayKey = null) {
  if (!userId || !Array.isArray(rounds)) return null;
  const sorted = sortRoundsByDate(rounds);
  return (
    sorted.find(
      (round) =>
        round?.creatorId === userId &&
        round?.partnerRating != null &&
        round?.status === 'rated' &&
        (todayKey == null || isRoundFromToday(round, todayKey))
    ) || null
  );
}

export function findRatedRoundForRater(rounds, userId, todayKey = null) {
  if (!userId || !Array.isArray(rounds)) return null;
  const sorted = sortRoundsByDate(rounds);
  return (
    sorted.find(
      (round) =>
        round?.raterId === userId &&
        round?.partnerRating != null &&
        round?.status === 'rated' &&
        (todayKey == null || isRoundFromToday(round, todayKey))
    ) || null
  );
}

export function getHes10NavigationTarget(rounds, userId) {
  const pending = findPendingRoundForUser(rounds, userId);
  if (pending?.id) {
    return {
      screen: 'Hesa10ButRate',
      params: { roundId: pending.id, prompt: pending.fullSentence },
    };
  }

  const todayKey = getDateKey();

  const creatorReveal = findRatedRoundForCreator(rounds, userId, todayKey);
  if (creatorReveal?.id) {
    return {
      screen: 'Hesa10ButReveal',
      params: {
        roundId: creatorReveal.id,
        fullSentence: creatorReveal.fullSentence,
        partnerRating: creatorReveal.partnerRating,
      },
    };
  }

  const raterReveal = findRatedRoundForRater(rounds, userId, todayKey);
  if (raterReveal?.id) {
    return {
      screen: 'Hesa10ButReveal',
      params: {
        roundId: raterReveal.id,
        fullSentence: raterReveal.fullSentence,
        partnerRating: raterReveal.partnerRating,
      },
    };
  }

  return { screen: 'Hesa10ButCreate', params: {} };
}

export function getHes10ButStatus(rounds, userId, partnerName) {
  const pending = findPendingRoundForUser(rounds, userId);
  if (pending) {
    return { status: 'rate', label: 'Rate their sentence' };
  }

  const awaiting = findAwaitingRoundForCreator(rounds, userId);
  if (awaiting) {
    return {
      status: 'waiting',
      label: `Waiting for ${partnerName || 'partner'}`,
    };
  }

  const todayKey = getDateKey();
  const revealReady =
    findRatedRoundForCreator(rounds, userId, todayKey) ||
    findRatedRoundForRater(rounds, userId, todayKey);
  if (revealReady) {
    return { status: 'reveal', label: 'See their rating' };
  }

  return { status: 'play', label: 'Send a sentence' };
}

export async function createHes10Round(
  coupleId,
  userId,
  members,
  { starter, sentenceSuffix, fullSentence }
) {
  if (isGuestCoupleId(coupleId)) {
    showGuestSignupPrompt();
    return null;
  }

  try {
    const suffix = normalizeSentenceSuffix(sentenceSuffix);
    if (suffix.length < MIN_SENTENCE_LENGTH) {
      throw new Error('Finish the sentence with at least 10 characters.');
    }

    const safeUserId = String(userId || 'user');
    const roundId = `${Date.now()}_${safeUserId.slice(0, 6)}`;
    const ref = getHes10RoundRef(coupleId, roundId);
    const sortedMembers = [...new Set([...(members || []), userId].filter(Boolean))].sort();

    await setDoc(ref, {
      starter: starter || "They're a 10 but",
      sentenceSuffix: suffix,
      fullSentence: fullSentence || buildFullSentence(starter, suffix),
      creatorId: userId,
      player1Id: sortedMembers[0] || userId,
      player2Id: sortedMembers[1] || null,
      status: 'awaiting_rating',
      partnerRating: null,
      creatorRating: CREATOR_DISPLAY_RATING,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { roundId, fullSentence: fullSentence || buildFullSentence(starter, suffix) };
  } catch (error) {
    console.warn('createHes10Round failed:', error.message);
    throw error;
  }
}

export async function submitHes10Rating(coupleId, roundId, userId, rating) {
  try {
    const value = Math.round(Number(rating));
    if (!roundId || value < 1 || value > 10) {
      throw new Error('Pick a rating between 1 and 10.');
    }

    const ref = getHes10RoundRef(coupleId, roundId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('This round is no longer available.');
    }

    const data = snap.data();
    if (data.creatorId === userId) {
      throw new Error('Wait for your partner to rate this one.');
    }
    if (data.partnerRating != null) {
      throw new Error('This round was already rated.');
    }

    try {
      await updateDoc(ref, {
        partnerRating: value,
        raterId: userId,
        status: 'rated',
        ratedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (updateError) {
      try {
        await setDoc(
          ref,
          {
            partnerRating: value,
            raterId: userId,
            status: 'rated',
            ratedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (setError) {
        console.warn('submitHes10Rating setDoc failed:', setError.message);
        throw setError;
      }
    }

    return { roundId, partnerRating: value };
  } catch (error) {
    console.warn('submitHes10Rating failed:', error.message);
    throw error;
  }
}

export async function saveHes10Reaction(coupleId, roundId, userId, members, reaction) {
  try {
    if (!reaction) return;
    const ref = getHes10RoundRef(coupleId, roundId);
    const slot = getPlayerSlot(userId, members);
    const field = `${slot}Reaction`;

    try {
      await updateDoc(ref, {
        [field]: reaction,
        updatedAt: serverTimestamp(),
      });
    } catch (updateError) {
      try {
        await setDoc(ref, { [field]: reaction, updatedAt: serverTimestamp() }, { merge: true });
      } catch (setError) {
        console.warn('saveHes10Reaction setDoc failed:', setError.message);
        throw setError;
      }
    }
  } catch (error) {
    console.warn('saveHes10Reaction failed:', error.message);
    throw error;
  }
}

export async function saveHes10Comment(coupleId, roundId, userId, members, comment) {
  try {
    const trimmed = comment?.trim();
    if (!trimmed) return;

    const ref = getHes10RoundRef(coupleId, roundId);
    const slot = getPlayerSlot(userId, members);
    const field = `${slot}Comment`;

    try {
      await updateDoc(ref, {
        [field]: trimmed,
        updatedAt: serverTimestamp(),
      });
    } catch (updateError) {
      try {
        await setDoc(ref, { [field]: trimmed, updatedAt: serverTimestamp() }, { merge: true });
      } catch (setError) {
        console.warn('saveHes10Comment setDoc failed:', setError.message);
        throw setError;
      }
    }
  } catch (error) {
    console.warn('saveHes10Comment failed:', error.message);
    throw error;
  }
}

export function getUserReactionFromRound(round, userId, members) {
  if (!round || !userId) return null;
  const slot = getPlayerSlot(userId, members);
  return round[`${slot}Reaction`] || null;
}

export function getUserCommentFromRound(round, userId, members) {
  if (!round || !userId) return '';
  const slot = getPlayerSlot(userId, members);
  return String(round[`${slot}Comment`] || '');
}

export function getPartnerCommentFromRound(round, userId, members) {
  if (!round || !userId) return '';
  const slot = getPlayerSlot(userId, members);
  const partnerSlot = slot === 'player1' ? 'player2' : 'player1';
  return String(round[`${partnerSlot}Comment`] || '');
}

export function canShowHes10Reveal(round) {
  return Boolean(round?.fullSentence && round?.partnerRating != null);
}

export function shouldShowBotherNudge(rounds = []) {
  const rated = rounds.filter((round) => round?.partnerRating != null).slice(0, 3);
  return rated.length >= 3 && rated.every((round) => round.partnerRating >= 7);
}

export async function cancelHes10Round(coupleId, roundId, userId) {
  try {
    const ref = getHes10RoundRef(coupleId, roundId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Round not found.');

    const data = snap.data();
    if (data.creatorId !== userId) {
      throw new Error('Only the sender can cancel this round.');
    }
    if (data.partnerRating != null) {
      throw new Error('Already rated — cannot cancel.');
    }

    await updateDoc(ref, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('cancelHes10Round failed:', error.message);
    throw error;
  }
}

export function formatRoundDate(round) {
  try {
    const ts = round?.ratedAt || round?.createdAt;
    if (!ts) return 'Recent';
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    if (Number.isNaN(date.getTime())) return 'Recent';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}
