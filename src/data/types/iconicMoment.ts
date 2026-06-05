export type MomentCategory =
  | 'goal'
  | 'final'
  | 'upset'
  | 'record'
  | 'player'
  | 'match';

export type IconicMoment = {
  /** Unique slug, e.g. "1986-hand-of-god" */
  id: string;
  /** MM-DD — calendar date (no year) for "on this day" matching */
  date: string;
  year: number;
  title: string;
  /** e.g. "Argentina vs England" */
  subtitle: string;
  /** e.g. "Quarter Final · Mexico City" */
  stage: string;
  /** 2–3 sentence narrative shown in the card */
  description: string;
  category: MomentCategory;
  /** 1–100. Drives which moment wins when multiple share a date. */
  importance: number;
  /** 3-letter FIFA codes of the teams involved */
  teams: string[];
  /** Primary player associated with the moment */
  player?: string;
  /** Absolute path under /public, e.g. "/images/history/1986-hand-of-god.webp" */
  image?: string;
  videoUrl?: string;
  relatedMatchId?: string;
};

export type IconicMomentsPayload = {
  moments: IconicMoment[];
};
