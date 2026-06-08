import { useCoupleContext } from '../context/CoupleContext';

export function useCouple(_coupleId) {
  return useCoupleContext();
}
