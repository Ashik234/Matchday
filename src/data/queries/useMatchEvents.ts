import { useQuery } from '@tanstack/react-query';
import { fixtures } from '@/data/fixtures';
import type { MatchEvent } from '@/data/types';

export function useMatchEvents(matchId: string | undefined) {
  // BDL free tier does not expose match events. Always return fixture sample.
  return useQuery<MatchEvent[], Error>({
    queryKey: ['match-events', matchId ?? 'none'],
    queryFn: () => Promise.resolve(fixtures.matchEvents),
    enabled: !!matchId,
    staleTime: Infinity,
  });
}
