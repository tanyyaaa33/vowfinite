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
import { isGuestCoupleId } from './guestMode';
import { getPlayerSlot } from './dailyQuestion';
import { GUEST_USER_ID, GUEST_PARTNER_ID } from '../constants/guestData';
import {
  getTodayWhoMoreLikelyQuestions,
  WHO_MORE_LIKELY_BATCH_SIZE,
} from '../constants/gameData';

const guestSessions = new Map();
const guestSubscribers = new Map();

export function buildWhoMoreLikelyMemberList(members = [], userId, { isGuest = false } = {}) {
  const base = [...new Set([...(members || []), userId].filter(Boolean))];
  if (isGuest) {
    return [...new Set([...base, GUEST_USER_ID, GUEST_PARTNER_ID])];
  }
  return base;
}

function getGuestSession(dateKey, questions) {
  if (!guestSessions.has(dateKey)) {
    const sessionQuestions = questions?.length
      ? questions
      : getTodayWhoMoreLikelyQuestions();
    guestSessions.set(dateKey, {
      questions: sessionQuestions,
      questionCount: sessionQuestions.length || WHO_MORE_LIKELY_BATCH_SIZE,
      dateKey,
      player1Id: GUEST_USER_ID,
      player2Id: GUEST_PARTNER_ID,
      player1Answers: {},
      player2Answers: {},
      player1Completed: false,
      player2Completed: false,
      bothCompleted: false,
      bothAnswered: false,
      matchCount: null,
      agreed: false,
    });
  }
  return guestSessions.get(dateKey);
}

function notifyGuestSubscribers(dateKey) {
  const data = guestSessions.get(dateKey) || null;
  const subs = guestSubscribers.get(dateKey);
  if (!subs) return;
  subs.forEach((callback) => {
    try {
      callback(data);
    } catch (error) {
      console.warn('guest whoMoreLikely subscriber error:', error.message);
    }
  });
}

function applyWhoMoreLikelyAnswer(existing, userId, memberList, { questions, questionIndex, choice }) {
  const slot = getPlayerSlot(userId, memberList);
  const pickedUserId = choiceToUserId(choice, userId, memberList);

  if (!pickedUserId) {
    if (choice === 'partner' && !getPartnerUserId(userId, memberList)) {
      throw new Error("Your partner hasn't joined yet — share your invite code first.");
    }
    if (!userId) {
      throw new Error('Sign in to save your answer.');
    }
    throw new Error('Invalid choice.');
  }

  const sortedMembers = [...memberList].sort();
  const sessionQuestions = getSessionQuestions(existing, questions);
  const questionCount = sessionQuestions.length || WHO_MORE_LIKELY_BATCH_SIZE;
  const answersField = getAnswersField(slot);

  const updatedAnswers = {
    ...normalizeAnswersMap(existing[answersField]),
    [String(questionIndex)]: pickedUserId,
  };

  const player1Answers =
    slot === 'player1'
      ? updatedAnswers
      : normalizeAnswersMap(existing.player1Answers);
  const player2Answers =
    slot === 'player2'
      ? updatedAnswers
      : normalizeAnswersMap(existing.player2Answers);

  const player1Completed = countAnswers(player1Answers) >= questionCount;
  const player2Completed = countAnswers(player2Answers) >= questionCount;
  const bothCompleted = player1Completed && player2Completed;

  let matchCount = existing.matchCount ?? null;
  let agreed = existing.agreed ?? false;
  if (bothCompleted) {
    matchCount = computeMatchCount(player1Answers, player2Answers, questionCount);
    agreed = matchCount === questionCount;
  }

  return {
    questions: sessionQuestions,
    questionCount,
    dateKey: existing.dateKey,
    player1Id: sortedMembers[0] || existing.player1Id || null,
    player2Id: sortedMembers[1] || existing.player2Id || null,
    player1Answers,
    player2Answers,
    player1Completed,
    player2Completed,
    bothCompleted,
    bothAnswered: bothCompleted,
    matchCount,
    agreed,
    slot,
    questionIndex,
    sessionQuestions,
  };
}

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

function getAnswersField(slot) {
  return `${slot}Answers`;
}

function normalizeAnswersMap(value) {
  if (!value || typeof value !== 'object') return {};
  return value;
}

function countAnswers(answers) {
  return Object.values(normalizeAnswersMap(answers)).filter(Boolean).length;
}

export function getQuestionCount(docData) {
  return docData?.questionCount || WHO_MORE_LIKELY_BATCH_SIZE;
}

export function getSessionQuestions(docData, fallbackQuestions = []) {
  if (Array.isArray(docData?.questions) && docData.questions.length) {
    return docData.questions;
  }
  return fallbackQuestions;
}

