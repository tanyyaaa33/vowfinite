import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  saveExpoPushToken,
  getExpoPushToken,
  saveNotificationRecord,
  getPartnerUserId,
  getCoupleMemberIds,
} from './firebase';

// Keep in sync with ACTIVITIES_REQUIRED in points.js (avoid circular import).
const ACTIVITIES_REQUIRED = 3;

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient' ||
  (Constants.executionEnvironment !== 'standalone' &&
    Constants.executionEnvironment !== 'bare');

let notificationsModule;

function getNotifications() {
  if (isExpoGo) {
    return null;
  }

  if (notificationsModule !== undefined) {
    return notificationsModule;
  }

  try {
    notificationsModule = require('expo-notifications');
    if (typeof notificationsModule?.setNotificationHandler !== 'function') {
      notificationsModule = null;
      return null;
    }
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    return notificationsModule;
  } catch (error) {
    console.warn('expo-notifications unavailable:', error.message);
    notificationsModule = null;
    return null;
  }
}

export const isNotificationsSupported = () => getNotifications() != null;

export const NOTIFICATION_TYPES = {
  DAILY_QUESTION_READY: 'daily_question_ready',
  PARTNER_ANSWERED: 'partner_answered',
  WHO_MORE_LIKELY: 'who_more_likely',
  HESA10BUT_SENT: 'hesa10but_sent',
  HESA10BUT_RATED: 'hesa10but_rated',
  DARE_COMPLETED: 'dare_completed',
  VOICE_BOMB_SENT: 'voice_bomb_sent',
  VOICE_BOMB_REPLY: 'voice_bomb_reply',
  GOOD_MORNING: 'good_morning',
  GOOD_NIGHT: 'good_night',
  STREAK_RISK: 'streak_risk',
  STREAK_MILESTONE: 'streak_milestone',
  POINTS_UNLOCK: 'points_unlock',
  SURPRISE_SENT: 'surprise_sent',
};

export const DAILY_QUESTION_REMINDER_ID = 'daily-question-8pm';
export const STREAK_RISK_ID = 'streak-risk-9pm';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

let foregroundToastHandler = null;

export function setForegroundNotificationHandler(handler) {
  foregroundToastHandler = handler;
}

export function getForegroundNotificationHandler() {
  return foregroundToastHandler;
}

export function buildNotificationContent(type, data = {}) {
  const name = data.partnerName || data.senderName || data.name || 'Your partner';
  const streak = data.streak ?? data.days ?? 0;
  const featureName = data.featureName || data.title || 'a new reward';

  switch (type) {
    case NOTIFICATION_TYPES.DAILY_QUESTION_READY:
      return { title: 'VowFinity', body: "Today's question is ready ✨" };
    case NOTIFICATION_TYPES.PARTNER_ANSWERED:
      return { title: 'VowFinity', body: `${name} answered today's question 👀` };
    case NOTIFICATION_TYPES.WHO_MORE_LIKELY:
      return { title: 'VowFinity', body: `${name} just answered — who did they pick? 👀` };
    case NOTIFICATION_TYPES.HESA10BUT_SENT:
      return { title: 'VowFinity', body: `${name} has something to say about you 💅` };
    case NOTIFICATION_TYPES.HESA10BUT_RATED:
      return { title: 'VowFinity', body: `${name} rated your sentence — see the score 💅` };
    case NOTIFICATION_TYPES.DARE_COMPLETED:
      return { title: 'VowFinity', body: `${name} just did something for you today 💝` };
    case NOTIFICATION_TYPES.VOICE_BOMB_SENT:
      return { title: 'VowFinity', body: `${name} has something to tell you 🎙️` };
    case NOTIFICATION_TYPES.VOICE_BOMB_REPLY:
      return { title: 'VowFinity', body: `${name} sent you a voice reply 🎙️` };
    case NOTIFICATION_TYPES.GOOD_MORNING:
      return { title: 'VowFinity', body: `${name} says Good Morning ☀️` };
    case NOTIFICATION_TYPES.GOOD_NIGHT:
      return { title: 'VowFinity', body: `${name} says Good Night 🌙` };
    case NOTIFICATION_TYPES.STREAK_RISK:
      return {
        title: 'VowFinity',
        body: `Your ❤️ ${streak} day streak is at risk — one more activity before midnight`,
      };
    case NOTIFICATION_TYPES.STREAK_MILESTONE:
      return {
        title: 'VowFinity',
        body: `You've kept your streak for ${streak} days 🎉`,
      };
    case NOTIFICATION_TYPES.POINTS_UNLOCK:
      return { title: 'VowFinity', body: `You unlocked ${featureName} ✨` };
    case NOTIFICATION_TYPES.SURPRISE_SENT:
      return {
        title: 'VowFinity',
        body: `${name} is planning a surprise for you ✨`,
      };
    default:
      return { title: 'VowFinity', body: data.body || 'You have a new update 💕' };
  }
}

