import { useEnriched } from './useEnriched';
import { activeSource } from '@/data/api/dataSource';
import { fixtures } from '@/data/fixtures';

export function useFinalMatch() {
  return useEnriched({
    queryKey: ['final-match'],
    queryFn: ({ signal }) => activeSource.finalMatch(undefined, signal!),
    fixture: fixtures.finalMatch,
    staleTime: 6 * 60 * 60_000,
  });
}
