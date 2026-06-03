import { useEnriched } from './useEnriched';
import { ballDontLie } from '@/data/api/ballDontLie';
import { fixtures } from '@/data/fixtures';
import { useDocumentVisibility } from '@/hooks/useDocumentVisibility';

export function useMatchEvents(matchId: string | undefined) {
  const visible = useDocumentVisibility();
  return useEnriched({
    queryKey: ['match-events', matchId ?? 'none'],
    queryFn: ({ signal }) => ballDontLie.matchEvents({ matchId: matchId! }, signal!),
    fixture: fixtures.matchEvents,
    enabled: !!matchId,
    staleTime: 15_000,
    refetchInterval: visible && matchId ? 15_000 : false,
  });
}
