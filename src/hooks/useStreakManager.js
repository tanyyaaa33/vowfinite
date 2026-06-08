import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { AuthContext } from '../../App';
import { useCoupleContext } from '../context/CoupleContext';
import { checkStreak, clearPendingMilestone } from '../utils/points';
import { setupCoupleNotifications, sendStreakMilestoneNotification } from '../utils/notifications';
import MilestoneCelebration from '../components/MilestoneCelebration';

export function StreakManager() {
  const { profile } = useContext(AuthContext);
  const { couple, coupleId } = useCoupleContext();
  const [milestone, setMilestone] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const isMounted = useRef(true);
  const lastNotifiedMilestone = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const runStreakCheck = useCallback(async () => {
    const id = profile?.coupleId;
    if (!id || !isMounted.current) return;

    try {
      const result = await checkStreak(id);
      if (!isMounted.current) return;

      if (result?.pendingMilestone) {
        setMilestone(result.pendingMilestone);
        setVisible(true);

        if (lastNotifiedMilestone.current !== result.pendingMilestone) {
          lastNotifiedMilestone.current = result.pendingMilestone;
          try {
            await sendStreakMilestoneNotification(profile.coupleId, result.pendingMilestone);
          } catch (milestoneError) {
            console.warn('Milestone notification failed:', milestoneError.message);
          }
        }
      }

      try {
        await setupCoupleNotifications({
          currentStreak: result?.currentStreak ?? 0,
          activitiesToday: result?.activitiesToday ?? 0,
        });
      } catch (notifError) {
        console.warn('Notification setup failed:', notifError.message);
      }
    } catch (error) {
      console.warn('Streak check failed:', error.message);
    }
  }, [profile?.coupleId]);

  useEffect(() => {
    if (!profile?.coupleId) return undefined;

    runStreakCheck();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        runStreakCheck();
      }
    });

    return () => subscription.remove();
  }, [profile?.coupleId, runStreakCheck]);

  useEffect(() => {
    if (!coupleId || !couple?.pendingMilestone || visible) return;
    setMilestone(couple.pendingMilestone);
    setVisible(true);
  }, [coupleId, couple?.pendingMilestone, visible]);

  useEffect(() => {
    if (!couple) return;
    setupCoupleNotifications(couple).catch((error) => {
      console.warn('Couple notification sync failed:', error.message);
    });
  }, [couple?.activitiesToday, couple?.currentStreak, couple?.streak]);

  const handleDismiss = async () => {
    if (dismissing) return;
    setDismissing(true);
    setVisible(false);

    try {
      if (profile?.coupleId) {
        await clearPendingMilestone(profile.coupleId);
      }
    } catch (error) {
      console.warn('clearPendingMilestone failed:', error.message);
    } finally {
      if (isMounted.current) {
        setMilestone(null);
        setDismissing(false);
      }
    }
  };

  if (!profile?.coupleId) return null;

  return (
    <MilestoneCelebration
      milestone={milestone}
      visible={visible}
      onDismiss={handleDismiss}
      dismissing={dismissing}
    />
  );
}
