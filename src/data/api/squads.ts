import type { Player } from '@/data/types';

export type SquadsPayload = {
  scrapedAt: string;
  teams: Record<string, { teamCode: string; players: Player[] }>;
};

const SOURCE = '/data/squads.json';

export const squadsApi = {
  all: async (_: void, signal: AbortSignal): Promise<SquadsPayload> => {
    const res = await fetch(SOURCE, { signal });
    if (!res.ok) throw new Error(`squads.json ${res.status}`);
    return res.json() as Promise<SquadsPayload>;
  },
};
