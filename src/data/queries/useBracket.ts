import { useEnriched } from './useEnriched';
import { activeSource } from '@/data/api/dataSource';
import { fixtures } from '@/data/fixtures';

export function useBracket() {
  return useEnriched({
    queryKey: ['bracket'],
    queryFn: ({ signal }) => activeSource.bracket(undefined, signal!),
    fixture: fixtures.bracket,
    staleTime: 60 * 60_000,
  });
}