export function getScreenForNotificationType(type, data = {}) {
  switch (type) {
    case NOTIFICATION_TYPES.DAILY_QUESTION_READY:
      return { name: 'DailyQuestionAnswer', params: data };
    case NOTIFICATION_TYPES.PARTNER_ANSWERED:
      return { name: 'DailyQuestionAnswer', params: data };
    case NOTIFICATION_TYPES.WHO_MORE_LIKELY:
      return { name: 'WhoMoreLikelyQuestion', params: data };
    case NOTIFICATION_TYPES.HESA10BUT_SENT:
      return { name: 'Hesa10ButRate', params: { roundId: data.roundId, prompt: data.prompt } };
    case NOTIFICATION_TYPES.HESA10BUT_RATED:
      return {
        name: 'Hesa10ButReveal',
        params: {
          roundId: data.roundId,
          fullSentence: data.prompt,
          partnerRating: data.partnerRating,
        },
      };
    case NOTIFICATION_TYPES.DARE_COMPLETED:
      return { name: 'DareDropReaction', params: { dareDropId: data.dareDropId, dare: data.dare } };
    case NOTIFICATION_TYPES.VOICE_BOMB_SENT:
      return {
        name: 'VoiceBombListen',
        params: {
          voiceBombId: data.voiceBombId,
          audioUrl: data.audioUrl,
          prompt: data.prompt,
          senderName: data.senderName,
          mode: 'message',
        },
      };
    case NOTIFICATION_TYPES.VOICE_BOMB_REPLY:
      return {
        name: 'VoiceBombListen',
        params: {
          voiceBombId: data.voiceBombId,
          audioUrl: data.replyAudioUrl || data.audioUrl,
          prompt: data.prompt,
          senderName: data.senderName,
          mode: 'reply',
        },
      };
    case NOTIFICATION_TYPES.GOOD_MORNING:
    case NOTIFICATION_TYPES.GOOD_NIGHT:
    case NOTIFICATION_TYPES.STREAK_RISK:
    case NOTIFICATION_TYPES.STREAK_MILESTONE:
      return { name: 'MainTabs', params: { screen: 'Home' } };
    case NOTIFICATION_TYPES.POINTS_UNLOCK:
      return { name: 'MainTabs', params: { screen: 'Profile' } };
    default:
      return { name: 'MainTabs', params: { screen: 'Home' } };
  }
}

async function sendExpoPush(token, title, body, data) {
  if (!token) return null;

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
        channelId: 'default',
      }),
    });

    let result = null;
    try {
      result = await response.json();
    } catch {
      throw new Error('Invalid push API response');
    }

    if (!response.ok) {
      throw new Error(result?.errors?.[0]?.message || 'Push delivery failed');
    }

    return result;
  } catch (error) {
    console.warn('sendExpoPush failed:', error.message);
    throw error;
  }
}

