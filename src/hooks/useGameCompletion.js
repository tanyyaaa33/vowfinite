import { useContext, useCallback, useRef } from 'react';
import { AuthContext } from '../../App';
import { usePointsToast } from '../components/PointsToast';
import { completeGameActivity } from '../utils/points';
import { sendUnlockNotification, notifyPartner, NOTIFICATION_TYPES } from '../utils/notifications';

export function useGameCompletion() {
  const { profile } = useContext(AuthContext);
  const { showPoints, showUnlock } = usePointsToast();
  const hasCompleted = useRef(false);

  const completeGame = useCallback(
    async (points, action, suffix = '⭐') => {
      if (hasCompleted.current) return null;
      hasCompleted.current = true;
      if (!profile?.coupleId) {
        showPoints(points, suffix);
        return null;
      }

      try {
        const result = await completeGameActivity(profile.coupleId, points, action);
        showPoints(points, suffix);

        if (result?.newUnlocks?.length) {
          for (const unlock of result.newUnlocks) {
            showUnlock(unlock);
            try {
              await sendUnlockNotification(unlock, profile.uid);
              await notifyPartner(profile, NOTIFICATION_TYPES.POINTS_UNLOCK, {
                featureName: unlock.title,
                unlockId: unlock.id,
              });
            } catch (error) {
              console.warn('Unlock notification failed:', error.message);
            }
          }
        }

        return result;
      } catch (error) {
        console.warn('completeGame failed:', error.message);
        showPoints(points, suffix);
        return null;
      }
    },
    [profile?.coupleId, showPoints, showUnlock]
  );

  return { completeGame, coupleId: profile?.coupleId };
}
