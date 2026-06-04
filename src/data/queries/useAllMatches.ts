import { useEnriched } from './useEnriched';
import { openfootball } from '@/data/api/openfootball';
import { fixtures } from '@/data/fixtures';

export function useAllMatches() {
  return useEnriched({
    queryKey: ['all-matches'],
    queryFn: ({ signal }) => openfootball.allMatches(undefined, signal!),
    fixture: [...fixtures.todayMatches, ...fixtures.upcomingMatches],
    staleTime: 30 * 60 * 1000, // 30m
  });
}
