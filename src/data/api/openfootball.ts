import { requestCached } from './client';
import type {
  Match,
  Group,
  GroupStanding,
  BracketNode,
  BracketRound,
  MatchStatus,
} from '@/data/types';
import { nameToIso } from '@/utils/countryCodes';

const SOURCE =
  import.meta.env.VITE_OPENFOOTBALL_URL ??
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

type OfMatch = {
  round: string;
  date: string;
  time?: string;
  team1: string;
  team2: string;
  group?: string;
  ground?: string;
  score?: { ht?: [number, number]; ft?: [number, number] };
};

type OfPayload = {
  name: string;
  matches: OfMatch[];
};

const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function load(signal: AbortSignal): Promise<OfPayload> {
  return requestCached<OfPayload>('openfootball', SOURCE, { signal }, { ttlMs: TTL_MS, staleOk: true });
}

// ---------- Helpers ----------

function parseKickoff(date: string, time?: string): string {
  // "2026-06-11" + "13:00 UTC-6" → ISO. If time missing, assume kickoff at 00:00 UTC.
  if (!time) return new Date(`${date}T00:00:00Z`).toISOString();
  const match = /^(\d{2}):(\d{2})\s+UTC([+-]\d+)/.exec(time);
  if (!match) return new Date(`${date}T${time.slice(0, 5)}:00Z`).toISOString();
  const hh = match[1];
  const mm = match[2];
  const offset = match[3];
  if (!hh || !mm || !offset) return new Date(`${date}T00:00:00Z`).toISOString();
  // Build ISO with timezone offset like "2026-06-11T13:00:00-06:00".
  const sign = offset.startsWith('-') ? '-' : '+';
  const offsetHours = String(Math.abs(parseInt(offset, 10))).padStart(2, '0');
  const iso = `${date}T${hh}:${mm}:00${sign}${offsetHours}:00`;
  return new Date(iso).toISOString();
}

function deriveStatus(kickoffIso: string, score: OfMatch['score']): MatchStatus {
  if (score?.ft) return 'finished';
  const t = new Date(kickoffIso).getTime();
  const now = Date.now();
  if (t > now) return 'scheduled';
  // Live window: 0 → 120 min after kickoff
  if (now - t < 120 * 60 * 1000) return 'live';
  return 'scheduled';
}

function deriveMinute(kickoffIso: string, status: MatchStatus): number | undefined {
  if (status !== 'live') return undefined;
  const elapsed = Math.floor((Date.now() - new Date(kickoffIso).getTime()) / 60000);
  return Math.max(1, Math.min(120, elapsed));
}

function mapMatch(m: OfMatch, idx: number): Match {
  const kickoff = parseKickoff(m.date, m.time);
  const status = deriveStatus(kickoff, m.score);
  const group = m.group ? m.group.replace(/^Group\s+/, '') : undefined;
  const id = `${m.date}-${m.team1}-${m.team2}-${idx}`.replace(/\s+/g, '_');

  return {
    id,
    status,
    kickoff,
    minute: deriveMinute(kickoff, status),
    stage: m.round,
    group,
    stadium: {
      name: m.ground ?? 'TBD',
      city: m.ground ?? '',
    },
    home: {
      teamId: m.team1,
      name: m.team1,
      countryCode: nameToIso(m.team1),
      score: m.score?.ft?.[0] ?? m.score?.ht?.[0],
    },
    away: {
      teamId: m.team2,
      name: m.team2,
      countryCode: nameToIso(m.team2),
      score: m.score?.ft?.[1] ?? m.score?.ht?.[1],
    },
  };
}

function isSameDay(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 10) === isoB.slice(0, 10);
}

// ---------- Adapter ----------

