import { useEnriched } from './useEnriched';
import { openfootball } from '@/data/api/openfootball';
import { fixtures } from '@/data/fixtures';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function useTodayMatches() {
  const date = isoDate(new Date());
  return useEnriched({
    queryKey: ['today-matches', date],
    queryFn: ({ signal }) => openfootball.todayMatches({ date }, signal!),
    fixture: fixtures.todayMatches,
    staleTime: 5 * 60_000,
  });
}
