import { useEnriched } from './useEnriched';
import { apiFootball } from '@/data/api/apiFootball';
import { fixtures } from '@/data/fixtures';

export function useGroupStandings() {
  return useEnriched({
    queryKey: ['groups'],
    queryFn: ({ signal }) => apiFootball.groups(undefined, signal!),
    fixture: fixtures.groups,
    staleTime: 5 * 60_000,
  });
}
