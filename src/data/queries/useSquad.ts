import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activeSource } from '@/data/api/dataSource';
import { usePlayerImages } from './usePlayerImages';
import type { Player } from '@/data/types';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function useSquad(teamCode?: string) {
  const q = useQuery<Player[], Error>({
    queryKey: ['squad', teamCode],
    queryFn: ({ signal }) => activeSource.squad(teamCode!, signal!),
    enabled: Boolean(teamCode),
    staleTime: TTL_MS,
  });
  const images = usePlayerImages();

  const players: Player[] = useMemo(() => {
    const base = q.data ?? [];
    const imageMap = images.data?.players ?? {};
    return base.map((p) => {
      const img = imageMap[p.id];
      return img ? { ...p, image: img } : p;
    });
  }, [q.data, images.data]);

  return { ...q, players };
}
