import { useEnriched } from './useEnriched';
import { wc2026 } from '@/data/api/wc2026';
import { fixtures } from '@/data/fixtures';

export function useUpcomingMatches(limit = 2) {
  return useEnriched({
    queryKey: ['upcoming-matches', limit],
    queryFn: ({ signal }) => wc2026.upcomingMatches({ limit }, signal!),
    fixture: fixtures.upcomingMatches.slice(0, limit),
    staleTime: 5 * 60_000,
  });
}
