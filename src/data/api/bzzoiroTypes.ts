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

// Polymarket prediction-market prices. Values are implied probabilities (0–1);
// decimal odds = 1 / price. `detail` is present when no market is available.
export type PolymarketMarket1x2 = {
  home: number | null;
  draw: number | null;
  away: number | null;
};
export type PolymarketResponse = {
  event_id?: number;
  polymarket_event_id?: string;
  markets?: { '1x2'?: PolymarketMarket1x2 };
  updated_at?: string;
  detail?: string;
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

// Match incidents from GET /api/v2/events/{id}/incidents/. The per-incident
// shape is undocumented, so the raw array is `unknown[]` and coerced in
// bzzoiroIncidents.ts.
export type IncidentsResponseV2 = {
  event_id?: number;
  incidents?: unknown[];
};

export type IncidentType =
  | 'goal'
  | 'own-goal'
  | 'penalty'
  | 'penalty-miss'
  | 'yellow'
  | 'red'
  | 'sub'
  | 'var'
  | 'unknown';

// Normalised incident the UI renders. `teamSide` is resolved from the raw
// team id against the event's home team; defaults to 'home' when unknown.
export type Incident = {
  id: string;
  minute: number;
  addedTime?: number;
  type: IncidentType;
  teamSide: 'home' | 'away';
  player: string;
  detail?: string;
};
