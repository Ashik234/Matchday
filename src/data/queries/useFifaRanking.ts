import { useQuery } from '@tanstack/react-query';
import { getCached, setCached } from '@/data/cache/storageCache';

export type RankingEntry = {
  rank: number;
  name: string;
  points: number;
};

export type FifaRankingPayload = {
  scrapedAt: string;
  source: string;
  ranking: RankingEntry[];
};

const FIFA_URL = '/data/fifa-ranking.json';
const CACHE_KEY = 'fifa-ranking';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function useFifaRanking() {
  return useQuery<FifaRankingPayload, Error>({
    queryKey: ['fifa-ranking'],
    queryFn: async ({ signal }) => {
      const cached = getCached<FifaRankingPayload>(CACHE_KEY);
      if (cached) return cached.value;
      const res = await fetch(FIFA_URL, { signal });
      if (!res.ok) throw new Error(`fifa-ranking ${res.status}`);
      const data = (await res.json()) as FifaRankingPayload;
      setCached(CACHE_KEY, data, TTL_MS);
      return data;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24h
  });
}

// Build a lookup table: team name (or normalized variant) → rank.
export function buildRankIndex(payload: FifaRankingPayload | undefined): Map<string, number> {
  const idx = new Map<string, number>();
  if (!payload) return idx;
  for (const r of payload.ranking) {
    idx.set(r.name.toLowerCase(), r.rank);
    // Common aliases FIFA → openfootball naming
    const aliases: Record<string, string[]> = {
      'korea republic': ['south korea'],
      'iran': ['ir iran'],
      'ir iran': ['iran'],
      'united states': ['usa'],
      'türkiye': ['turkey'],
    };
    const alts = aliases[r.name.toLowerCase()];
    if (alts) alts.forEach((alt) => idx.set(alt, r.rank));
  }
  return idx;
}
