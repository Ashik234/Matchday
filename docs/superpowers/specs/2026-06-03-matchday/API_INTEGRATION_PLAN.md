# Matchday — API Integration Plan

**Date:** 2026-06-03

---

## Goals

- All three real APIs wired from day one.
- Each provider isolated behind a single adapter file.
- Normalized domain types — components never see raw provider shapes.
- Automatic fallback to local fixtures on error or rate-limit so dev stays unblocked.
- Aggressive caching to respect free-tier rate limits (API-Football is the tight one: ~100 requests/day).

---

## Sources

### 1. World Cup 2026 API

- **Adapter:** `src/data/api/wc2026.ts`.
- **Base URL:** to be resolved in Phase 2 discovery (candidates: `worldcupjson.net`, `api.fifa.com` mirrors, or a community-maintained 2026 API).
- **Auth:** header `X-API-Key`, env `VITE_WC2026_KEY` (may be empty if provider is public).
- **Resources consumed:**
  - `teams()` — list all participating teams.
  - `matchesByDate(isoDate)` — matches on a given day.
  - `liveMatches()` — currently live.
  - `upcomingMatches(limit)` — next N kickoffs.
  - `groups()` — all groups with standings.
  - `stadiums()` — venues.
  - `match(matchId)` — single match detail.
  - `bracket()` — knockout bracket.

### 2. API-Football

- **Adapter:** `src/data/api/apiFootball.ts`.
- **Base URL:** `https://v3.football.api-sports.io`.
- **Auth:** header `x-apisports-key`, env `VITE_API_FOOTBALL_KEY`.
- **Rate limit:** free tier ~100 req/day → use sparingly.
- **Resources consumed:**
  - `h2h(team1Id, team2Id)` — head-to-head history.
  - `teamForm(teamId, last)` — last N matches for a team.
  - `teamCompare(team1Id, team2Id)` — comparative stats.

### 3. BallDontLie FIFA

- **Adapter:** `src/data/api/ballDontLie.ts`.
- **Base URL:** documented per BallDontLie FIFA docs.
- **Auth:** bearer token, env `VITE_BDL_KEY`.
- **Resources consumed:**
  - `playerStats(playerId)` — season stats.
  - `topScorers(competitionId)` — leaderboard.
  - `matchEvents(matchId)` — goals, cards, subs.
  - `teamStats(teamId)` — analytics (possession avg, xG, etc.).

---

## Common Client Layer

`src/data/api/client.ts`:

```ts
export class ApiError extends Error {
  constructor(
    public source: 'wc2026' | 'apiFootball' | 'ballDontLie',
    public status: number,
    public retryable: boolean,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(
  source: ApiError['source'],
  url: string,
  init: RequestInit & { signal: AbortSignal },
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const retryable = res.status === 429 || res.status >= 500;
    throw new ApiError(source, res.status, retryable, `${source} ${res.status}`);
  }
  return res.json() as Promise<T>;
}
```

All adapters call `request()` so error semantics are uniform.

---

## Adapter Contract

```ts
type Adapter<TArgs, TOut> = (
  args: TArgs,
  signal: AbortSignal,
) => Promise<TOut>;
```

Adapters:

- Build provider-specific URL + headers.
- Call `request()`.
- Map raw response → normalized domain type (`Match`, `Team`, `Group`, etc.).
- Never throw raw fetch errors — always `ApiError`.

Example signature:

```ts
export const wc2026 = {
  todayMatches: (args: { date: string }, signal: AbortSignal): Promise<Match[]> => …,
  liveMatches: (args: void, signal: AbortSignal): Promise<Match[]> => …,
  // …
};
```

---

## Normalized Domain Types

Defined once in `src/data/types/`. Every adapter maps to these — components never depend on a provider shape.

```ts
// match.ts
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';

export type Match = {
  id: string;
  status: MatchStatus;
  kickoff: string;                      // ISO 8601
  minute?: number;                      // when live
  stage: string;                        // 'Group A', 'Round of 16', etc.
  group?: string;                       // 'A' …
  stadium: { name: string; city: string };
  home: { teamId: string; name: string; countryCode: string; score?: number };
  away: { teamId: string; name: string; countryCode: string; score?: number };
};

// team.ts
export type Team = {
  id: string;
  name: string;
  countryCode: string;
  federation: 'AFC' | 'CAF' | 'CONCACAF' | 'CONMEBOL' | 'OFC' | 'UEFA';
  fifaRank?: number;
};

// group.ts
export type GroupStanding = {
  team: Team;
  played: number; won: number; drawn: number; lost: number;
  gf: number; ga: number; gd: number; pts: number;
};
export type Group = { letter: string; standings: GroupStanding[] };

// event.ts
export type MatchEvent = {
  id: string;
  matchId: string;
  minute: number;
  type: 'goal' | 'yellow' | 'red' | 'sub' | 'own-goal' | 'penalty';
  teamId: string;
  playerName: string;
  detail?: string;
};

// bracket.ts
export type BracketNode = {
  id: string;
  round: 'R32' | 'R16' | 'QF' | 'SF' | 'F' | '3rd';
  matchId?: string;
  home?: { teamId: string; name: string; countryCode: string };
  away?: { teamId: string; name: string; countryCode: string };
  winnerTeamId?: string;
  nextNodeId?: string;
};
```

