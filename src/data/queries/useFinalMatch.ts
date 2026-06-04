import { useEnriched } from './useEnriched';
import { openfootball } from '@/data/api/openfootball';
import { fixtures } from '@/data/fixtures';

export function useFinalMatch() {
  return useEnriched({
    queryKey: ['final-match'],
    queryFn: ({ signal }) => openfootball.finalMatch(undefined, signal!),
    fixture: fixtures.finalMatch,
    staleTime: 60 * 60_000,
  });
}