export function getUserAnswersMap(docData, userId, members) {
  if (!docData || !userId) return {};
  const slot = getPlayerSlot(userId, members);
  return normalizeAnswersMap(docData[getAnswersField(slot)]);
}

export function getPartnerAnswersMap(docData, userId, members) {
  if (!docData || !userId) return {};
  const slot = getPlayerSlot(userId, members);
  const partnerSlot = slot === 'player1' ? 'player2' : 'player1';
  return normalizeAnswersMap(docData[getAnswersField(partnerSlot)]);
}

export function getUserChoiceFromDoc(docData, userId, members) {
  const answers = getUserAnswersMap(docData, userId, members);
  if (Object.keys(answers).length) {
    return answers['0'] || null;
  }
  if (!docData || !userId) return null;
  const slot = getPlayerSlot(userId, members);
  return docData[`${slot}Choice`] || null;
}

export function getPartnerChoiceFromDoc(docData, userId, members) {
  const answers = getPartnerAnswersMap(docData, userId, members);
  if (Object.keys(answers).length) {
    return answers['0'] || null;
  }
  if (!docData || !userId) return null;
  const slot = getPlayerSlot(userId, members);
  const partnerSlot = slot === 'player1' ? 'player2' : 'player1';
  return docData[`${partnerSlot}Choice`] || null;
}

export function hasUserAnswered(docData, userId, members) {
  return hasUserCompletedAll(docData, userId, members);
}

export function hasUserCompletedAll(docData, userId, members) {
  if (!docData || !userId) return false;

  const slot = getPlayerSlot(userId, members);
  if (docData[`${slot}Completed`]) return true;

  const answers = getUserAnswersMap(docData, userId, members);
  if (Object.keys(answers).length) {
    return countAnswers(answers) >= getQuestionCount(docData);
  }

  return Boolean(docData[`${slot}Choice`]);
}

export function getUserAnsweredCount(docData, userId, members) {
  const answers = getUserAnswersMap(docData, userId, members);
  if (Object.keys(answers).length) {
    return countAnswers(answers);
  }
  return hasUserCompletedAll(docData, userId, members) ? 1 : 0;
}

export function computeMatchCount(player1Answers, player2Answers, questionCount) {
  let matches = 0;
  for (let i = 0; i < questionCount; i += 1) {
    const key = String(i);
    const left = player1Answers?.[key];
    const right = player2Answers?.[key];
    if (left && right && left === right) {
      matches += 1;
    }
  }
  return matches;
}

export function canRevealWhoMoreLikely(docData, userId, members) {
  if (!docData) return false;

  if (docData.bothCompleted) {
    return (
      hasUserCompletedAll(docData, userId, members) &&
      getUserAnsweredCount(docData, userId, members) > 0
    );
  }

  if (docData.bothAnswered) {
    return Boolean(
      getUserChoiceFromDoc(docData, userId, members) &&
        getPartnerChoiceFromDoc(docData, userId, members)
    );
  }

  return false;
}

export function choicesAgree(docData) {
  if (!docData) return false;
  if (typeof docData.matchCount === 'number') {
    return docData.matchCount === getQuestionCount(docData);
  }
  if (!docData?.player1Choice || !docData?.player2Choice) return false;
  return docData.player1Choice === docData.player2Choice;
}

