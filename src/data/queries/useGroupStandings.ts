import { useEnriched } from './useEnriched';
import { openfootball } from '@/data/api/openfootball';
import { fixtures } from '@/data/fixtures';

export function useGroupStandings() {
  return useEnriched({
    queryKey: ['groups'],
    queryFn: ({ signal }) => openfootball.groups(undefined, signal!),
    fixture: fixtures.groups,
    staleTime: 5 * 60_000,
  });
}
