import { useMemo } from 'react';
import { useEnriched } from './useEnriched';
import { openfootball } from '@/data/api/openfootball';
import { fixtures } from '@/data/fixtures';
import { useFifaRanking, buildRankIndex } from './useFifaRanking';
import type { Team } from '@/data/types';

export function useTeams() {
  const enriched = useEnriched({
    queryKey: ['teams'],
    queryFn: ({ signal }) => openfootball.teams(undefined, signal!),
    fixture: fixtures.teams,
    staleTime: 6 * 60 * 60 * 1000,
  });

  const { data: ranking } = useFifaRanking();
  const rankIndex = useMemo(() => buildRankIndex(ranking), [ranking]);

  const mergedData = useMemo<Team[] | undefined>(() => {
    if (!enriched.data) return enriched.data;
    return enriched.data.map((t) => ({
      ...t,
      fifaRank: rankIndex.get(t.name.toLowerCase()) ?? t.fifaRank,
    }));
  }, [enriched.data, rankIndex]);

  return { ...enriched, data: mergedData };
}
