import { useEnriched } from './useEnriched';
import { wc2026 } from '@/data/api/wc2026';
import { fixtures } from '@/data/fixtures';

export function useBracket() {
  return useEnriched({
    queryKey: ['bracket'],
    queryFn: ({ signal }) => wc2026.bracket(undefined, signal!),
    fixture: fixtures.bracket,
    staleTime: 5 * 60_000,
  });
}