export function getMatchCountFromDoc(docData) {
  if (!docData) return 0;
  if (typeof docData.matchCount === 'number') return docData.matchCount;
  return choicesAgree(docData) ? 1 : 0;
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

  if (isGuestCoupleId(coupleId)) {
    if (!guestSubscribers.has(dateKey)) {
      guestSubscribers.set(dateKey, new Set());
    }
    guestSubscribers.get(dateKey).add(callback);
    callback(getGuestSession(dateKey));

    return () => {
      guestSubscribers.get(dateKey)?.delete(callback);
    };
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

export async function submitWhoMoreLikelyAnswer(
  coupleId,
  userId,
  members,
  { questions, questionIndex, choice }
) {
  const dateKey = getDateKey();
  const memberList = buildWhoMoreLikelyMemberList(members, userId, {
    isGuest: isGuestCoupleId(coupleId),
  });

  if (isGuestCoupleId(coupleId)) {
    try {
      const existing = getGuestSession(dateKey, questions);
      const result = applyWhoMoreLikelyAnswer(existing, userId, memberList, {
        questions,
        questionIndex,
        choice,
      });
      const nextDoc = {
        ...existing,
        questions: result.sessionQuestions,
        questionCount: result.questionCount,
        dateKey,
        player1Id: result.player1Id,
        player2Id: result.player2Id,
        player1Answers: result.player1Answers,
        player2Answers: result.player2Answers,
        player1Completed: result.player1Completed,
        player2Completed: result.player2Completed,
        bothCompleted: result.bothCompleted,
        bothAnswered: result.bothAnswered,
        matchCount: result.matchCount,
        agreed: result.agreed,
      };
      guestSessions.set(dateKey, nextDoc);
      notifyGuestSubscribers(dateKey);
      return {
        dateKey,
        slot: result.slot,
        questionIndex: result.questionIndex,
        questionCount: result.questionCount,
        player1Answers: result.player1Answers,
        player2Answers: result.player2Answers,
        player1Completed: result.player1Completed,
        player2Completed: result.player2Completed,
        bothCompleted: result.bothCompleted,
        bothAnswered: result.bothAnswered,
        matchCount: result.matchCount,
        agreed: result.agreed,
        questions: result.sessionQuestions,
      };
    } catch (error) {
      console.warn('submitWhoMoreLikelyAnswer guest failed:', error.message);
      throw error;
    }
  }

  try {
    const ref = getWhoMoreLikelyDocRef(coupleId, dateKey);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? { ...snap.data(), dateKey } : { dateKey };
    const result = applyWhoMoreLikelyAnswer(existing, userId, memberList, {
      questions,
      questionIndex,
      choice,
    });

    await setDoc(
      ref,
      {
        questions: result.sessionQuestions,
        questionCount: result.questionCount,
        dateKey,
        player1Id: result.player1Id,
        player2Id: result.player2Id,
        player1Answers: result.player1Answers,
        player2Answers: result.player2Answers,
        player1Completed: result.player1Completed,
        player2Completed: result.player2Completed,
        bothCompleted: result.bothCompleted,
        bothAnswered: result.bothAnswered,
        matchCount: result.matchCount,
        agreed: result.agreed,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      dateKey,
      slot: result.slot,
      questionIndex: result.questionIndex,
      questionCount: result.questionCount,
      player1Answers: result.player1Answers,
      player2Answers: result.player2Answers,
      player1Completed: result.player1Completed,
      player2Completed: result.player2Completed,
      bothCompleted: result.bothCompleted,
      bothAnswered: result.bothAnswered,
      matchCount: result.matchCount,
      agreed: result.agreed,
      questions: result.sessionQuestions,
    };
  } catch (error) {
    console.warn('submitWhoMoreLikelyAnswer failed:', error.message);
    throw error;
  }
}

export async function submitWhoMoreLikelyChoice(
  coupleId,
  userId,
  members,
  { question, choice, questions = getTodayWhoMoreLikelyQuestions() }
) {
  return submitWhoMoreLikelyAnswer(coupleId, userId, members, {
    questions,
    questionIndex: 0,
    choice,
    question,
  });
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
    if (!coupleId || !dateKey || !docData) return null;

    const sessionRef = getWhoMoreLikelyDocRef(coupleId, dateKey);

    try {
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const existingSession = sessionSnap.data();
        if (existingSession?.finalized) {
          return existingSession.statsSnapshot || null;
        }
        if (existingSession?.bothCompleted || existingSession?.bothAnswered) {
          docData = { ...docData, ...existingSession };
        }
      }
    } catch (readError) {
      console.warn('finalizeWhoMoreLikelyRound read failed:', readError.message);
    }

    if (docData.finalized) {
      return docData.statsSnapshot || null;
    }

    const questionCount = getQuestionCount(docData);
    const matchCount =
      typeof docData.matchCount === 'number'
        ? docData.matchCount
        : computeMatchCount(
            docData.player1Answers,
            docData.player2Answers,
            questionCount
          );

    const coupleRef = doc(db, 'couples', coupleId);
    const coupleSnap = await getDoc(coupleRef);
    const existing = coupleSnap.data()?.whoMoreLikelyStats || {};
    const totalPlayed = (existing.totalPlayed || 0) + 1;
    const agreedCount = (existing.agreedCount || 0) + matchCount;
    const totalQuestions = (existing.totalQuestions || 0) + questionCount;
    const agreementPercent =
      totalQuestions > 0 ? Math.round((agreedCount / totalQuestions) * 100) : 0;

    const statsSnapshot = {
      totalPlayed,
      agreedCount,
      totalQuestions,
      agreementPercent,
      lastMatchCount: matchCount,
      lastQuestionCount: questionCount,
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

    const agreed = matchCount === questionCount;

    try {
      await updateDoc(sessionRef, {
        matchCount,
        agreed,
        finalized: true,
        statsSnapshot,
        updatedAt: serverTimestamp(),
      });
    } catch (sessionError) {
      await setDoc(
        sessionRef,
        { matchCount, agreed, finalized: true, statsSnapshot, updatedAt: serverTimestamp() },
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
