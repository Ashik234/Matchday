import todayMatches from './today-matches.json';
import upcomingMatches from './upcoming-matches.json';
import groups from './groups.json';
import liveSample from './live-sample.json';
import teams from './teams.json';
import bracket from './bracket.json';
import finalMatch from './final-match.json';
import matchEvents from './match-events.json';

import type { Match, Group, Team, BracketNode, MatchEvent } from '@/data/types';

export const fixtures = {
  todayMatches: todayMatches as Match[],
  upcomingMatches: upcomingMatches as Match[],
  groups: groups as Group[],
  liveSample: liveSample as Match,
  teams: teams as Team[],
  bracket: bracket as BracketNode[],
  finalMatch: finalMatch as Match,
  matchEvents: matchEvents as MatchEvent[],
};
