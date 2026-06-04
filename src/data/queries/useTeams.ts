import { useEnriched } from './useEnriched';
import { openfootball } from '@/data/api/openfootball';
import { fixtures } from '@/data/fixtures';

export function useTeams() {
  return useEnriched({
    queryKey: ['teams'],
    queryFn: ({ signal }) => openfootball.teams(undefined, signal!),
    fixture: fixtures.teams,
    staleTime: 6 * 60 * 60 * 1000, // 6h — team list is static for tournament
  });
}
