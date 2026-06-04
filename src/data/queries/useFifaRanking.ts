import { useQuery } from '@tanstack/react-query';

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

const URL = '/data/fifa-ranking.json';

export function useFifaRanking() {
  return useQuery<FifaRankingPayload, Error>({
    queryKey: ['fifa-ranking'],
    queryFn: async () => {
      const res = await fetch(URL);
      if (!res.ok) throw new Error(`fifa-ranking ${res.status}`);
      return (await res.json()) as FifaRankingPayload;
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
