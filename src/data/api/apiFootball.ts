import { request } from './client';
import type { Match, Group, GroupStanding, Team, Federation, BracketNode, BracketRound, Stadium } from '@/data/types';
import { nameToIso } from '@/utils/countryCodes';

const BASE = import.meta.env.VITE_API_FOOTBALL_BASE_URL ?? 'https://v3.football.api-sports.io';
const KEY = import.meta.env.VITE_API_FOOTBALL_KEY;
const LEAGUE = 1;
const SEASON = 2026;

function headers(): HeadersInit {
  return KEY ? { 'x-apisports-key': KEY } : {};
}

// ---------- Response shapes (partial) ----------

type AfResponse<T> = { response: T[] };

type AfFixture = {
  fixture: {
    id: number;
    date: string;
    status: { short: string; elapsed: number | null };
    venue: { name: string | null; city: string | null };
  };
  league: { round: string };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number | null; away: number | null };
};

type AfTeamRow = {
  team: { id: number; name: string };
  played?: { all?: { played: number }; total?: number };
  win?: { total: number };
  draw?: { total: number };
  lose?: { total: number };
  goals?: { for?: { total: number }; against?: { total: number } };
  goalsDiff?: number;
  points?: number;
};

type AfStandingsResponse = {
  league: {
    standings: AfTeamRow[][];
  };
};

type AfTeam = {
  team: { id: number; name: string; code: string | null; country: string };
};

type AfVenue = {
  id: number;
  name: string;
  city: string;
  country: string;
  capacity: number;
};

// ---------- Status mapping ----------

const STATUS_TO_DOMAIN: Record<string, 'scheduled' | 'live' | 'finished' | 'postponed'> = {
  TBD: 'scheduled',
  NS: 'scheduled',
  '1H': 'live', HT: 'live', '2H': 'live', ET: 'live', BT: 'live',
  P: 'live', SUSP: 'live', INT: 'live', LIVE: 'live',
  FT: 'finished', AET: 'finished', PEN: 'finished',
  PST: 'postponed', CANC: 'postponed', ABD: 'postponed',
  AWD: 'finished', WO: 'finished',
};

// ---------- Mappers ----------

function mapFixture(f: AfFixture): Match {
  const status = STATUS_TO_DOMAIN[f.fixture.status.short] ?? 'scheduled';
  // API-Football returns league.round like "Group A - 1" or "Round of 16" or "Final"
  const round = f.league.round ?? '';
  const groupMatch = /Group ([A-L])/.exec(round);
  const group = groupMatch ? groupMatch[1] : undefined;
  const stage = round.replace(/ - \d+$/, '');

  return {
    id: String(f.fixture.id),
    status,
    kickoff: f.fixture.date,
    minute: f.fixture.status.elapsed ?? undefined,
    stage,
    group,
    stadium: {
      name: f.fixture.venue.name ?? 'TBD',
      city: f.fixture.venue.city ?? '',
    },
    home: {
      teamId: String(f.teams.home.id),
      name: f.teams.home.name,
      countryCode: nameToIso(f.teams.home.name),
      score: f.goals.home ?? undefined,
    },
    away: {
      teamId: String(f.teams.away.id),
      name: f.teams.away.name,
      countryCode: nameToIso(f.teams.away.name),
      score: f.goals.away ?? undefined,
    },
  };
}

function detectFederation(country: string): Federation {
  // Rough heuristic for fallback display. API-Football doesn't return confederation.
  const EU = ['England','France','Germany','Spain','Portugal','Netherlands','Italy','Croatia','Belgium','Switzerland','Scotland','Austria','Denmark','Sweden','Norway','Poland','Wales','Czechia','Türkiye','Turkey','Bosnia & Herzegovina','Czech Republic'];
  const SA = ['Brazil','Argentina','Uruguay','Colombia','Ecuador','Paraguay','Peru','Chile'];
  const AF = ['Senegal','Morocco','Egypt','Ghana','Tunisia','Algeria','Nigeria','Cameroon','South Africa','DR Congo',"Côte d'Ivoire",'Cabo Verde'];
  const AS = ['Japan','South Korea','Korea Republic','Saudi Arabia','Iran','Australia','Qatar','Iraq','Uzbekistan','Jordan'];
  const CN = ['United States','USA','Mexico','Canada','Costa Rica','Panama','Haiti','Curaçao','Jamaica'];
  if (EU.includes(country)) return 'UEFA';
  if (SA.includes(country)) return 'CONMEBOL';
  if (AF.includes(country)) return 'CAF';
  if (AS.includes(country)) return 'AFC';
  if (CN.includes(country)) return 'CONCACAF';
  return 'OFC';
}

function mapTeam(t: AfTeam): Team {
  return {
    id: String(t.team.id),
    name: t.team.name,
    countryCode: nameToIso(t.team.country) || nameToIso(t.team.name),
    federation: detectFederation(t.team.country),
  };
}

function mapStanding(row: AfTeamRow): GroupStanding {
  return {
    team: {
      id: String(row.team.id),
      name: row.team.name,
      countryCode: nameToIso(row.team.name),
      federation: detectFederation(row.team.name),
    },
    played: row.played?.all?.played ?? row.played?.total ?? 0,
    won: row.win?.total ?? 0,
    drawn: row.draw?.total ?? 0,
    lost: row.lose?.total ?? 0,
    gf: row.goals?.for?.total ?? 0,
    ga: row.goals?.against?.total ?? 0,
    gd: row.goalsDiff ?? 0,
    pts: row.points ?? 0,
  };
}

function mapVenue(v: AfVenue): Stadium {
  return {
    id: String(v.id),
    name: v.name,
    city: v.city,
    country: v.country,
    capacity: v.capacity,
  };
}