export async function sendNotification(toUserId, type, data = {}) {
  if (!toUserId || !type) return null;

  try {
    const { title, body } = buildNotificationContent(type, data);
    const payload = {
      type,
      ...data,
      title,
      body,
      createdAt: Date.now(),
    };

    let delivered = false;

    try {
      const token = await getExpoPushToken(toUserId);
      if (token) {
        try {
          await sendExpoPush(token, title, body, payload);
          delivered = true;
        } catch (pushError) {
          console.warn('Push delivery failed:', pushError.message);
        }
      }
    } catch (tokenError) {
      console.warn('Token lookup failed:', tokenError.message);
    }

    try {
      await saveNotificationRecord(toUserId, {
        type,
        title,
        body,
        data: payload,
        read: false,
      });
    } catch (recordError) {
      console.warn('saveNotificationRecord failed:', recordError.message);
    }

    return { title, body, type, delivered };
  } catch (error) {
    console.warn('sendNotification failed:', error.message);
    return null;
  }
}

export async function notifyPartner(profile, type, extraData = {}) {
  if (!profile?.coupleId || !profile?.uid) return null;

  try {
    const partnerId = await getPartnerUserId(profile.coupleId, profile.uid);
    if (!partnerId) return null;

    return await sendNotification(partnerId, type, {
      partnerName: profile.name,
      senderName: profile.name,
      senderId: profile.uid,
      coupleId: profile.coupleId,
      ...extraData,
    });
  } catch (error) {
    console.warn('notifyPartner failed:', error.message);
    return null;
  }
}

export async function notifyCoupleMembers(coupleId, type, data = {}, excludeUserId = null) {
  if (!coupleId) return [];

  try {
    const memberIds = await getCoupleMemberIds(coupleId);
    const targets = memberIds.filter((id) => id && id !== excludeUserId);
    const results = [];

    for (const userId of targets) {
      try {
        const result = await sendNotification(userId, type, data);
        results.push(result);
      } catch (error) {
        console.warn(`notifyCoupleMembers failed for ${userId}:`, error.message);
      }
    }

    return results;
  } catch (error) {
    console.warn('notifyCoupleMembers failed:', error.message);
    return [];
  }
}

export async function registerForPushNotifications(userId) {
  return initializePushNotifications(userId);
}

export async function initializePushNotifications(userId) {
  const Notifications = getNotifications();
  if (!Notifications) {
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'VowFinity',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B9D',
      });
      await Notifications.setNotificationChannelAsync('streak', {
        name: 'Streak Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#FF6B9D',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const token = tokenData.data;

    if (userId && token) {
      await saveExpoPushToken(userId, token);
    }

    return token;
  } catch (error) {
    console.warn('Push token unavailable:', error.message);
    return null;
  }
}

export async function scheduleDailyQuestionReminder() {
  const Notifications = getNotifications();
  if (!Notifications) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_QUESTION_REMINDER_ID);

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_QUESTION_REMINDER_ID,
      content: {
        title: 'VowFinity',
        body: "Today's question is ready ✨",
        sound: true,
        data: { type: NOTIFICATION_TYPES.DAILY_QUESTION_READY },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
      },
    });
  } catch (error) {
    console.warn('scheduleDailyQuestionReminder failed:', error.message);
  }
}

export async function scheduleStreakRiskNotification(currentStreak, activitiesToday) {
  const Notifications = getNotifications();
  if (!Notifications) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(STREAK_RISK_ID);

    if (activitiesToday >= ACTIVITIES_REQUIRED) {
      return;
    }

    const streakLabel = currentStreak > 0 ? currentStreak : 0;
    const { body } = buildNotificationContent(NOTIFICATION_TYPES.STREAK_RISK, {
      streak: streakLabel,
    });

    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_RISK_ID,
      content: {
        title: 'VowFinity',
        body,
        sound: true,
        data: {
          type: NOTIFICATION_TYPES.STREAK_RISK,
          streak: streakLabel,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
    });
  } catch (error) {
    console.warn('scheduleStreakRiskNotification failed:', error.message);
  }
}

