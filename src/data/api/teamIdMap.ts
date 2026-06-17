import { bzzoiroRequest } from './client';
import { openfootball } from './openfootball';
import { getCached, setCached } from '@/data/cache/storageCache';
import type { Paginated, TeamV2 } from './bzzoiroTypes';

// teamCode (FIFA, e.g. "ARG") -> bzzoiro numeric team id, resolved lazily one
// team at a time. Resolution is cached durably (localStorage, 30d) so a resolved
// team costs zero API calls on later reads or reloads, and concurrent calls for
// the same team share a single in-flight request.

const RESOLVE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // team ids are stable
const cacheKey = (teamCode: string) => `teamid:${teamCode}`;

// teamCode -> full name, built once from the static openfootball teams list
// (already cached; not the bzzoiro API).
let nameMap: Map<string, string> | null = null;
// teamCode -> in-flight resolution, to de-dupe concurrent callers.
const inFlight = new Map<string, Promise<number | undefined>>();

async function teamName(teamCode: string, signal: AbortSignal): Promise<string | undefined> {
  if (!nameMap) {
    const teams = await openfootball.teams(undefined, signal);
    nameMap = new Map(teams.map((t) => [t.id, t.name]));
  }
  return nameMap.get(teamCode);
}

async function lookup(teamCode: string, signal: AbortSignal): Promise<number | undefined> {
  const name = await teamName(teamCode, signal);
  if (!name) return undefined;
  try {
    const res = await bzzoiroRequest<Paginated<TeamV2>>(
      `/api/v2/teams/?name=${encodeURIComponent(name)}&limit=1`,
      signal,
      { ttlMs: RESOLVE_TTL_MS, staleOk: false },
    );
    const id = res.results[0]?.id;
    if (id !== undefined) setCached(cacheKey(teamCode), id, RESOLVE_TTL_MS);
    return id;
  } catch {
    return undefined; // not cached — a later attempt can retry
  }
}

export async function resolveTeamId(
  teamCode: string,
  signal: AbortSignal,
): Promise<number | undefined> {
  const cached = getCached<number>(cacheKey(teamCode));
  if (cached) return cached.value;

  const existing = inFlight.get(teamCode);
  if (existing) return existing;

  const p = lookup(teamCode, signal).finally(() => inFlight.delete(teamCode));
  inFlight.set(teamCode, p);
  return p;
}
