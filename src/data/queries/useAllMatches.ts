import { useEnriched } from './useEnriched';
import { activeSource } from '@/data/api/dataSource';
import { fixtures } from '@/data/fixtures';

export function useAllMatches() {
  return useEnriched({
    queryKey: ['all-matches'],
    queryFn: ({ signal }) => activeSource.allMatches(undefined, signal!),
    fixture: [...fixtures.todayMatches, ...fixtures.upcomingMatches],
    staleTime: 30 * 60 * 1000, // 30m
  });
}
