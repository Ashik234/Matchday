import { useEnriched } from './useEnriched';
import { apiFootball } from '@/data/api/apiFootball';
import { fixtures } from '@/data/fixtures';

export function useBracket() {
  return useEnriched({
    queryKey: ['bracket'],
    queryFn: ({ signal }) => apiFootball.bracket(undefined, signal!),
    fixture: fixtures.bracket,
    staleTime: 30 * 60_000,
  });
}
