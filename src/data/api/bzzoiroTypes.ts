// Raw shapes returned by sports.bzzoiro.com /api/v2 — verified 2026-06-17.

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

// Minute-by-minute pressure index from GET /api/v2/events/{id}/stats/.
// v positive = home dominance, negative = away.
export type MomentumPoint = { m: number; v: number };

export type EventStatsV2 = {
  event_id: number;
  momentum: MomentumPoint[] | null;
};

export type SquadRowV2 = {
  id: number;
  team_id: number;
  name: string;
  jersey_number: number;
  position: 'GK' | 'DF' | 'MF' | 'FW' | string;
  status: 'official' | 'preliminary' | 'projected' | 'dropped';
  call_up_date: string | null;
  club: string;
  club_country: string;
  caps: number | null;
  goals: number | null;
  date_of_birth: string | null;
  age: number | null;
  player_id: number | null;
};

export type TeamV2 = {
  id: number;
  name: string;
  short_name: string;
  country: string;
  venue_id: number | null;
};

export type EventV2 = {
  id: number;
  league_id: number | null;
  season_id: number | null;
  home_team_id: number;
  home_team: string;
  away_team_id: number;
  away_team: string;
  venue_id: number | null;
  event_date: string;
  status: string;
  round_name: string;
  group_name: string | null;
  period: string;
  current_minute: number | null;
  home_score: number | null;
  away_score: number | null;
  home_score_ht: number | null;
  away_score_ht: number | null;
  live_websocket: boolean;
  websocket_plus: boolean;
};
