import { useEnriched } from './useEnriched';
import { wc2026 } from '@/data/api/wc2026';
import { fixtures } from '@/data/fixtures';

export function useFinalMatch() {
  return useEnriched({
    queryKey: ['final-match'],
    queryFn: ({ signal }) => wc2026.finalMatch(undefined, signal!),
    fixture: fixtures.finalMatch,
    staleTime: 60 * 60_000,
  });
}
