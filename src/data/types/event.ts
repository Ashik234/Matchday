export type MatchEventType =
  | 'goal'
  | 'own-goal'
  | 'penalty'
  | 'yellow'
  | 'red'
  | 'sub';

export type MatchEvent = {
  id: string;
  matchId: string;
  minute: number;
  type: MatchEventType;
  teamId: string;
  playerName: string;
  detail?: string;
};
