import { useQuery } from '@tanstack/react-query';
import { squadsApi, type SquadsPayload } from '@/data/api/squads';
import type { Player } from '@/data/types';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function useSquad(teamCode?: string) {
  const q = useQuery<SquadsPayload, Error>({
    queryKey: ['squads'],
    queryFn: ({ signal }) => squadsApi.all(undefined, signal!),
    staleTime: TTL_MS,
  });
  const players: Player[] =
    teamCode && q.data?.teams[teamCode]?.players
      ? q.data.teams[teamCode]!.players
      : [];
  return { ...q, players };
}
