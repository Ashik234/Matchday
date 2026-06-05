import type { PlayerImage } from '@/data/types';

export type PlayerImagesPayload = {
  generatedAt: string;
  players: Record<string, PlayerImage>;
};

const SOURCE = '/data/player-images.json';

export const playerImagesApi = {
  all: async (_: void, signal: AbortSignal): Promise<PlayerImagesPayload> => {
    const res = await fetch(SOURCE, { signal });
    if (!res.ok) throw new Error(`player-images.json ${res.status}`);
    return res.json() as Promise<PlayerImagesPayload>;
  },
};
