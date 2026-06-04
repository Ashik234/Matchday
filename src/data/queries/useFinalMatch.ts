import { useEnriched } from './useEnriched';
import { apiFootball } from '@/data/api/apiFootball';
import { fixtures } from '@/data/fixtures';

export function useFinalMatch() {
  return useEnriched({
    queryKey: ['final-match'],
    queryFn: ({ signal }) => apiFootball.finalMatch(undefined, signal!),
    fixture: fixtures.finalMatch,
    staleTime: 60 * 60_000,
  });
}
