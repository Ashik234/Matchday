import { useQuery } from '@tanstack/react-query';
import { matchResultsApi } from '@/data/api/matchResults';
import type { MatchResult, MatchResultsPayload } from '@/data/types';

const STALE_MS = 60 * 60 * 1000; // 1h — refetch frequently while tournament runs

export function useMatchResults() {
  return useQuery<MatchResultsPayload, Error>({
    queryKey: ['match-results'],
    queryFn: ({ signal }) => matchResultsApi.all(undefined, signal!),
    staleTime: STALE_MS,
  });
}

export function useMatchResult(matchId: string | undefined): MatchResult | undefined {
  const { data } = useMatchResults();
  if (!matchId || !data) return undefined;
  return data.results[matchId];
}
