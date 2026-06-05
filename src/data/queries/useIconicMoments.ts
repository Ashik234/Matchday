import { useQuery } from '@tanstack/react-query';
import { fetchIconicMoments } from '../api/iconicMoments';
import type { IconicMomentsPayload } from '../types/iconicMoment';

export function useIconicMoments() {
  return useQuery<IconicMomentsPayload>({
    queryKey: ['iconic-moments'],
    queryFn: fetchIconicMoments,
    staleTime: Infinity, // static curated data, never refetch
    gcTime: Infinity,
  });
}
