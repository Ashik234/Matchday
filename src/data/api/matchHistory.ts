import type { MatchHistoryPayload } from '@/data/types';

const SOURCE = '/data/match-history.json';

export const matchHistoryApi = {
  all: async (_: void, signal: AbortSignal): Promise<MatchHistoryPayload> => {
    const res = await fetch(SOURCE, { signal });
    if (!res.ok) throw new Error(`match-history.json ${res.status}`);
    return res.json() as Promise<MatchHistoryPayload>;
  },
};
