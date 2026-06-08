import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { CoupleProvider } from '../context/CoupleContext';

export function CoupleDataProvider({ children }) {
  const { profile, isGuest } = useContext(AuthContext);
  return (
    <CoupleProvider coupleId={profile?.coupleId ?? null} isGuest={isGuest}>
      {children}
    </CoupleProvider>
  );
}
