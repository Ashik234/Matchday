import { requestCached } from './client';
import type { Team, Federation, Stadium } from '@/data/types';
import { fifaToIso } from '@/utils/countryCodes';

const BASE = import.meta.env.VITE_BDL_BASE_URL ?? 'https://api.balldontlie.io/fifa/worldcup/v1';
const KEY = import.meta.env.VITE_BDL_KEY;

function headers(): HeadersInit {
  return KEY ? { Authorization: KEY } : {};
}

type BdlTeam = {
  id: number;
  name: string;
  abbreviation: string;
  country_code: string;
  confederation: Federation;
};

type BdlStadium = {
  id: number;
  name: string;
  city: string;
  country: string;
  capacity?: number;
};

const TTL_TEAMS = 24 * 60 * 60 * 1000; // 24 hours — team list is static for the tournament
const TTL_STADIUMS = 24 * 60 * 60 * 1000; // 24 hours — stadiums don't change

export const bdl = {
  teams: async (_: void, signal: AbortSignal): Promise<Team[]> => {
    const raw = await requestCached<{ data: BdlTeam[] }>(
      'ballDontLie',
      `${BASE}/teams?per_page=100`,
      { signal, headers: headers() },
      { ttlMs: TTL_TEAMS, staleOk: true },
    );
    return raw.data.map((t) => ({
      id: String(t.id),
      name: t.name,
      countryCode: fifaToIso(t.abbreviation),
      federation: t.confederation,
    }));
  },

  stadiums: async (_: void, signal: AbortSignal): Promise<Stadium[]> => {
    const raw = await requestCached<{ data: BdlStadium[] }>(
      'ballDontLie',
      `${BASE}/stadiums?per_page=100`,
      { signal, headers: headers() },
      { ttlMs: TTL_STADIUMS, staleOk: true },
    );
    return raw.data.map((s) => ({
      id: String(s.id),
      name: s.name,
      city: s.city,
      country: s.country,
      capacity: s.capacity ?? 0,
    }));
  },
};
