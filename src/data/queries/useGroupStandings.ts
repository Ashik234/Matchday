import { useEnriched } from './useEnriched';
import { wc2026 } from '@/data/api/wc2026';
import { fixtures } from '@/data/fixtures';

export function useGroupStandings() {
  return useEnriched({
    queryKey: ['groups'],
    queryFn: ({ signal }) => wc2026.groups(undefined, signal!),
    fixture: fixtures.groups,
    staleTime: 5 * 60_000,
  });
}
