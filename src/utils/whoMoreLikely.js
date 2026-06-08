import {
  db,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from './firebase';
import { getDateKey } from './points';
import { getPlayerSlot } from './dailyQuestion';

export function getWhoMoreLikelyDocRef(coupleId, dateKey = getDateKey()) {
  return doc(db, 'couples', coupleId, 'whoMoreLikely', dateKey);
}

export function getPartnerUserId(userId, members = []) {
  const sorted = [...members].filter(Boolean).sort();
  return sorted.find((id) => id !== userId) || null;
}

export function choiceToUserId(choice, userId, members = []) {
  if (choice === 'self') return userId;
  if (choice === 'partner') return getPartnerUserId(userId, members);
  if (typeof choice === 'string' && choice.length > 8) return choice;
  return null;
}

export function userIdToDisplayName(pickedUserId, userId, members, userName, partnerName) {
  if (!pickedUserId) return '—';
  if (pickedUserId === userId) return userName || 'You';
  return partnerName || 'Partner';
}

export function getUserChoiceFromDoc(docData, userId, members) {
  if (!docData || !userId) return null;
  const slot = getPlayerSlot(userId, members);
  return docData[`${slot}Choice`] || null;
}

export function getPartnerChoiceFromDoc(docData, userId, members) {
  if (!docData || !userId) return null;
  const slot = getPlayerSlot(userId, members);
  const partnerSlot = slot === 'player1' ? 'player2' : 'player1';
  return docData[`${partnerSlot}Choice`] || null;
}

export function hasUserAnswered(docData, userId, members) {
  return Boolean(getUserChoiceFromDoc(docData, userId, members));
}

export function canRevealWhoMoreLikely(docData, userId, members) {
  if (!docData?.bothAnswered) return false;
  return Boolean(
    getUserChoiceFromDoc(docData, userId, members) &&
      getPartnerChoiceFromDoc(docData, userId, members)
  );
}

export function choicesAgree(docData) {
  if (!docData?.player1Choice || !docData?.player2Choice) return false;
  return docData.player1Choice === docData.player2Choice;
}

export function getUserArgumentFromDoc(docData, userId, members) {
  if (!docData || !userId) return '';
  const slot = getPlayerSlot(userId, members);
  return String(docData[`${slot}Argument`] || '');
}

export function getPartnerArgumentFromDoc(docData, userId, members) {
  if (!docData || !userId) return '';
  const slot = getPlayerSlot(userId, members);
  const partnerSlot = slot === 'player1' ? 'player2' : 'player1';
  return String(docData[`${partnerSlot}Argument`] || '');
}

export function subscribeToWhoMoreLikely(coupleId, dateKey, callback, onError) {
  if (!coupleId || !dateKey) {
    return () => {};
  }

  return onSnapshot(
    getWhoMoreLikelyDocRef(coupleId, dateKey),
    (snap) => {
      try {
        callback(snap.exists() ? snap.data() : null);
      } catch (error) {
        console.warn('subscribeToWhoMoreLikely callback error:', error.message);
        callback(null);
      }
    },
    (error) => {
      console.warn('subscribeToWhoMoreLikely error:', error.message);
      onError?.(error);
      callback(null);
    }
  );
}

export async function submitWhoMoreLikelyChoice(
  coupleId,
  userId,
  members,
  { question, choice }
) {
  try {
    const dateKey = getDateKey();
    const ref = getWhoMoreLikelyDocRef(coupleId, dateKey);
    const memberList = [...new Set([...(members || []), userId].filter(Boolean))];
    const slot = getPlayerSlot(userId, memberList);
    const pickedUserId = choiceToUserId(choice, userId, memberList);

    if (!pickedUserId) {
      throw new Error('Invalid choice.');
    }

    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data() : {};
    const sortedMembers = [...memberList].sort();

    const player1Choice =
      slot === 'player1' ? pickedUserId : existing.player1Choice || null;
    const player2Choice =
      slot === 'player2' ? pickedUserId : existing.player2Choice || null;

    const bothAnswered = Boolean(player1Choice && player2Choice);
    const agreed = bothAnswered ? player1Choice === player2Choice : false;

    await setDoc(
      ref,
      {
        question: question || existing.question,
        dateKey,
        player1Id: sortedMembers[0] || existing.player1Id || null,
        player2Id: sortedMembers[1] || existing.player2Id || null,
        player1Choice,
        player2Choice,
        bothAnswered,
        agreed,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      dateKey,
      slot,
      bothAnswered,
      agreed,
      player1Choice,
      player2Choice,
      question: question || existing.question,
    };
  } catch (error) {
    console.warn('submitWhoMoreLikelyChoice failed:', error.message);
    throw error;
  }
}

export async function saveWhoMoreLikelyArgument(
  coupleId,
  dateKey,
  userId,
  members,
  argument
) {
  try {
    const ref = getWhoMoreLikelyDocRef(coupleId, dateKey);
    const slot = getPlayerSlot(userId, members);
    const trimmed = argument?.trim();
    if (!trimmed) return;

    try {
      await updateDoc(ref, {
        [`${slot}Argument`]: trimmed,
        updatedAt: serverTimestamp(),
      });
    } catch (updateError) {
      try {
        await setDoc(
          ref,
          {
            [`${slot}Argument`]: trimmed,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (setError) {
        console.warn('saveWhoMoreLikelyArgument setDoc failed:', setError.message);
        throw setError;
      }
    }
  } catch (error) {
    console.warn('saveWhoMoreLikelyArgument failed:', error.message);
    throw error;
  }
}

export async function finalizeWhoMoreLikelyRound(coupleId, dateKey, docData) {
  try {
    if (!coupleId || !dateKey || !docData?.bothAnswered) return null;

    const sessionRef = getWhoMoreLikelyDocRef(coupleId, dateKey);

    try {
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const existingSession = sessionSnap.data();
        if (existingSession?.finalized) {
          return existingSession.statsSnapshot || null;
        }
        if (existingSession?.player1Choice && existingSession?.player2Choice) {
          docData = { ...docData, ...existingSession };
        }
      }
    } catch (readError) {
      console.warn('finalizeWhoMoreLikelyRound read failed:', readError.message);
    }

    if (docData.finalized) {
      return docData.statsSnapshot || null;
    }

    const agreed = choicesAgree(docData);
    const coupleRef = doc(db, 'couples', coupleId);

    const coupleSnap = await getDoc(coupleRef);
    const existing = coupleSnap.data()?.whoMoreLikelyStats || {};
    const totalPlayed = (existing.totalPlayed || 0) + 1;
    const agreedCount = (existing.agreedCount || 0) + (agreed ? 1 : 0);
    const agreementPercent =
      totalPlayed > 0 ? Math.round((agreedCount / totalPlayed) * 100) : 0;

    const statsSnapshot = {
      totalPlayed,
      agreedCount,
      agreementPercent,
      lastPlayedAt: new Date().toISOString(),
    };

    try {
      await updateDoc(coupleRef, {
        whoMoreLikelyStats: {
          ...statsSnapshot,
          lastPlayedAt: serverTimestamp(),
        },
      });
    } catch (coupleError) {
      console.warn('finalizeWhoMoreLikelyRound couple update failed:', coupleError.message);
    }

    try {
      await updateDoc(sessionRef, {
        agreed,
        finalized: true,
        statsSnapshot,
        updatedAt: serverTimestamp(),
      });
    } catch (sessionError) {
      await setDoc(
        sessionRef,
        { agreed, finalized: true, statsSnapshot, updatedAt: serverTimestamp() },
        { merge: true }
      );
    }

    return statsSnapshot;
  } catch (error) {
    console.warn('finalizeWhoMoreLikelyRound failed:', error.message);
    return null;
  }
}

export function stripQuestionPrefix(question) {
  if (!question) return '';
  return question
    .replace(/^Who's more likely to\s+/i, '')
    .replace(/^Who is more likely to\s+/i, '')
    .trim();
}

export function formatLastPlayed(value) {
  try {
    if (!value) return 'Today';
    if (typeof value?.toDate === 'function') {
      return value.toDate().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Today';
    return parsed.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Today';
  }
}
