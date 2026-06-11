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
import { DARE_CATEGORY_COLORS } from '../constants/gameData';
import { isGuestCoupleId, showGuestSignupPrompt } from './guestMode';

export function getDareDropRef(coupleId, dareDropId) {
  return doc(db, 'couples', coupleId, 'dareDrop', dareDropId);
}

export function getCategoryColor(category) {
  return DARE_CATEGORY_COLORS[category] || DARE_CATEGORY_COLORS.Today;
}

export function normalizeDareParam(param) {
  if (!param) return {};
  if (typeof param === 'string') return { text: param };
  if (typeof param === 'object') return param;
  return {};
}

export function getRoundTimestamp(item) {
  try {
    const ts = item?.completedAt || item?.acceptedAt || item?.createdAt;
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

export function sortDareDropByDate(items = []) {
  return [...items].sort((a, b) => getRoundTimestamp(b) - getRoundTimestamp(a));
}

export function subscribeToDareDropHistory(coupleId, callback, onError) {
  if (!coupleId) {
    return () => {};
  }

  if (isGuestCoupleId(coupleId)) {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, 'couples', coupleId, 'dareDrop'),
    (snap) => {
      try {
        const items = sortDareDropByDate(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
        );
        callback(items);
      } catch (error) {
        console.warn('subscribeToDareDropHistory callback error:', error.message);
        callback([]);
      }
    },
    (error) => {
      console.warn('subscribeToDareDropHistory error:', error.message);
      onError?.(error);
      callback([]);
    }
  );
}

export function subscribeToDareDrop(coupleId, dareDropId, callback, onError) {
  if (!coupleId || !dareDropId) {
    return () => {};
  }

  if (isGuestCoupleId(coupleId)) {
    callback(null);
    return () => {};
  }

  return onSnapshot(
    getDareDropRef(coupleId, dareDropId),
    (snap) => {
      try {
        callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      } catch (error) {
        console.warn('subscribeToDareDrop callback error:', error.message);
        callback(null);
      }
    },
    (error) => {
      console.warn('subscribeToDareDrop error:', error.message);
      onError?.(error);
      callback(null);
    }
  );
}

export function findAcceptedDare(items, userId) {
  if (!userId || !Array.isArray(items)) return null;
  return (
    items.find(
      (item) => item?.userId === userId && item?.status === 'accepted'
    ) || null
  );
}

export function findCompletedDares(items, userId) {
  if (!userId || !Array.isArray(items)) return [];
  return items.filter(
    (item) => item?.userId === userId && item?.status === 'completed'
  );
}

export async function createDareDropOffer(coupleId, userId, dareMeta) {
  if (isGuestCoupleId(coupleId)) {
    showGuestSignupPrompt();
    return null;
  }

  try {
    const safeUserId = String(userId || 'user');
    const dareDropId = `${Date.now()}_${safeUserId.slice(0, 6)}`;
    const ref = getDareDropRef(coupleId, dareDropId);

    await setDoc(ref, {
      dareDropId,
      dareId: dareMeta.id,
      text: dareMeta.text,
      category: dareMeta.category,
      timeEstimate: dareMeta.timeEstimate,
      categoryColor: getCategoryColor(dareMeta.category),
      userId,
      status: 'offered',
      skipCount: dareMeta.skipCount ?? 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { dareDropId };
  } catch (error) {
    console.warn('createDareDropOffer failed:', error.message);
    throw error;
  }
}

export async function acceptDareDrop(coupleId, dareDropId, userId) {
  try {
    const ref = getDareDropRef(coupleId, dareDropId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('This dare is no longer available.');
    }

    try {
      await updateDoc(ref, {
        status: 'accepted',
        userId,
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (updateError) {
      await setDoc(
        ref,
        {
          status: 'accepted',
          userId,
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.warn('acceptDareDrop failed:', error.message);
    throw error;
  }
}

export async function skipDareDrop(coupleId, dareDropId) {
  try {
    const ref = getDareDropRef(coupleId, dareDropId);
    try {
      await updateDoc(ref, {
        status: 'skipped',
        skippedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (updateError) {
      await setDoc(
        ref,
        {
          status: 'skipped',
          skippedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.warn('skipDareDrop failed:', error.message);
    throw error;
  }
}

export async function completeDareDrop(coupleId, dareDropId, userId) {
  try {
    const ref = getDareDropRef(coupleId, dareDropId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('This dare is no longer available.');
    }

    try {
      await updateDoc(ref, {
        status: 'completed',
        userId,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (updateError) {
      await setDoc(
        ref,
        {
          status: 'completed',
          userId,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.warn('completeDareDrop failed:', error.message);
    throw error;
  }
}

export async function savePartnerDareReaction(coupleId, dareDropId, userId, reaction) {
  try {
    if (!reaction) return;
    const ref = getDareDropRef(coupleId, dareDropId);
    try {
      await updateDoc(ref, {
        partnerReaction: reaction,
        partnerReactionBy: userId,
        partnerReactionAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (updateError) {
      await setDoc(
        ref,
        {
          partnerReaction: reaction,
          partnerReactionBy: userId,
          partnerReactionAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.warn('savePartnerDareReaction failed:', error.message);
    throw error;
  }
}

export function findPendingPartnerDare(items, userId) {
  if (!userId || !Array.isArray(items)) return null;
  return (
    items.find(
      (item) =>
        item.status === 'sent_to_partner' &&
        item.targetUserId === userId
    ) || null
  );
}

export async function sendDareToPartner(coupleId, senderId, targetUserId, dareMeta) {
  if (isGuestCoupleId(coupleId)) {
    showGuestSignupPrompt();
    return null;
  }

  try {
    const dareDropId = `${Date.now()}_${String(senderId).slice(0, 6)}`;
    const ref = getDareDropRef(coupleId, dareDropId);

    await setDoc(ref, {
      dareDropId,
      dareId: dareMeta.id,
      text: dareMeta.text,
      category: dareMeta.category,
      timeEstimate: dareMeta.timeEstimate,
      categoryColor: getCategoryColor(dareMeta.category),
      userId: senderId,
      senderId,
      targetUserId,
      status: 'sent_to_partner',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { dareDropId };
  } catch (error) {
    console.warn('sendDareToPartner failed:', error.message);
    throw error;
  }
}

export async function acceptPartnerDare(coupleId, dareDropId, userId) {
  try {
    const ref = getDareDropRef(coupleId, dareDropId);
    await updateDoc(ref, {
      status: 'accepted',
      userId,
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('acceptPartnerDare failed:', error.message);
    throw error;
  }
}

export async function declinePartnerDare(coupleId, dareDropId, userId, message = '') {
  try {
    const ref = getDareDropRef(coupleId, dareDropId);
    await updateDoc(ref, {
      status: 'declined',
      declinedBy: userId,
      declineMessage: message?.trim() || null,
      declinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('declinePartnerDare failed:', error.message);
    throw error;
  }
}

export function formatDareDate(item) {
  try {
    const ts = item?.completedAt || item?.acceptedAt || item?.createdAt;
    if (!ts) return 'Recent';
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    if (Number.isNaN(date.getTime())) return 'Recent';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}
