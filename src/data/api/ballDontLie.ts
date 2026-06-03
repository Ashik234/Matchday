import { request } from './client';
import type { MatchEvent } from '@/data/types';

const BASE = import.meta.env.VITE_BDL_BASE_URL ?? 'https://api.balldontlie.io/fifa/v1';
const KEY = import.meta.env.VITE_BDL_KEY;

function headers(): HeadersInit {
  return KEY ? { Authorization: `Bearer ${KEY}` } : {};
}

export const ballDontLie = {
  matchEvents: async (args: { matchId: string }, signal: AbortSignal): Promise<MatchEvent[]> => {
    const raw = await request<unknown>(
      'ballDontLie',
      `${BASE}/matches/${args.matchId}/events`,
      { signal, headers: headers() },
    );
    const data = (raw as { data?: unknown[] }).data ?? [];
    return data as MatchEvent[];
  },
};
