export type Federation = 'AFC' | 'CAF' | 'CONCACAF' | 'CONMEBOL' | 'OFC' | 'UEFA';

export type Team = {
  id: string;
  name: string;
  countryCode: string;
  federation: Federation;
  fifaRank?: number;
  group?: string;
};
