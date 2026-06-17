import type { SquadRowV2, EventV2 } from './bzzoiroTypes';
import type { Match, Player, Position, MatchStatus } from '@/data/types';
import { nameToIso } from '@/utils/countryCodes';

const POSITIONS: Position[] = ['GK', 'DF', 'MF', 'FW'];

export function mapStatus(s: string): MatchStatus {
  if (s === 'finished') return 'finished';
  if (s === 'inprogress' || s === 'live') return 'live';
  return 'scheduled';
}

export function mapSquadRow(row: SquadRowV2, teamCode: string): Player {
  const position = (POSITIONS.includes(row.position as Position)
    ? row.position
    : 'MF') as Position;
  return {
    id: `${teamCode}-${row.jersey_number}`,
    teamCode,
    jersey: row.jersey_number,
    name: row.name,
    position,
    club: row.club,
    age: row.age ?? undefined,
    caps: row.caps ?? undefined,
    goals: row.goals ?? undefined,
  };
}

export function mapEvent(e: EventV2): Match {
  const status = mapStatus(e.status);
  return {
    id: String(e.id),
    status,
    kickoff: new Date(e.event_date).toISOString(),
    minute: status === 'live' ? (e.current_minute ?? undefined) : undefined,
    stage: e.round_name || 'Group Stage',
    group: e.group_name ?? undefined,
    stadium: { name: 'TBD', city: '' },
    home: {
      teamId: String(e.home_team_id),
      name: e.home_team,
      countryCode: nameToIso(e.home_team),
      score: e.home_score ?? undefined,
    },
    away: {
      teamId: String(e.away_team_id),
      name: e.away_team,
      countryCode: nameToIso(e.away_team),
      score: e.away_score ?? undefined,
    },
    liveWsTracked: e.live_websocket,
  };
}
