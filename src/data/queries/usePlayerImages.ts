import { useQuery } from '@tanstack/react-query';
import { playerImagesApi, type PlayerImagesPayload } from '@/data/api/playerImages';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function usePlayerImages() {
  return useQuery<PlayerImagesPayload, Error>({
    queryKey: ['player-images'],
    queryFn: ({ signal }) => playerImagesApi.all(undefined, signal!),
    staleTime: TTL_MS,
  });
}
