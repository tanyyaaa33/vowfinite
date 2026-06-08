import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { subscribeToCouple } from '../utils/firebase';

const CoupleContext = createContext({
  couple: null,
  loading: false,
  error: null,
  coupleId: null,
});

export function CoupleProvider({ coupleId, children }) {
  const [couple, setCouple] = useState(null);
  const [loading, setLoading] = useState(Boolean(coupleId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!coupleId) {
      setCouple(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let isActive = true;
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToCouple(
      coupleId,
      (data) => {
        if (!isActive) return;
        setCouple(data);
        setLoading(false);
      },
      (err) => {
        if (!isActive) return;
        setError(err);
        setCouple(null);
        setLoading(false);
      }
    );

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [coupleId]);

  const value = useMemo(
    () => ({ couple, loading, error, coupleId: coupleId ?? null }),
    [couple, loading, error, coupleId]
  );

  return (
    <CoupleContext.Provider value={value}>
      {children}
    </CoupleContext.Provider>
  );
}

export function useCoupleContext() {
  return useContext(CoupleContext);
}
