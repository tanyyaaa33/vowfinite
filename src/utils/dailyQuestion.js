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
import { getDateKey } from './points';
import { getDailyQuestionForDate, parseDateKey } from '../constants/gameData';
import { isGuestCoupleId, showGuestSignupPrompt } from './guestMode';

export const MAX_DAILY_ANSWER_LENGTH = 500;

const CONVERSATION_STARTERS = {
  Deep: [
    'What part of their answer felt most vulnerable to share?',
    'How can you show up for each other differently this week?',
    'What did you learn about your partner that surprised you?',
  ],
  Funny: [
    'Which answer made you laugh the hardest — and why?',
    'What story from today proves this answer is true?',
    'What would the sequel to this answer look like?',
  ],
  Romantic: [
    'What memory does their answer bring back for you?',
    'How could you recreate that feeling together soon?',
    'What sweet gesture matches what they shared?',
  ],
  Fun: [
    'What would you add to their adventure plan?',
    'Which idea should you try this weekend?',
    'What is the first step to make this happen together?',
  ],
  Gratitude: [
    'What can you thank them for that you haven\'t said out loud yet?',
    'How did their answer shift how you see the relationship?',
    'What small act of appreciation could you do this week?',
  ],
  Future: [
    'What step could you take this month toward what they shared?',
    'How does their vision align with yours — where do you differ?',
    'What would make their dream feel more real and shared?',
  ],
};

export function getDailyQuestionDocRef(coupleId, dateKey = getDateKey()) {
  return doc(db, 'couples', coupleId, 'dailyQuestion', dateKey);
}

export function getPlayerSlot(userId, members = []) {
  const sorted = [...members].filter(Boolean).sort();
  const index = sorted.indexOf(userId);
  if (index === 0) return 'player1';
  if (index === 1) return 'player2';
  if (index < 0 && sorted.length <= 1) return 'player1';
  return 'player2';
}

export function getConversationStarter(category, question) {
  try {
    const pool = CONVERSATION_STARTERS[category] || CONVERSATION_STARTERS.Deep;
    const seed = (question?.length || 0) + new Date().getDate();
    return pool[seed % pool.length] || pool[0];
  } catch {
    return 'What stood out most in their answer?';
  }
}

export function subscribeToDailyQuestion(coupleId, dateKey, callback, onError) {
  if (!coupleId || !dateKey) {
    return () => {};
  }

  if (isGuestCoupleId(coupleId)) {
    callback(null);
    return () => {};
  }

  return onSnapshot(
    getDailyQuestionDocRef(coupleId, dateKey),
    (snap) => {
      try {
        callback(snap.exists() ? snap.data() : null);
      } catch (error) {
        console.warn('subscribeToDailyQuestion callback error:', error.message);
        callback(null);
      }
    },
    (error) => {
      console.warn('subscribeToDailyQuestion error:', error.message);
      onError?.(error);
      callback(null);
    }
  );
}

export function subscribeToDailyQuestionHistory(coupleId, callback, onError) {
  if (!coupleId) return () => {};

  if (isGuestCoupleId(coupleId)) {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, 'couples', coupleId, 'dailyQuestion'),
    (snap) => {
      try {
        const items = snap.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => String(b.dateKey || b.id).localeCompare(String(a.dateKey || a.id)));
        callback(items);
      } catch (error) {
        console.warn('subscribeToDailyQuestionHistory callback error:', error.message);
        callback([]);
      }
    },
    (error) => {
      console.warn('subscribeToDailyQuestionHistory error:', error.message);
      onError?.(error);
      callback([]);
    }
  );
}

export function getMissedDateKeys(history = [], userId, members, daysBack = 7) {
  const missed = [];
  const today = new Date();

  for (let i = 1; i <= daysBack; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = getDateKey(d);
    const docData = history.find((item) => item.dateKey === dateKey || item.id === dateKey);
    if (!docData) {
      missed.push(dateKey);
      continue;
    }
    if (!hasUserAnswered(docData, userId, members)) {
      missed.push(dateKey);
    }
  }

  return missed;
}

export function hasPartnerAnswered(docData, userId, members) {
  return Boolean(getPartnerAnswerFromDoc(docData, userId, members)?.trim());
}

