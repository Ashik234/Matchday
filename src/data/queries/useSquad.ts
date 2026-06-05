import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { squadsApi, type SquadsPayload } from '@/data/api/squads';
import { usePlayerImages } from './usePlayerImages';
import type { Player } from '@/data/types';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function useSquad(teamCode?: string) {
  const q = useQuery<SquadsPayload, Error>({
    queryKey: ['squads'],
    queryFn: ({ signal }) => squadsApi.all(undefined, signal!),
    staleTime: TTL_MS,
  });
  const images = usePlayerImages();

  const players: Player[] = useMemo(() => {
    if (!teamCode) return [];
    const base = q.data?.teams[teamCode]?.players ?? [];
    const imageMap = images.data?.players ?? {};
    return base.map((p) => {
      const img = imageMap[p.id];
      return img ? { ...p, image: img } : p;
    });
  }, [q.data, images.data, teamCode]);

  return { ...q, players };
}