---

## TanStack Query Layer

`src/data/queries/` — one hook per resource. Shape:

```ts
export function useTodayMatches() {
  return useQuery({
    queryKey: ['today-matches', isoDate(new Date())],
    queryFn: ({ signal }) => wc2026.todayMatches({ date: isoDate(new Date()) }, signal),
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    retry: 2,
    placeholderData: () => fixtures.todayMatches,
  });
}
```

### Stale-time tuning

| Resource | staleTime |
| --- | --- |
| Live matches / events | 15s |
| Today's matches | 60s |
| Upcoming matches | 5min |
| Tournament progress | 5min |
| Group standings | 5min |
| Featured teams list | 1h |
| Team stats | 1h |
| H2H / historical | 24h |
| Bracket | 5min |

### Retry policy

- `retry: 2` exponential backoff (default).
- On final failure → `placeholderData` injects fixtures; UI sets `fallbackBanner` for that section.

### Live polling

`useLiveMatch` and `useLiveEvents`:

- `refetchInterval: 15_000`.
- `refetchIntervalInBackground: false`.
- Gated by `useDocumentVisibility()` — stops polling when tab hidden.

### Hook return shape (enriched)

```ts
type EnrichedQueryResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  isFallback: boolean;   // true when data comes from fixtures
  refetch: () => void;
};
```

Computed: `isFallback = !!error && !!data` (placeholder kicked in after fail).

---

## Fixture Fallback

`src/data/fixtures/*.json` — hand-crafted or scraped sample payloads matching normalized types.

Triggers:

1. Adapter throws (any `ApiError`).
2. HTTP 429 detected.
3. Env override: `VITE_USE_FIXTURES=true` (dev convenience).

When fallback active:

- Component receives data normally.
- `<FallbackBanner>` shows: `Showing sample data — live feed unavailable. Retry.`
- Retry button calls `refetch()`.

Fixtures committed to repo. Realistic sample size (8 matches today, 12 groups, 32-team bracket, etc.).

---

## Env / Keys

`.env.example` (committed):

```
VITE_WC2026_KEY=
VITE_API_FOOTBALL_KEY=
VITE_BDL_KEY=
VITE_USE_FIXTURES=false
```

`.env.local` gitignored. Holds real keys.

**Security:**

- All three are client-side keys (the providers issue these for browser use).
- No server secret in MVP.
- If any provider later requires server-side secret → add Cloudflare Worker / Vercel Edge proxy. Out of MVP scope, flagged in `PROJECT_PLAN.md` risks.

---

## CORS Strategy

**Discovery in Phase 2:** hit each provider once from `localhost:5173` and document whether browser CORS is allowed.

- If allowed → call directly, no proxy.
- If blocked dev only → add `vite.config.ts` `server.proxy`:

```ts
server: {
  proxy: {
    '/api/wc': { target: 'https://provider.example', changeOrigin: true, rewrite: p => p.replace(/^\/api\/wc/, '') },
  },
}
```

- If blocked in prod → spec Cloudflare Worker / Vercel Edge function pass-through. Adapter base URL switches via env.

---

## Failure Matrix

| Scenario | UI Behavior |
| --- | --- |
| 200 OK | Render data. |
| 401 / 403 (bad key) | Show fallback + banner; log to console; do not retry. |
| 429 (rate limit) | Show fallback + banner; refetch automatically after `Retry-After` if present, else after 60s. |
| 5xx | Retry twice; if still fails, fallback + banner. |
| Network offline | Fallback + banner; auto-retry on `online` event. |
| CORS error | Fallback + banner; console.error with proxy hint in dev. |

---

## Testing

- Unit: adapter URL/header construction + normalization mappers.
- MSW (mock service worker) optional for dev — out of MVP unless flaky API blocks progress.
- Manual: dev toggle `VITE_USE_FIXTURES=true` proves UI works fully on fixtures alone.
