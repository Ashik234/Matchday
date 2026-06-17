import { useEnriched } from './useEnriched';
import { activeSource } from '@/data/api/dataSource';
import { fixtures } from '@/data/fixtures';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function useTodayMatches() {
  const date = isoDate(new Date());
  return useEnriched({
    queryKey: ['today-matches', date],
    queryFn: ({ signal }) => activeSource.todayMatches({ date }, signal!),
    fixture: fixtures.todayMatches,
    staleTime: 30 * 60_000,
  });
}
