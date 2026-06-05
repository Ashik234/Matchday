export type HistoricalEventType =
  | 'goal'
  | 'own-goal'
  | 'penalty'
  | 'yellow'
  | 'red'
  | 'sub';

export type HistoricalEvent = {
  minute: number;
  type: HistoricalEventType;
  teamCode: string;
  player: string;
  detail?: string;
};

export type HistoricalMatch = {
  id: string;
  tournament: string;
  date: string;
  stage: string;
  home: { code: string; name: string; score: number };
  away: { code: string; name: string; score: number };
  stadium?: string;
  attendance?: number;
  referee?: string;
  events: HistoricalEvent[];
};

export type MatchHistoryPayload = {
  scrapedAt: string;
  matches: HistoricalMatch[];
};
