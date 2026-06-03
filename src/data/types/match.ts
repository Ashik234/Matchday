export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';

export type MatchTeam = {
  teamId: string;
  name: string;
  countryCode: string;
  score?: number;
};

export type Match = {
  id: string;
  status: MatchStatus;
  kickoff: string;
  minute?: number;
  stage: string;
  group?: string;
  stadium: { name: string; city: string };
  home: MatchTeam;
  away: MatchTeam;
};