export async function submitDailyQuestionAnswer(
  coupleId,
  userId,
  members,
  { question, category, answer, dateKey: dateKeyParam }
) {
  if (isGuestCoupleId(coupleId)) {
    showGuestSignupPrompt();
    return;
  }

  try {
    const dateKey = dateKeyParam || getDateKey();
    const ref = getDailyQuestionDocRef(coupleId, dateKey);
    const memberList = [...(members || []), userId].filter(Boolean);
    const uniqueMembers = [...new Set(memberList)];
    const slot = getPlayerSlot(userId, uniqueMembers);
    const trimmed = answer?.trim();

    if (!trimmed) {
      throw new Error('Answer cannot be empty.');
    }

    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data() : {};
    const sortedMembers = [...uniqueMembers].sort();

    const catalogMeta = getDailyQuestionForDate(parseDateKey(dateKey));
    const resolvedQuestion = question || existing.question || catalogMeta.question;
    const resolvedCategory = category || existing.category || catalogMeta.category;

    const player1Answer =
      slot === 'player1' ? trimmed : existing.player1Answer || null;
    const player2Answer =
      slot === 'player2' ? trimmed : existing.player2Answer || null;

    const bothAnswered = Boolean(player1Answer?.trim() && player2Answer?.trim());

    await setDoc(
      ref,
      {
        question: resolvedQuestion,
        category: resolvedCategory,
        dateKey,
        player1Id: sortedMembers[0] || existing.player1Id || null,
        player2Id: sortedMembers[1] || existing.player2Id || null,
        player1Answer,
        player2Answer,
        bothAnswered,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      dateKey,
      slot,
      bothAnswered,
      player1Answer,
      player2Answer,
      question: resolvedQuestion,
      category: resolvedCategory,
    };
  } catch (error) {
    console.warn('submitDailyQuestionAnswer failed:', error.message);
    throw error;
  }
}

export async function updateDailyQuestionAnswer(
  coupleId,
  userId,
  members,
  { answer, dateKey: dateKeyParam }
) {
  const dateKey = dateKeyParam || getDateKey();
  const ref = getDailyQuestionDocRef(coupleId, dateKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('No answer found for this day.');
  }

  const existing = snap.data();
  if (hasPartnerAnswered(existing, userId, members)) {
    throw new Error('Your partner already answered — edits are locked.');
  }

  const trimmed = answer?.trim();
  if (!trimmed) throw new Error('Answer cannot be empty.');

  const slot = getPlayerSlot(userId, members);
  const field = slot === 'player1' ? 'player1Answer' : 'player2Answer';

  await updateDoc(ref, {
    [field]: trimmed,
    bothAnswered: false,
    updatedAt: serverTimestamp(),
  });

  return { dateKey, answer: trimmed };
}

export async function saveDailyQuestionReaction(
  coupleId,
  dateKey,
  userId,
  members,
  reaction,
  target = 'partner'
) {
  try {
    const ref = getDailyQuestionDocRef(coupleId, dateKey);
    const slot = getPlayerSlot(userId, members);
    const field =
      target === 'self'
        ? `${slot}SelfReaction`
        : `${slot}PartnerReaction`;

    try {
      await updateDoc(ref, {
        [field]: reaction,
        updatedAt: serverTimestamp(),
      });
    } catch (updateError) {
      try {
        await setDoc(
          ref,
          {
            [field]: reaction,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (setError) {
        console.warn('saveDailyQuestionReaction setDoc failed:', setError.message);
        throw setError;
      }
    }
  } catch (error) {
    console.warn('saveDailyQuestionReaction failed:', error.message);
    throw error;
  }
}

export function getUserAnswerFromDoc(docData, userId, members) {
  if (!docData || !userId) return '';
  const slot = getPlayerSlot(userId, members);
  return String(docData[`${slot}Answer`] || '');
}

export function getPartnerAnswerFromDoc(docData, userId, members) {
  if (!docData || !userId) return '';
  const slot = getPlayerSlot(userId, members);
  const partnerSlot = slot === 'player1' ? 'player2' : 'player1';
  return String(docData[`${partnerSlot}Answer`] || '');
}

export function hasUserAnswered(docData, userId, members) {
  return Boolean(getUserAnswerFromDoc(docData, userId, members)?.trim());
}

export function canRevealAnswers(docData, userId, members) {
  if (!docData?.bothAnswered) return false;
  const userAnswer = getUserAnswerFromDoc(docData, userId, members)?.trim();
  const partnerAnswer = getPartnerAnswerFromDoc(docData, userId, members)?.trim();
  return Boolean(userAnswer && partnerAnswer);
}
