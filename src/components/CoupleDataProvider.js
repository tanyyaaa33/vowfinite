import React, { useContext } from 'react';
import { AuthContext } from '../../App';
import { CoupleProvider } from '../context/CoupleContext';

export function CoupleDataProvider({ children }) {
  const { profile } = useContext(AuthContext);
  return (
    <CoupleProvider coupleId={profile?.coupleId ?? null}>
      {children}
    </CoupleProvider>
  );
}
