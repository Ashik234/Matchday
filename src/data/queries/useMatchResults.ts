import { useQuery } from '@tanstack/react-query';
import { fetchMatchResults } from '../api/matchResults';
import type { MatchResult, MatchResultsPayload } from '../types/matchResult';

const MATCH_RESULTS_QUERY_KEY = ['match-results'];

export function useMatchResults() {
  return useQuery<MatchResultsPayload>({
    queryKey: MATCH_RESULTS_QUERY_KEY,
    queryFn: fetchMatchResults,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

/** Look up a single match result by its slug. Returns undefined while loading or if not found. */
export function useMatchResult(slug: string): MatchResult | undefined {
  const { data } = useMatchResults();
  return data?.results[slug];
}
