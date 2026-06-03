import { useEnriched } from './useEnriched';
import { wc2026 } from '@/data/api/wc2026';
import { fixtures } from '@/data/fixtures';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function useTodayMatches() {
  const date = isoDate(new Date());
  return useEnriched({
    queryKey: ['today-matches', date],
    queryFn: ({ signal }) => wc2026.todayMatches({ date }, signal!),
    fixture: fixtures.todayMatches,
    staleTime: 60_000,
  });
}