// ---------- Adapter ----------

export const apiFootball = {
  teams: async (_: void, signal: AbortSignal): Promise<Team[]> => {
    const raw = await request<AfResponse<AfTeam>>(
      'apiFootball',
      `${BASE}/teams?league=${LEAGUE}&season=${SEASON}`,
      { signal, headers: headers() },
    );
    return raw.response.map(mapTeam);
  },

  todayMatches: async (args: { date: string }, signal: AbortSignal): Promise<Match[]> => {
    const raw = await request<AfResponse<AfFixture>>(
      'apiFootball',
      `${BASE}/fixtures?league=${LEAGUE}&season=${SEASON}&date=${encodeURIComponent(args.date)}`,
      { signal, headers: headers() },
    );
    return raw.response.map(mapFixture);
  },

  upcomingMatches: async (args: { limit: number }, signal: AbortSignal): Promise<Match[]> => {
    const raw = await request<AfResponse<AfFixture>>(
      'apiFootball',
      `${BASE}/fixtures?league=${LEAGUE}&season=${SEASON}&status=NS&next=${args.limit}`,
      { signal, headers: headers() },
    );
    return raw.response.map(mapFixture);
  },

  liveMatches: async (_: void, signal: AbortSignal): Promise<Match[]> => {
    const raw = await request<AfResponse<AfFixture>>(
      'apiFootball',
      `${BASE}/fixtures?league=${LEAGUE}&season=${SEASON}&live=all`,
      { signal, headers: headers() },
    );
    return raw.response.map(mapFixture);
  },

  match: async (args: { id: string }, signal: AbortSignal): Promise<Match> => {
    const raw = await request<AfResponse<AfFixture>>(
      'apiFootball',
      `${BASE}/fixtures?id=${encodeURIComponent(args.id)}`,
      { signal, headers: headers() },
    );
    const first = raw.response[0];
    if (!first) throw new Error(`Fixture ${args.id} not found`);
    return mapFixture(first);
  },

  groups: async (_: void, signal: AbortSignal): Promise<Group[]> => {
    const raw = await request<AfResponse<AfStandingsResponse>>(
      'apiFootball',
      `${BASE}/standings?league=${LEAGUE}&season=${SEASON}`,
      { signal, headers: headers() },
    );
    const first = raw.response[0];
    if (!first) return [];
    return first.league.standings.map((rows, i) => ({
      letter: String.fromCharCode(65 + i),
      standings: rows.map(mapStanding),
    }));
  },

  bracket: async (_: void, signal: AbortSignal): Promise<BracketNode[]> => {
    // Pull knockout rounds: Round of 32, Round of 16, Quarter-finals, Semi-finals, Final
    const ROUNDS: Array<{ q: string; round: BracketRound }> = [
      { q: 'Round of 32', round: 'R32' },
      { q: 'Round of 16', round: 'R16' },
      { q: 'Quarter-finals', round: 'QF' },
      { q: 'Semi-finals', round: 'SF' },
      { q: 'Final', round: 'F' },
    ];
    const all: BracketNode[] = [];
    for (const r of ROUNDS) {
      const raw = await request<AfResponse<AfFixture>>(
        'apiFootball',
        `${BASE}/fixtures?league=${LEAGUE}&season=${SEASON}&round=${encodeURIComponent(r.q)}`,
        { signal, headers: headers() },
      );
      raw.response.forEach((f) => {
        const m = mapFixture(f);
        all.push({
          id: `n-${m.id}`,
          round: r.round,
          matchId: m.id,
          home: { teamId: m.home.teamId, name: m.home.name, countryCode: m.home.countryCode },
          away: { teamId: m.away.teamId, name: m.away.name, countryCode: m.away.countryCode },
          winnerTeamId: m.status === 'finished'
            ? (m.home.score ?? 0) > (m.away.score ?? 0)
              ? m.home.teamId
              : m.away.teamId
            : undefined,
        });
      });
    }
    return all;
  },

  finalMatch: async (_: void, signal: AbortSignal): Promise<Match> => {
    const raw = await request<AfResponse<AfFixture>>(
      'apiFootball',
      `${BASE}/fixtures?league=${LEAGUE}&season=${SEASON}&round=${encodeURIComponent('Final')}`,
      { signal, headers: headers() },
    );
    const first = raw.response[0];
    if (!first) throw new Error('Final not found');
    return mapFixture(first);
  },

  venues: async (_: void, signal: AbortSignal): Promise<Stadium[]> => {
    // 3 host countries
    const HOSTS = ['United-States', 'Mexico', 'Canada'];
    const out: Stadium[] = [];
    for (const c of HOSTS) {
      const raw = await request<AfResponse<AfVenue>>(
        'apiFootball',
        `${BASE}/venues?country=${c}`,
        { signal, headers: headers() },
      );
      out.push(...raw.response.map(mapVenue));
    }
    return out;
  },

  // Kept for completeness — unused by UI right now
  h2h: async (args: { team1Id: string; team2Id: string }, signal: AbortSignal): Promise<{ totalMatches: number; homeWins: number; awayWins: number; draws: number }> => {
    const raw = await request<AfResponse<AfFixture>>(
      'apiFootball',
      `${BASE}/fixtures/headtohead?h2h=${args.team1Id}-${args.team2Id}`,
      { signal, headers: headers() },
    );
    const fixtures = raw.response;
    let homeWins = 0, awayWins = 0, draws = 0;
    for (const f of fixtures) {
      const h = f.goals?.home ?? 0;
      const a = f.goals?.away ?? 0;
      if (h > a) homeWins++;
      else if (a > h) awayWins++;
      else draws++;
    }
    return { totalMatches: fixtures.length, homeWins, awayWins, draws };
  },
};
