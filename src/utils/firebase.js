import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GUEST_COUPLE, GUEST_PARTNER_ID } from '../constants/guestData';
import { isGuestCoupleId } from './guestMode';

const firebaseConfig = {
  apiKey: 'AIzaSyDpwoeXXbnB4LijcsMEOMjy9CI1dUq0Y90',
  authDomain: 'vowfinity.firebaseapp.com',
  projectId: 'vowfinity',
  storageBucket: 'vowfinity.firebasestorage.app',
  messagingSenderId: '901077726876',
  appId: '1:901077726876:web:4b2c7a06c3a77e22db1f59',
};

export const isFirebaseConfigured =
  firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
  firebaseConfig.projectId !== 'YOUR_PROJECT_ID';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;
try {
  if (typeof getReactNativePersistence === 'function') {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } else {
    auth = getAuth(app);
  }
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

export {
  app,
  auth,
  db,
  storage,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  onSnapshot,
  ref,
  uploadBytes,
  getDownloadURL,
};

export async function getUserProfile(userId) {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.warn('getUserProfile failed:', error.message);
    throw error;
  }
}

export async function saveUserProfile(userId, data) {
  try {
    await setDoc(doc(db, 'users', userId), data, { merge: true });
  } catch (error) {
    console.warn('saveUserProfile failed:', error.message);
    throw error;
  }
}

export async function saveExpoPushToken(userId, token) {
  try {
    await setDoc(
      doc(db, 'users', userId),
      {
        expoPushToken: token,
        pushToken: token,
        pushTokenUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('saveExpoPushToken failed:', error.message);
    throw error;
  }
}

export async function savePushToken(userId, token) {
  return saveExpoPushToken(userId, token);
}

export async function getExpoPushToken(userId) {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return data.expoPushToken || data.pushToken || null;
  } catch (error) {
    console.warn('getExpoPushToken failed:', error.message);
    return null;
  }
}

export async function getPartnerUserId(coupleId, currentUserId) {
  if (isGuestCoupleId(coupleId)) {
    return GUEST_PARTNER_ID;
  }

  try {
    const snap = await getDoc(doc(db, 'couples', coupleId));
    if (!snap.exists()) return null;
    const members = snap.data().members || [];
    return members.find((id) => id && id !== currentUserId) || null;
  } catch (error) {
    console.warn('getPartnerUserId failed:', error.message);
    return null;
  }
}

export async function getCoupleMemberIds(coupleId) {
  if (isGuestCoupleId(coupleId)) {
    return GUEST_COUPLE.members;
  }

  try {
    const snap = await getDoc(doc(db, 'couples', coupleId));
    if (!snap.exists()) return [];
    return snap.data().members || [];
  } catch (error) {
    console.warn('getCoupleMemberIds failed:', error.message);
    return [];
  }
}

export async function saveNotificationRecord(userId, notification) {
  try {
    await addDoc(collection(db, 'notifications', userId, 'items'), {
      ...notification,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('saveNotificationRecord failed:', error.message);
    throw error;
  }
}

export async function createCouple(userId, inviteCode) {
  try {
    const coupleRef = doc(collection(db, 'couples'));
    await setDoc(coupleRef, {
      members: [userId],
      inviteCode,
      createdAt: serverTimestamp(),
      points: 0,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      streak: 0,
      activitiesToday: 0,
      lastActivityDate: null,
      lastStreakCheckDate: null,
      streakProtectedDate: null,
      freezeTokens: 2,
      freezeTokensMonth: null,
      unlocks: [],
      pendingMilestone: null,
    });
    await saveUserProfile(userId, { coupleId: coupleRef.id, inviteCode });
    return coupleRef.id;
  } catch (error) {
    console.warn('createCouple failed:', error.message);
    throw error;
  }
}

export async function joinCouple(userId, inviteCode) {
  try {
    const q = query(collection(db, 'couples'), where('inviteCode', '==', inviteCode.toUpperCase()));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const coupleDoc = snapshot.docs[0];
    const coupleData = coupleDoc.data();
    const members = coupleData.members || [];

    if (members.length >= 2 && !members.includes(userId)) return null;

    if (!members.includes(userId)) {
      await updateDoc(coupleDoc.ref, {
        members: [...members, userId],
      });
    }

    await saveUserProfile(userId, {
      coupleId: coupleDoc.id,
      inviteCode: inviteCode.toUpperCase(),
    });

    return coupleDoc.id;
  } catch (error) {
    console.warn('joinCouple failed:', error.message);
    throw error;
  }
}

export async function uploadAvatar(userId, uri) {
  try {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error('Could not read the selected image.');
    }
    const blob = await response.blob();
    const storageRef = ref(storage, `avatars/${userId}.jpg`);
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    await saveUserProfile(userId, { avatarUrl: downloadURL });
    return downloadURL;
  } catch (error) {
    console.warn('uploadAvatar failed:', error.message);
    throw error;
  }
}

export async function uploadVoiceRecording(coupleId, voiceBombId, uri, kind = 'message') {
  try {
    if (!coupleId || !voiceBombId || !uri) {
      throw new Error('Missing recording upload details.');
    }
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error('Could not read the voice recording.');
    }
    const blob = await response.blob();
    const storageRef = ref(
      storage,
      `voiceBombs/${coupleId}/${voiceBombId}_${kind}.m4a`
    );
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  } catch (error) {
    console.warn('uploadVoiceRecording failed:', error.message);
    throw error;
  }
}

export function subscribeToCouple(coupleId, callback, onError) {
  if (!coupleId) {
    return () => {};
  }

  return onSnapshot(
    doc(db, 'couples', coupleId),
    (snap) => {
      callback(snap.exists() ? snap.data() : null);
    },
    (error) => {
      console.warn('subscribeToCouple error:', error.message);
      onError?.(error);
      callback(null);
    }
  );
}

export function subscribeToCoupleGames(coupleId, callback, onError) {
  if (!coupleId) {
    return () => {};
  }

  return onSnapshot(
    collection(db, 'couples', coupleId, 'games'),
    (snapshot) => {
      const sessions = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      callback(sessions);
    },
    (error) => {
      console.warn('subscribeToCoupleGames error:', error.message);
      onError?.(error);
      callback([]);
    }
  );
}

export function subscribeToNotifications(userId, callback, onError) {
  if (!userId) {
    return () => {};
  }

  const q = query(
    collection(db, 'notifications', userId, 'items'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      callback(items);
    },
    (error) => {
      console.warn('subscribeToNotifications error:', error.message);
      onError?.(error);
      callback([]);
    }
  );
}

export async function markNotificationRead(userId, notificationId) {
  try {
    await updateDoc(doc(db, 'notifications', userId, 'items', notificationId), {
      read: true,
    });
  } catch (error) {
    console.warn('markNotificationRead failed:', error.message);
  }
}

export async function saveGameSession(coupleId, gameId, data) {
  if (isGuestCoupleId(coupleId)) {
    return;
  }

  try {
    await addDoc(collection(db, 'couples', coupleId, 'games'), {
      gameId,
      ...data,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('saveGameSession failed:', error.message);
    throw error;
  }
}
