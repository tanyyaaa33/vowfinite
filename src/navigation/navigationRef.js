import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

let pendingNavigation = null;

export function navigateFromNotification(name, params) {
  if (!name) return;

  if (navigationRef.isReady()) {
    try {
      navigationRef.navigate(name, params);
      pendingNavigation = null;
    } catch (error) {
      console.warn('navigateFromNotification failed:', error.message);
    }
    return;
  }

  pendingNavigation = { name, params };
}

export function flushPendingNavigation() {
  if (!pendingNavigation || !navigationRef.isReady()) return;

  const { name, params } = pendingNavigation;
  pendingNavigation = null;

  try {
    navigationRef.navigate(name, params);
  } catch (error) {
    console.warn('flushPendingNavigation failed:', error.message);
  }
}

export function clearPendingNavigation() {
  pendingNavigation = null;
}

export function navigateFromRef(name, params) {
  navigateFromNotification(name, params);
}
