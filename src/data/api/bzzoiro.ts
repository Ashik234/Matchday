import { bzzoiroRequest } from './client';
import { openfootball } from './openfootball';
import { resolveTeamId } from './teamIdMap';
import { mapSquadRow, mapEvent } from './bzzoiroMap';
import type { Paginated, SquadRowV2, EventV2 } from './bzzoiroTypes';
import type { Match, Player } from '@/data/types';

const EVENTS_TTL = 30_000;

async function squad(teamCode: string, signal: AbortSignal): Promise<Player[]> {
  const teamId = await resolveTeamId(teamCode, signal);
  if (!teamId) return [];
  const res = await bzzoiroRequest<Paginated<SquadRowV2>>(
    `/api/v2/worldcup/squads/?team=${teamId}&status=official&limit=200`,
    signal,
    { ttlMs: 7 * 24 * 60 * 60 * 1000, staleOk: true },
  );
  return res.results
    .map((r) => mapSquadRow(r, teamCode))
    .sort((a, b) => a.jersey - b.jersey);
}

async function liveMatches(_: void, signal: AbortSignal): Promise<Match[]> {
  const res = await bzzoiroRequest<{ events: EventV2[] }>(
    `/api/v2/events/live/`,
    signal,
    { ttlMs: EVENTS_TTL, staleOk: true },
  );
  return (res.events ?? []).map(mapEvent);
}

// World Cup fixtures/groups/bracket are not exposed via a league filter on this
// API; delegate those to openfootball (the authoritative WC schedule source).
export const bzzoiro = {
  squad,
  liveMatches,
  allMatches: openfootball.allMatches,
  todayMatches: openfootball.todayMatches,
  upcomingMatches: openfootball.upcomingMatches,
  groups: openfootball.groups,
  bracket: openfootball.bracket,
  finalMatch: openfootball.finalMatch,
  teams: openfootball.teams,
  stadiums: openfootball.stadiums,
};
