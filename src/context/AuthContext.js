import { createContext } from 'react';

export const AuthContext = createContext({
  user: null,
  profile: null,
  profileLoading: false,
  refreshProfile: async () => null,
  isGuest: false,
  enterGuestMode: () => {},
  exitGuestMode: () => {},
});
