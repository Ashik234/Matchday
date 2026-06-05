import { useQuery } from '@tanstack/react-query';
import { matchHistoryApi } from '@/data/api/matchHistory';
import type { MatchHistoryPayload } from '@/data/types';

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function useMatchHistory() {
  return useQuery<MatchHistoryPayload, Error>({
    queryKey: ['match-history'],
    queryFn: ({ signal }) => matchHistoryApi.all(undefined, signal!),
    staleTime: TTL_MS,
  });
}
