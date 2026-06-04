import type { Team } from './team';

export type GroupStanding = {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
};

export type Group = {
  letter: string;
  standings: GroupStanding[];
};
