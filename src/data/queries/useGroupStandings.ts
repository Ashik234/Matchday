import { useEnriched } from './useEnriched';
import { activeSource } from '@/data/api/dataSource';
import { fixtures } from '@/data/fixtures';

export function useGroupStandings() {
  return useEnriched({
    queryKey: ['groups'],
    queryFn: ({ signal }) => activeSource.groups(undefined, signal!),
    fixture: fixtures.groups,
    staleTime: 30 * 60_000,
  });
}
