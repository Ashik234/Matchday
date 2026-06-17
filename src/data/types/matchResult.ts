export type Scorer = {
  player: string;
  minute: number;
  team: 'home' | 'away';
  ownGoal?: boolean;
  penalty?: boolean;
};

export type ResultStatus = 'FT' | 'AET' | 'PEN';

export type MatchResult = {
  matchId: string;
  status: ResultStatus;
  homeScore: number;
  awayScore: number;
  homePenScore?: number;
  awayPenScore?: number;
  scorers: Scorer[];
  finishedAt: string;
};

export type MatchResultsPayload = {
  scrapedAt: string;
  results: Record<string, MatchResult>;
};
