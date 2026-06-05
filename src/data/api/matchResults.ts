import type { MatchResultsPayload } from '@/data/types';

const SOURCE = '/data/match-results.json';

export const matchResultsApi = {
  all: async (_: void, signal: AbortSignal): Promise<MatchResultsPayload> => {
    const res = await fetch(SOURCE, { signal, cache: 'no-store' });
    if (!res.ok) {
      // Manifest may not exist yet during off-tournament builds.
      if (res.status === 404) {
        return { scrapedAt: new Date().toISOString(), source: '', results: {} };
      }
      throw new Error(`match-results.json ${res.status}`);
    }
    return res.json() as Promise<MatchResultsPayload>;
  },
};
