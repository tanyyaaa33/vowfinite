import { useEffect, useRef } from 'react';
import { useGameCompletion } from './useGameCompletion';

export function useCompleteGameOnMount(points, action, shouldRun = true) {
  const { completeGame } = useGameCompletion();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!shouldRun || hasRun.current) return undefined;

    let isActive = true;
    hasRun.current = true;

    (async () => {
      try {
        await completeGame(points, action);
      } catch (error) {
        if (isActive) {
          console.warn('useCompleteGameOnMount failed:', error.message);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [shouldRun, points, action, completeGame]);
}
