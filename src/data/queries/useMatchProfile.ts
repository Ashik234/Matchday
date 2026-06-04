import { useMemo } from 'react';
import { useAllMatches } from './useAllMatches';
import { useMatchHistory } from './useMatchHistory';
import { useSquad } from './useSquad';
import { useTeams } from './useTeams';
import { findMatchBySlug } from '@/utils/matchSlug';
import type {
  Match,
  HistoricalMatch,
  Player,
} from '@/data/types';

export type Scorer = {
  name: string;
  goals: number;
  lastTournament: string;
};

export type MatchProfile = {
  match?: Match;
  h2h: HistoricalMatch[];
  squadHome: Player[];
  squadAway: Player[];
  recentHome: Array<Match | HistoricalMatch>;
  recentAway: Array<Match | HistoricalMatch>;
  topScorersHome: Scorer[];
  topScorersAway: Scorer[];
  isLoading: boolean;
  notFound: boolean;
};

function aggregateScorers(
  history: HistoricalMatch[],
  teamCode: string,
  topN: number,
): Scorer[] {
  const byPlayer = new Map<string, { goals: number; tournaments: string[] }>();
  for (const m of history) {
    for (const e of m.events) {
      if (e.teamCode !== teamCode) continue;
      if (e.type !== 'goal' && e.type !== 'penalty') continue;
      const entry = byPlayer.get(e.player) ?? { goals: 0, tournaments: [] };
      entry.goals++;
      if (!entry.tournaments.includes(m.tournament)) {
        entry.tournaments.push(m.tournament);
      }
      byPlayer.set(e.player, entry);
    }
  }
  return Array.from(byPlayer.entries())
    .map(([name, { goals, tournaments }]) => ({
      name,
      goals,
      lastTournament: tournaments.sort().reverse()[0] ?? '',
    }))
    .sort((a, b) => b.goals - a.goals)
    .slice(0, topN);
}

function recentForTeam(
  current: Match[],
  history: HistoricalMatch[],
  teamName: string,
  teamCode: string,
  limit: number,
): Array<Match | HistoricalMatch> {
  const fromCurrent = current
    .filter(
      (m) =>
        m.status === 'finished' &&
        (m.home.teamId === teamName || m.away.teamId === teamName),
    )
    .slice(-limit);
  if (fromCurrent.length >= limit) return fromCurrent.slice(-limit);

  const need = limit - fromCurrent.length;
  const fromHistory = history
    .filter((h) => h.home.code === teamCode || h.away.code === teamCode)
    .slice(-need);
  return [...fromHistory, ...fromCurrent];
}

export function useMatchProfile(slug: string): MatchProfile {
  const matches = useAllMatches();
  const history = useMatchHistory();
  const teams = useTeams();

  const match = findMatchBySlug(matches.data, slug);

  const homeTeam = teams.data?.find((t) => t.name === match?.home.name);
  const awayTeam = teams.data?.find((t) => t.name === match?.away.name);

  const squadHome = useSquad(homeTeam?.id);
  const squadAway = useSquad(awayTeam?.id);

  const h2h = useMemo<HistoricalMatch[]>(() => {
    if (!match || !history.data || !homeTeam || !awayTeam) return [];
    const a = homeTeam.id;
    const b = awayTeam.id;
    return history.data.matches.filter(
      (m) =>
        (m.home.code === a && m.away.code === b) ||
        (m.home.code === b && m.away.code === a),
    );
  }, [match, history.data, homeTeam, awayTeam]);

  const recentHome = useMemo(
    () =>
      match && homeTeam
        ? recentForTeam(
            matches.data ?? [],
            history.data?.matches ?? [],
            match.home.name,
            homeTeam.id,
            5,
          )
        : [],
    [match, matches.data, history.data, homeTeam],
  );
  const recentAway = useMemo(
    () =>
      match && awayTeam
        ? recentForTeam(
            matches.data ?? [],
            history.data?.matches ?? [],
            match.away.name,
            awayTeam.id,
            5,
          )
        : [],
    [match, matches.data, history.data, awayTeam],
  );

  const topScorersHome = useMemo(
    () =>
      homeTeam && history.data
        ? aggregateScorers(history.data.matches, homeTeam.id, 5)
        : [],
    [homeTeam, history.data],
  );
  const topScorersAway = useMemo(
    () =>
      awayTeam && history.data
        ? aggregateScorers(history.data.matches, awayTeam.id, 5)
        : [],
    [awayTeam, history.data],
  );

  const isLoading =
    matches.isLoading || teams.isLoading || history.isLoading;
  const notFound = !matches.isLoading && !!matches.data && !match;

  return {
    match,
    h2h,
    squadHome: squadHome.players,
    squadAway: squadAway.players,
    recentHome,
    recentAway,
    topScorersHome,
    topScorersAway,
    isLoading,
    notFound,
  };
}
