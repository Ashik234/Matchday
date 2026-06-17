import { bzzoiroRequest } from './client';
import { openfootball } from './openfootball';
import type { Paginated, TeamV2 } from './bzzoiroTypes';

// teamCode (FIFA, e.g. "ARG") -> bzzoiro numeric team id. Built once, cached.
let cache: Map<string, number> | null = null;

async function build(signal: AbortSignal): Promise<Map<string, number>> {
  const teams = await openfootball.teams(undefined, signal);
  const map = new Map<string, number>();
  await Promise.all(
    teams.map(async (t) => {
      try {
        const res = await bzzoiroRequest<Paginated<TeamV2>>(
          `/api/v2/teams/?name=${encodeURIComponent(t.name)}&limit=1`,
          signal,
          { ttlMs: 24 * 60 * 60 * 1000, staleOk: true },
        );
        const match = res.results[0];
        if (match) map.set(t.id, match.id);
      } catch {
        /* skip unresolved team */
      }
    }),
  );
  return map;
}

export async function resolveTeamId(
  teamCode: string,
  signal: AbortSignal,
): Promise<number | undefined> {
  if (!cache) cache = await build(signal);
  return cache.get(teamCode);
}
