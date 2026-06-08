import React, { useEffect, useRef } from 'react';
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getLastNotificationResponseAsync,
  handleForegroundNotification,
  handleNotificationResponse,
  setForegroundNotificationHandler,
} from '../utils/notifications';
import { navigateFromNotification } from '../navigation/navigationRef';
import { usePointsToast } from './PointsToast';

export default function NotificationManager() {
  const { showNotification } = usePointsToast();
  const showNotificationRef = useRef(showNotification);
  const isMounted = useRef(true);

  useEffect(() => {
    showNotificationRef.current = showNotification;
  }, [showNotification]);

  useEffect(() => {
    isMounted.current = true;

    setForegroundNotificationHandler((body) => {
      if (isMounted.current && body) {
        showNotificationRef.current(body);
      }
    });

    return () => {
      isMounted.current = false;
      setForegroundNotificationHandler(null);
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const removeReceived = addNotificationReceivedListener((notification) => {
      if (isActive) {
        handleForegroundNotification(notification);
      }
    });

    const removeResponse = addNotificationResponseListener((response) => {
      if (isActive) {
        handleNotificationResponse(response, navigateFromNotification);
      }
    });

    (async () => {
      try {
        const response = await getLastNotificationResponseAsync();
        if (isActive && response) {
          handleNotificationResponse(response, navigateFromNotification);
        }
      } catch (error) {
        console.warn('getLastNotificationResponseAsync failed:', error.message);
      }
    })();

    return () => {
      isActive = false;
      removeReceived();
      removeResponse();
    };
  }, []);

  return null;
}
