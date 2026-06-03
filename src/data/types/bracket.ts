export type BracketRound = 'R32' | 'R16' | 'QF' | 'SF' | 'F' | '3rd';

export type BracketSide = {
  teamId: string;
  name: string;
  countryCode: string;
};

export type BracketNode = {
  id: string;
  round: BracketRound;
  matchId?: string;
  home?: BracketSide;
  away?: BracketSide;
  winnerTeamId?: string;
  nextNodeId?: string;
};
