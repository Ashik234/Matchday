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
  // True when this event pushes live updates over the bzzoiro WebSocket
  // (/ws/live/). Undefined for sources without live tracking (e.g. openfootball).
  liveWsTracked?: boolean;
};
