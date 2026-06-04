import { useEnriched } from './useEnriched';
import { apiFootball } from '@/data/api/apiFootball';
import { fixtures } from '@/data/fixtures';

export function useUpcomingMatches(limit = 2) {
  return useEnriched({
    queryKey: ['upcoming-matches', limit],
    queryFn: ({ signal }) => apiFootball.upcomingMatches({ limit }, signal!),
    fixture: fixtures.upcomingMatches.slice(0, limit),
    staleTime: 5 * 60_000,
  });
}
