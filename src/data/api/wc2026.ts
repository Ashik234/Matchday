import { request } from './client';
import type { Match, Group, Team, BracketNode, Stadium } from '@/data/types';

const BASE = import.meta.env.VITE_WC2026_BASE_URL ?? 'https://worldcupjson.net';
const KEY = import.meta.env.VITE_WC2026_KEY;

function headers(): HeadersInit {
  return KEY ? { 'X-API-Key': KEY } : {};
}

export const wc2026 = {
  todayMatches: async (args: { date: string }, signal: AbortSignal): Promise<Match[]> => {
    const raw = await request<unknown>(
      'wc2026',
      `${BASE}/matches/today?date=${encodeURIComponent(args.date)}`,
      { signal, headers: headers() },
    );
    return mapMatches(raw);
  },

  upcomingMatches: async (args: { limit: number }, signal: AbortSignal): Promise<Match[]> => {
    const raw = await request<unknown>(
      'wc2026',
      `${BASE}/matches?status=scheduled&limit=${args.limit}`,
      { signal, headers: headers() },
    );
    return mapMatches(raw);
  },

  liveMatches: async (_: void, signal: AbortSignal): Promise<Match[]> => {
    const raw = await request<unknown>('wc2026', `${BASE}/matches/live`, { signal, headers: headers() });
    return mapMatches(raw);
  },

  match: async (args: { id: string }, signal: AbortSignal): Promise<Match> => {
    const raw = await request<unknown>('wc2026', `${BASE}/matches/${args.id}`, { signal, headers: headers() });
    return mapMatch(raw);
  },

  groups: async (_: void, signal: AbortSignal): Promise<Group[]> => {
    const raw = await request<unknown>('wc2026', `${BASE}/groups`, { signal, headers: headers() });
    return mapGroups(raw);
  },

  teams: async (_: void, signal: AbortSignal): Promise<Team[]> => {
    const raw = await request<unknown>('wc2026', `${BASE}/teams`, { signal, headers: headers() });
    return mapTeams(raw);
  },

  stadiums: async (_: void, signal: AbortSignal): Promise<Stadium[]> => {
    const raw = await request<unknown>('wc2026', `${BASE}/stadiums`, { signal, headers: headers() });
    return mapStadiums(raw);
  },

  bracket: async (_: void, signal: AbortSignal): Promise<BracketNode[]> => {
    const raw = await request<unknown>('wc2026', `${BASE}/bracket`, { signal, headers: headers() });
    return mapBracket(raw);
  },

  finalMatch: async (_: void, signal: AbortSignal): Promise<Match> => {
    const raw = await request<unknown>('wc2026', `${BASE}/matches/final`, { signal, headers: headers() });
    return mapMatch(raw);
  },
};

function mapMatches(raw: unknown): Match[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(mapMatch);
}
function mapMatch(raw: unknown): Match {
  return raw as Match;
}
function mapGroups(raw: unknown): Group[] {
  return (raw as Group[]) ?? [];
}
function mapTeams(raw: unknown): Team[] {
  return (raw as Team[]) ?? [];
}
function mapStadiums(raw: unknown): Stadium[] {
  return (raw as Stadium[]) ?? [];
}
function mapBracket(raw: unknown): BracketNode[] {
  return (raw as BracketNode[]) ?? [];
}
