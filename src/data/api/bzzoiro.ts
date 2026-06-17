import { bzzoiroRequest } from './client';
import { openfootball } from './openfootball';
import { resolveTeamId } from './teamIdMap';
import { mapSquadRow, mapEvent } from './bzzoiroMap';
import { mapIncidents } from './bzzoiroIncidents';
import type {
  Paginated,
  SquadRowV2,
  EventV2,
  EventStatsV2,
  MomentumPoint,
  PolymarketResponse,
  IncidentsResponseV2,
  Incident,
} from './bzzoiroTypes';
import type { Match, Player } from '@/data/types';

const EVENTS_TTL = 30_000;

export type Market1x2 = {
  home: number | null;
  draw: number | null;
  away: number | null;
  updatedAt?: string;
};

async function momentum(eventId: number, signal: AbortSignal): Promise<MomentumPoint[]> {
  const res = await bzzoiroRequest<EventStatsV2>(
    `/api/v2/events/${eventId}/stats/`,
    signal,
    { ttlMs: EVENTS_TTL, staleOk: true },
  );
  return res.momentum ?? [];
}

async function incidents(
  eventId: number,
  homeTeamId: number | undefined,
  signal: AbortSignal,
): Promise<Incident[]> {
  const res = await bzzoiroRequest<IncidentsResponseV2>(
    `/api/v2/events/${eventId}/incidents/`,
    signal,
    { ttlMs: EVENTS_TTL, staleOk: true },
  );
  return mapIncidents(res, homeTeamId);
}

async function polymarket(eventId: number, signal: AbortSignal): Promise<Market1x2 | null> {
  const res = await bzzoiroRequest<PolymarketResponse>(
    `/api/v2/events/${eventId}/polymarket/`,
    signal,
    { ttlMs: 60_000, staleOk: true },
  );
  const m = res.markets?.['1x2'];
  if (!m) return null;
  return { home: m.home, draw: m.draw, away: m.away, updatedAt: res.updated_at };
}

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
  momentum,
  incidents,
  polymarket,
  allMatches: openfootball.allMatches,
  todayMatches: openfootball.todayMatches,
  upcomingMatches: openfootball.upcomingMatches,
  groups: openfootball.groups,
  bracket: openfootball.bracket,
  finalMatch: openfootball.finalMatch,
  teams: openfootball.teams,
  stadiums: openfootball.stadiums,
};