export const openfootball = {
  allMatches: async (_: void, signal: AbortSignal): Promise<Match[]> => {
    const p = await load(signal);
    return p.matches.map(mapMatch);
  },

  todayMatches: async (args: { date: string }, signal: AbortSignal): Promise<Match[]> => {
    const p = await load(signal);
    return p.matches.map(mapMatch).filter((m) => isSameDay(m.kickoff, args.date));
  },

  upcomingMatches: async (args: { limit: number }, signal: AbortSignal): Promise<Match[]> => {
    const p = await load(signal);
    const now = Date.now();
    return p.matches
      .map(mapMatch)
      .filter((m) => new Date(m.kickoff).getTime() > now)
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      .slice(0, args.limit);
  },

  liveMatches: async (_: void, signal: AbortSignal): Promise<Match[]> => {
    const p = await load(signal);
    return p.matches.map(mapMatch).filter((m) => m.status === 'live');
  },

  groups: async (_: void, signal: AbortSignal): Promise<Group[]> => {
    const p = await load(signal);
    const matches = p.matches.map(mapMatch).filter((m) => m.group);

    // Aggregate per group letter
    const byGroup = new Map<string, Map<string, GroupStanding>>();
    for (const m of matches) {
      if (!m.group) continue;
      const groupMap = byGroup.get(m.group) ?? new Map<string, GroupStanding>();

      for (const [team, , gf, ga] of [
        [m.home, m.away, m.home.score, m.away.score],
        [m.away, m.home, m.away.score, m.home.score],
      ] as const) {
        const existing = groupMap.get(team.teamId) ?? {
          team: {
            id: team.teamId,
            name: team.name,
            countryCode: team.countryCode,
            federation: 'UEFA' as const,
          },
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          pts: 0,
        };
        if (m.status === 'finished' && gf !== undefined && ga !== undefined) {
          existing.played++;
          existing.gf += gf;
          existing.ga += ga;
          existing.gd = existing.gf - existing.ga;
          if (gf > ga) {
            existing.won++;
            existing.pts += 3;
          } else if (gf < ga) {
            existing.lost++;
          } else {
            existing.drawn++;
            existing.pts += 1;
          }
        }
        groupMap.set(team.teamId, existing);
      }
      byGroup.set(m.group, groupMap);
    }

    return Array.from(byGroup.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([letter, m]) => ({
        letter,
        standings: Array.from(m.values()).sort(
          (a, b) =>
            b.pts - a.pts ||
            b.gd - a.gd ||
            b.gf - a.gf ||
            a.team.name.localeCompare(b.team.name),
        ),
      }));
  },

  bracket: async (_: void, signal: AbortSignal): Promise<BracketNode[]> => {
    const p = await load(signal);
    const matches = p.matches.map(mapMatch);

    // Round strings observed in openfootball/worldcup.json 2026:
    //   "Round of 32", "Round of 16", "Quarter-final", "Semi-final",
    //   "Match for third place", "Final"
    const ROUND_MAP: Array<{ test: RegExp; round: BracketRound }> = [
      { test: /Round of 32/i, round: 'R32' },
      { test: /Round of 16/i, round: 'R16' },
      { test: /Quarter[- ]?final/i, round: 'QF' },
      { test: /Semi[- ]?final/i, round: 'SF' },
      { test: /Match for third place|Play-?off for third|3rd place|Third place/i, round: '3rd' },
      { test: /^Final\b/i, round: 'F' },
    ];

    const out: BracketNode[] = [];
    for (const m of matches) {
      const entry = ROUND_MAP.find((r) => r.test.test(m.stage));
      if (!entry) continue;
      out.push({
        id: `n-${m.id}`,
        round: entry.round,
        matchId: m.id,
        home: { teamId: m.home.teamId, name: m.home.name, countryCode: m.home.countryCode },
        away: { teamId: m.away.teamId, name: m.away.name, countryCode: m.away.countryCode },
        winnerTeamId:
          m.status === 'finished'
            ? (m.home.score ?? 0) > (m.away.score ?? 0)
              ? m.home.teamId
              : m.away.teamId
            : undefined,
      });
    }
    return out;
  },

  finalMatch: async (_: void, signal: AbortSignal): Promise<Match> => {
    const p = await load(signal);
    const matches = p.matches.map(mapMatch);
    const final = matches.find((m) => /^Final\b/i.test(m.stage));
    if (!final) throw new Error('Final not found in openfootball payload');
    return final;
  },
};
