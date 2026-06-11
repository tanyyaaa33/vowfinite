import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getPartnerUserId, getUserProfile } from '../utils/firebase';

export function usePartnerProfile() {
  const { profile } = useContext(AuthContext);
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile?.coupleId || !profile?.uid) {
      setPartnerProfile(null);
      return undefined;
    }

    let active = true;
    setLoading(true);

    (async () => {
      try {
        const partnerId = await getPartnerUserId(profile.coupleId, profile.uid);
        if (!active || !partnerId) {
          if (active) setPartnerProfile(null);
          return;
        }
        const data = await getUserProfile(partnerId);
        if (active) {
          setPartnerProfile(data ? { ...data, uid: partnerId } : null);
        }
      } catch (error) {
        console.warn('usePartnerProfile failed:', error.message);
        if (active) setPartnerProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [profile?.coupleId, profile?.uid]);

  return { partnerProfile, loading };
}
