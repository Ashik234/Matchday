import { useMemo } from 'react';
import { useTeams } from './useTeams';
import { useAllMatches } from './useAllMatches';
import { useGroupStandings } from './useGroupStandings';
import { useBracket } from './useBracket';
import { useSquad } from './useSquad';
import { findTeamBySlug } from '@/utils/slug';
import type { Match, Team, Group, BracketNode, Player } from '@/data/types';

export type TeamProfile = {
  team?: Team;
  matches: Match[];
  group?: Group;
  bracketNodes: BracketNode[];
  squad: Player[];
  isLoading: boolean;
  notFound: boolean;
};

export function useTeamProfile(slug: string): TeamProfile {
  const teams = useTeams();
  const matches = useAllMatches();
  const groups = useGroupStandings();
  const bracket = useBracket();

  const team = findTeamBySlug(teams.data, slug);
  const squad = useSquad(team?.id);

  const teamMatches = useMemo<Match[]>(() => {
    if (!team || !matches.data) return [];
    return matches.data.filter(
      (m) => m.home.teamId === team.name || m.away.teamId === team.name,
    );
  }, [matches.data, team]);

  const group = useMemo<Group | undefined>(() => {
    if (!team || !groups.data) return undefined;
    return groups.data.find((g) =>
      g.standings.some((s) => s.team.id === team.id || s.team.name === team.name),
    );
  }, [groups.data, team]);

  const teamBracket = useMemo<BracketNode[]>(() => {
    if (!team || !bracket.data) return [];
    return bracket.data.filter(
      (n) => n.home?.teamId === team.name || n.away?.teamId === team.name,
    );
  }, [bracket.data, team]);

  const isLoading =
    teams.isLoading || matches.isLoading || groups.isLoading || bracket.isLoading;
  const notFound = !teams.isLoading && !!teams.data && !team;

  return {
    team,
    matches: teamMatches,
    group,
    bracketNodes: teamBracket,
    squad: squad.players,
    isLoading,
    notFound,
  };
}
