import { useEnriched } from './useEnriched';
import { activeSource } from '@/data/api/dataSource';
import { fixtures } from '@/data/fixtures';

export function useUpcomingMatches(limit = 2) {
  return useEnriched({
    queryKey: ['upcoming-matches', limit],
    queryFn: ({ signal }) => activeSource.upcomingMatches({ limit }, signal!),
    fixture: fixtures.upcomingMatches.slice(0, limit),
    staleTime: 60 * 60_000,
  });
}
