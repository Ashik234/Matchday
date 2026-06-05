export type Scorer = {
  player: string;
  /** Minute of the goal (e.g. 23, 45, 90). For stoppage time, base minute (90 for 90+3). */
  minute: number;
  /** Optional stoppage-time addition for cleaner display. */
  stoppage?: number;
  team: 'home' | 'away';
  ownGoal?: boolean;
  penalty?: boolean;
};

export type ResultStatus = 'FT' | 'AET' | 'PEN';

export type MatchResult = {
  /** Slug from `toMatchSlug(match)` — used as the manifest key. */
  matchId: string;
  status: ResultStatus;
  homeScore: number;
  awayScore: number;
  /** Penalty-shootout scores when status === 'PEN'. */
  homePenScore?: number;
  awayPenScore?: number;
  scorers: Scorer[];
  /** ISO timestamp this result was scraped/observed. */
  finishedAt: string;
};

export type MatchResultsPayload = {
  scrapedAt: string;
  source: string;
  results: Record<string, MatchResult>;
};
