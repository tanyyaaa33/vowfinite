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

export function getVoiceBombRef(coupleId, voiceBombId) {
  return doc(db, 'couples', coupleId, 'voiceBomb', voiceBombId);
}

export function subscribeToVoiceBomb(coupleId, voiceBombId, callback, onError) {
  if (!coupleId || !voiceBombId) {
    return () => {};
  }

  return onSnapshot(
    getVoiceBombRef(coupleId, voiceBombId),
    (snap) => {
      try {
        callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      } catch (error) {
        console.warn('subscribeToVoiceBomb callback error:', error.message);
        callback(null);
      }
    },
    (error) => {
      console.warn('subscribeToVoiceBomb error:', error.message);
      onError?.(error);
      callback(null);
    }
  );
}

export async function createVoiceBomb(coupleId, userId, payload, voiceBombIdOverride) {
  try {
    const safeUserId = String(userId || 'user');
    const voiceBombId =
      voiceBombIdOverride || `${Date.now()}_${safeUserId.slice(0, 6)}`;
    const ref = getVoiceBombRef(coupleId, voiceBombId);

    await setDoc(ref, {
      voiceBombId,
      senderId: userId,
      senderName: payload.senderName || 'You',
      prompt: payload.prompt,
      promptId: payload.promptId,
      audioUrl: payload.audioUrl,
      durationSec: payload.durationSec ?? 0,
      status: 'sent',
      reaction: null,
      replyAudioUrl: null,
      replySenderId: null,
      replyDurationSec: null,
      archived: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { voiceBombId };
  } catch (error) {
    console.warn('createVoiceBomb failed:', error.message);
    throw error;
  }
}

export async function markVoiceBombListened(coupleId, voiceBombId, userId) {
  try {
    const ref = getVoiceBombRef(coupleId, voiceBombId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    await updateDoc(ref, {
      status: snap.data()?.status === 'replied' ? 'replied' : 'listened',
      listenedBy: userId,
      listenedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('markVoiceBombListened failed:', error.message);
  }
}

export async function saveVoiceBombReaction(coupleId, voiceBombId, userId, reaction) {
  try {
    if (!reaction) return;
    const ref = getVoiceBombRef(coupleId, voiceBombId);
    await updateDoc(ref, {
      reaction,
      reactionBy: userId,
      reactionAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('saveVoiceBombReaction failed:', error.message);
    throw error;
  }
}

export async function saveVoiceBombReply(coupleId, voiceBombId, userId, payload) {
  try {
    const ref = getVoiceBombRef(coupleId, voiceBombId);
    await updateDoc(ref, {
      status: 'replied',
      replyAudioUrl: payload.replyAudioUrl,
      replySenderId: userId,
      replyDurationSec: payload.replyDurationSec ?? 0,
      repliedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      archived: true,
    });
  } catch (error) {
    console.warn('saveVoiceBombReply failed:', error.message);
    throw error;
  }
}