export async function sendStreakResetNotification() {
  const Notifications = getNotifications();
  if (!Notifications) {
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'VowFinity',
        body: "Your streak resets but your love doesn't 💪",
        sound: true,
        data: { type: 'streak_reset' },
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('sendStreakResetNotification failed:', error.message);
    throw error;
  }
}

export async function sendUnlockNotification(unlock, userId) {
  if (!unlock?.title) return null;

  const Notifications = getNotifications();
  if (!Notifications) {
    return null;
  }

  try {
    const { body } = buildNotificationContent(NOTIFICATION_TYPES.POINTS_UNLOCK, {
      featureName: unlock.title,
      title: unlock.title,
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'VowFinity',
        body,
        sound: true,
        data: {
          type: NOTIFICATION_TYPES.POINTS_UNLOCK,
          unlockId: unlock.id,
          featureName: unlock.title,
        },
      },
      trigger: null,
    });

    if (userId) {
      await sendNotification(userId, NOTIFICATION_TYPES.POINTS_UNLOCK, {
        featureName: unlock.title,
        unlockId: unlock.id,
      });
    }

    return { body };
  } catch (error) {
    console.warn('sendUnlockNotification failed:', error.message);
    return null;
  }
}

export async function sendStreakMilestoneNotification(coupleId, days) {
  const Notifications = getNotifications();
  if (!Notifications) {
    return;
  }

  try {
    const { body } = buildNotificationContent(NOTIFICATION_TYPES.STREAK_MILESTONE, {
      streak: days,
      days,
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'VowFinity',
        body,
        sound: true,
        data: { type: NOTIFICATION_TYPES.STREAK_MILESTONE, days },
      },
      trigger: null,
    });

    await notifyCoupleMembers(coupleId, NOTIFICATION_TYPES.STREAK_MILESTONE, {
      streak: days,
      days,
    });
  } catch (error) {
    console.warn('sendStreakMilestoneNotification failed:', error.message);
  }
}

export async function setupCoupleNotifications(couple) {
  try {
    await scheduleDailyQuestionReminder();
    const streak = couple?.currentStreak ?? couple?.streak ?? 0;
    const activitiesToday = couple?.activitiesToday ?? 0;
    await scheduleStreakRiskNotification(streak, activitiesToday);
  } catch (error) {
    console.warn('setupCoupleNotifications failed:', error.message);
  }
}

export function handleForegroundNotification(notification) {
  const content = notification?.request?.content;
  const body = content?.body;
  const data = content?.data || {};

  if (body && foregroundToastHandler) {
    foregroundToastHandler(body, data);
  }
}

export function handleNotificationResponse(response, navigate) {
  if (!response || typeof navigate !== 'function') return;

  try {
    const rawData = response?.notification?.request?.content?.data || {};
    const type = rawData.type ? String(rawData.type) : null;

    if (!type) return;

    const route = getScreenForNotificationType(type, rawData);
    if (!route?.name) return;

    if (route.name === 'MainTabs') {
      navigate(route.name, route.params);
    } else {
      navigate(route.name, route.params);
    }
  } catch (error) {
    console.warn('handleNotificationResponse failed:', error.message);
  }
}

export function addNotificationReceivedListener(callback) {
  const Notifications = getNotifications();
  if (!Notifications) {
    return () => {};
  }

  const subscription = Notifications.addNotificationReceivedListener(callback);
  return () => subscription.remove();
}

export function addNotificationResponseListener(callback) {
  const Notifications = getNotifications();
  if (!Notifications) {
    return () => {};
  }

  const subscription = Notifications.addNotificationResponseReceivedListener(callback);
  return () => subscription.remove();
}

export async function getLastNotificationResponseAsync() {
  const Notifications = getNotifications();
  if (!Notifications) {
    return null;
  }

  try {
    return await Notifications.getLastNotificationResponseAsync();
  } catch (error) {
    console.warn('getLastNotificationResponseAsync failed:', error.message);
    return null;
  }
}
