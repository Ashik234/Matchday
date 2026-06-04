import { useEnriched } from './useEnriched';
import { openfootball } from '@/data/api/openfootball';
import { fixtures } from '@/data/fixtures';

export function useUpcomingMatches(limit = 2) {
  return useEnriched({
    queryKey: ['upcoming-matches', limit],
    queryFn: ({ signal }) => openfootball.upcomingMatches({ limit }, signal!),
    fixture: fixtures.upcomingMatches.slice(0, limit),
    staleTime: 30 * 60_000,
  });
}
