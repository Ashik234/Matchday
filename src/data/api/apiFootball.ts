import { request } from './client';

const BASE = import.meta.env.VITE_API_FOOTBALL_BASE_URL ?? 'https://v3.football.api-sports.io';
const KEY = import.meta.env.VITE_API_FOOTBALL_KEY;

function headers(): HeadersInit {
  return KEY ? { 'x-apisports-key': KEY } : {};
}

export type H2HSummary = {
  totalMatches: number;
  homeWins: number;
  awayWins: number;
  draws: number;
};

export const apiFootball = {
  h2h: async (
    args: { team1Id: string; team2Id: string },
    signal: AbortSignal,
  ): Promise<H2HSummary> => {
    const raw = await request<unknown>(
      'apiFootball',
      `${BASE}/fixtures/headtohead?h2h=${args.team1Id}-${args.team2Id}`,
      { signal, headers: headers() },
    );
    return mapH2H(raw);
  },
};

function mapH2H(raw: unknown): H2HSummary {
  const arr = (raw as { response?: unknown[] }).response ?? [];
  return { totalMatches: arr.length, homeWins: 0, awayWins: 0, draws: 0 };
}
