import { useEnriched } from './useEnriched';
import { openfootball } from '@/data/api/openfootball';
import { fixtures } from '@/data/fixtures';

export function useBracket() {
  return useEnriched({
    queryKey: ['bracket'],
    queryFn: ({ signal }) => openfootball.bracket(undefined, signal!),
    fixture: fixtures.bracket,
    staleTime: 60 * 60_000,
  });
}
