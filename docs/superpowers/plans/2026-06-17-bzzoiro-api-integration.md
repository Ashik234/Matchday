# Bzzoiro API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the Bzzoiro Sports API as primary live football source — real World Cup 2026 squads and live-WebSocket match updates — with openfootball as fallback.

**Architecture:** A new `bzzoiro` adapter mirrors the existing `openfootball` adapter's method signatures. A `dataSource` resolver picks the active adapter (fixtures → bzzoiro-if-keyed → openfootball). A `LiveSocket` class manages one shared, ref-counted WebSocket; a `useLiveEvent` hook subscribes per match with REST polling fallback.

**Tech Stack:** React 19, TypeScript, Vite, TanStack Query v5, zustand. No unit-test runner is configured — each task is verified with `npm run lint` + `npx tsc -b` (typecheck) and, where relevant, a live `curl`/`node` probe against the API. Every task ends in a commit.

## Global Constraints

- Commits: author = the user only. **No** `Co-Authored-By` trailer, **no** "Generated with" line. Plain conventional-commit style.
- Commit every task — never discard a change, even a single line.
- Token lives only in `.env` (gitignored) as `VITE_BZZOIRO_KEY`. Never commit the real token value.
- Vite exposes only `VITE_`-prefixed env vars to the client.
- Player real-photo scrape stays OUT — SVG-motif images via `usePlayerImages` are unchanged.
- Verify each task: `npm run lint && npx tsc -b` must pass before commit.

---

## File Structure

- `src/vite-env.d.ts` — add bzzoiro env var types (modify)
- `.env.example`, `.env` — add bzzoiro vars (modify)
- `src/data/api/client.ts` — add `'bzzoiro'` source + `bzzoiroRequest` (modify)
- `src/data/api/bzzoiroTypes.ts` — raw API response types (create)
- `src/data/api/bzzoiroMap.ts` — pure mappers raw→app types (create)
- `src/data/api/teamIdMap.ts` — name↔fifaCode↔teamId resolution (create)
- `src/data/api/bzzoiro.ts` — adapter mirroring openfootball (create)
- `src/data/api/dataSource.ts` — active-source resolver (create)
- `src/data/api/bzzoiroLive.ts` — `LiveSocket` class (create)
- `src/data/queries/useLiveEvent.ts` — live hook (create)
- `src/data/queries/useSquad.ts` — swap to resolved source (modify)
- `src/data/queries/use*Matches.ts`, `useBracket/useGroupStandings/useFinalMatch/useTeams/useStadiums.ts` — swap to `dataSource` (modify)
- `src/pages/MatchPage/` — wire `useLiveEvent` (modify)

---

### Task 1: Environment wiring

**Files:**
- Modify: `.env`, `.env.example`, `src/vite-env.d.ts`

**Interfaces:**
- Produces: env vars `VITE_BZZOIRO_API_URL`, `VITE_BZZOIRO_WS_URL`, `VITE_BZZOIRO_KEY`.

- [ ] **Step 1: Rename key + add URLs in `.env`**

Replace the `BSD=...` line. Final `.env` bzzoiro block:

```
# bzzoiro Sports API
VITE_BZZOIRO_API_URL=https://sports.bzzoiro.com
VITE_BZZOIRO_WS_URL=wss://sports.bzzoiro.com
VITE_BZZOIRO_KEY=<your-token-here>
```

- [ ] **Step 2: Mirror in `.env.example` (placeholder key)**

```
# bzzoiro Sports API — register free at https://sports.bzzoiro.com/register/
VITE_BZZOIRO_API_URL=https://sports.bzzoiro.com
VITE_BZZOIRO_WS_URL=wss://sports.bzzoiro.com
VITE_BZZOIRO_KEY=
```

- [ ] **Step 3: Add types in `src/vite-env.d.ts`**

Add inside `interface ImportMetaEnv`:

```ts
  readonly VITE_BZZOIRO_API_URL?: string;
  readonly VITE_BZZOIRO_WS_URL?: string;
  readonly VITE_BZZOIRO_KEY?: string;
```

- [ ] **Step 4: Verify gitignore + typecheck**

Run: `git check-ignore .env && npx tsc -b`
Expected: prints `.env`, tsc exits 0.

- [ ] **Step 5: Commit (`.env` excluded by gitignore)**

```bash
git add .env.example src/vite-env.d.ts
git commit -m "chore: add bzzoiro API env vars and types"
```

---

### Task 2: Raw API types

**Files:**
- Create: `src/data/api/bzzoiroTypes.ts`

**Interfaces:**
- Produces: `SquadRowV2`, `EventV2`, `TeamV2`, `Paginated<T>`.

- [ ] **Step 1: Create the file**

```ts
// Raw shapes returned by sports.bzzoiro.com /api/v2 — verified 2026-06-17.

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type SquadRowV2 = {
  id: number;
  team_id: number;
  name: string;
  jersey_number: number;
  position: 'GK' | 'DF' | 'MF' | 'FW' | string;
  status: 'official' | 'preliminary' | 'projected' | 'dropped';
  call_up_date: string | null;
  club: string;
  club_country: string;
  caps: number | null;
  goals: number | null;
  date_of_birth: string | null;
  age: number | null;
  player_id: number | null;
};

export type TeamV2 = {
  id: number;
  name: string;
  short_name: string;
  country: string;
  venue_id: number | null;
};

export type EventV2 = {
  id: number;
  league_id: number | null;
  season_id: number | null;
  home_team_id: number;
  home_team: string;
  away_team_id: number;
  away_team: string;
  venue_id: number | null;
  event_date: string;
  status: string; // notstarted | inprogress | finished | ...
  round_name: string;
  group_name: string | null;
  period: string;
  current_minute: number | null;
  home_score: number | null;
  away_score: number | null;
  home_score_ht: number | null;
  away_score_ht: number | null;
  live_websocket: boolean;
  websocket_plus: boolean;
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/data/api/bzzoiroTypes.ts
git commit -m "feat: add bzzoiro raw API response types"
```

---

### Task 3: Authenticated client

**Files:**
- Modify: `src/data/api/client.ts`

**Interfaces:**
- Consumes: `requestCached`, `ApiError` (existing).
- Produces: `bzzoiroRequest<T>(path, signal, opts?)`.

- [ ] **Step 1: Add `'bzzoiro'` to the `ApiSource` union**

Change line 3:

```ts
export type ApiSource = 'openfootball' | 'bzzoiro';
```

- [ ] **Step 2: Append `bzzoiroRequest` at end of file**

```ts
const BZZOIRO_BASE = import.meta.env.VITE_BZZOIRO_API_URL ?? 'https://sports.bzzoiro.com';
const BZZOIRO_KEY = import.meta.env.VITE_BZZOIRO_KEY;

export function bzzoiroRequest<T>(
  path: string,
  signal: AbortSignal,
  opts: RequestCachedOptions = { ttlMs: 60_000, staleOk: true },
): Promise<T> {
  const url = `${BZZOIRO_BASE}${path}`;
  const headers: Record<string, string> = {};
  if (BZZOIRO_KEY) headers.Authorization = `Token ${BZZOIRO_KEY}`;
  return requestCached<T>('bzzoiro', url, { signal, headers }, opts);
}

export function hasBzzoiroKey(): boolean {
  return Boolean(BZZOIRO_KEY);
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/data/api/client.ts
git commit -m "feat: add authenticated bzzoiro request helper"
```

---

### Task 4: Pure mappers

**Files:**
- Create: `src/data/api/bzzoiroMap.ts`

**Interfaces:**
- Consumes: `SquadRowV2`, `EventV2`, `TeamV2` (Task 2); app `Match`, `Player`, `Position`, `MatchStatus` from `@/data/types`.
- Produces: `mapSquadRow(row, teamCode)`, `mapEvent(e)`, `mapStatus(s)`.

- [ ] **Step 1: Create the file**

```ts
import type { SquadRowV2, EventV2 } from './bzzoiroTypes';
import type { Match, Player, Position, MatchStatus } from '@/data/types';
import { nameToIso } from '@/utils/countryCodes';

const POSITIONS: Position[] = ['GK', 'DF', 'MF', 'FW'];

export function mapStatus(s: string): MatchStatus {
  if (s === 'finished') return 'finished';
  if (s === 'inprogress' || s === 'live') return 'live';
  return 'scheduled';
}

export function mapSquadRow(row: SquadRowV2, teamCode: string): Player {
  const position = (POSITIONS.includes(row.position as Position)
    ? row.position
    : 'MF') as Position;
  return {
    id: `${teamCode}-${row.jersey_number}`,
    teamCode,
    jersey: row.jersey_number,
    name: row.name,
    position,
    club: row.club,
    age: row.age ?? undefined,
    caps: row.caps ?? undefined,
    goals: row.goals ?? undefined,
  };
}

export function mapEvent(e: EventV2): Match {
  const status = mapStatus(e.status);
  return {
    id: String(e.id),
    status,
    kickoff: new Date(e.event_date).toISOString(),
    minute: status === 'live' ? (e.current_minute ?? undefined) : undefined,
    stage: e.round_name || 'Group Stage',
    group: e.group_name ?? undefined,
    stadium: { name: 'TBD', city: '' },
    home: {
      teamId: String(e.home_team_id),
      name: e.home_team,
      countryCode: nameToIso(e.home_team),
      score: e.home_score ?? undefined,
    },
    away: {
      teamId: String(e.away_team_id),
      name: e.away_team,
      countryCode: nameToIso(e.away_team),
      score: e.away_score ?? undefined,
    },
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: exits 0. (If `Match`/`Player` field names differ, adjust to match `src/data/types/match.ts` and `src/data/types/player.ts`.)

- [ ] **Step 3: Commit**

```bash
git add src/data/api/bzzoiroMap.ts
git commit -m "feat: add bzzoiro response mappers"
```

---

### Task 5: Team id ↔ FIFA code resolution

**Files:**
- Create: `src/data/api/teamIdMap.ts`

**Interfaces:**
- Consumes: `bzzoiroRequest` (Task 3), `Paginated`, `TeamV2` (Task 2), `openfootball.teams` (existing), `nameToIso`.
- Produces: `resolveTeamId(teamCode, signal): Promise<number | undefined>`.

- [ ] **Step 1: Create the file**

```ts
import { bzzoiroRequest } from './client';
import { openfootball } from './openfootball';
import type { Paginated, TeamV2 } from './bzzoiroTypes';

// teamCode (FIFA, e.g. "ARG") -> bzzoiro numeric team id. Built once, cached.
let cache: Map<string, number> | null = null;

async function build(signal: AbortSignal): Promise<Map<string, number>> {
  const teams = await openfootball.teams(undefined, signal); // {id: fifaCode, name}
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
```

- [ ] **Step 2: Probe one resolution live**

Run:
```bash
curl -s -H "Authorization: Token $VITE_BZZOIRO_KEY" \
  "https://sports.bzzoiro.com/api/v2/teams/?name=Argentina&limit=1"
```
Expected: JSON with `"id":489,"name":"Argentina"`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/data/api/teamIdMap.ts
git commit -m "feat: add team code to bzzoiro id resolver"
```

---

### Task 6: bzzoiro adapter (squads + matches)

**Files:**
- Create: `src/data/api/bzzoiro.ts`

**Interfaces:**
- Consumes: `bzzoiroRequest` (Task 3), mappers (Task 4), `resolveTeamId` (Task 5), `Paginated`, `SquadRowV2`, `EventV2` (Task 2).
- Produces: `bzzoiro` object with `squad(teamCode, signal)`, `allMatches`, `liveMatches`, `todayMatches`, `upcomingMatches` (matching `openfootball` signatures). Group/bracket/stadiums delegate to openfootball (no WC league via API — documented).

- [ ] **Step 1: Create the file**

```ts
import { bzzoiroRequest } from './client';
import { openfootball } from './openfootball';
import { resolveTeamId } from './teamIdMap';
import { mapSquadRow, mapEvent } from './bzzoiroMap';
import type { Paginated, SquadRowV2, EventV2 } from './bzzoiroTypes';
import type { Match, Player } from '@/data/types';

const EVENTS_TTL = 30_000;

async function squad(teamCode: string, signal: AbortSignal): Promise<Player[]> {
  const teamId = await resolveTeamId(teamCode, signal);
  if (!teamId) return [];
  const res = await bzzoiroRequest<Paginated<SquadRowV2>>(
    `/api/v2/worldcup/squads/?team=${teamId}&status=official&limit=200`,
    signal,
    { ttlMs: 7 * 24 * 60 * 60 * 1000, staleOk: true },
  );
  return res.results
    .map((r) => mapSquadRow(r, teamCode))
    .sort((a, b) => a.jersey - b.jersey);
}

async function liveMatches(_: void, signal: AbortSignal): Promise<Match[]> {
  const res = await bzzoiroRequest<{ events: EventV2[] }>(
    `/api/v2/events/live/`,
    signal,
    { ttlMs: EVENTS_TTL, staleOk: true },
  );
  return (res.events ?? []).map(mapEvent);
}

// World Cup fixtures/groups/bracket are not exposed via a league filter on this
// API; delegate those to openfootball (the authoritative WC schedule source).
export const bzzoiro = {
  squad,
  liveMatches,
  allMatches: openfootball.allMatches,
  todayMatches: openfootball.todayMatches,
  upcomingMatches: openfootball.upcomingMatches,
  groups: openfootball.groups,
  bracket: openfootball.bracket,
  finalMatch: openfootball.finalMatch,
  teams: openfootball.teams,
  stadiums: openfootball.stadiums,
};
```

- [ ] **Step 2: Probe squad live**

Run:
```bash
curl -s -H "Authorization: Token $VITE_BZZOIRO_KEY" \
  "https://sports.bzzoiro.com/api/v2/worldcup/squads/?team=489&status=official&limit=2"
```
Expected: rows with `jersey_number`, `name`, `position`, `club`, `caps`, `goals`, `age`.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/data/api/bzzoiro.ts
git commit -m "feat: add bzzoiro adapter for squads and live matches"
```

---

### Task 7: Data-source resolver

**Files:**
- Create: `src/data/api/dataSource.ts`

**Interfaces:**
- Consumes: `openfootball`, `bzzoiro`, `hasBzzoiroKey` (Task 3).
- Produces: `activeSource` (the resolved adapter object).

- [ ] **Step 1: Create the file**

```ts
import { openfootball } from './openfootball';
import { bzzoiro } from './bzzoiro';
import { hasBzzoiroKey } from './client';

// Fixtures mode is handled per-hook by useEnriched. When a bzzoiro key is
// present, bzzoiro is primary (it delegates WC schedule calls to openfootball);
// otherwise openfootball is the source.
export const activeSource = hasBzzoiroKey() ? bzzoiro : openfootball;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: exits 0 (adapter shapes are compatible).

- [ ] **Step 3: Commit**

```bash
git add src/data/api/dataSource.ts
git commit -m "feat: add active data-source resolver"
```

---

### Task 8: Swap squad hook to bzzoiro

**Files:**
- Modify: `src/data/queries/useSquad.ts`

**Interfaces:**
- Consumes: `activeSource.squad` (Task 7), `usePlayerImages` (existing).
- Produces: `useSquad(teamCode)` returning real squad + SVG-motif images.

- [ ] **Step 1: Rewrite `useSquad.ts`**

```ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activeSource } from '@/data/api/dataSource';
import { usePlayerImages } from './usePlayerImages';
import type { Player } from '@/data/types';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function useSquad(teamCode?: string) {
  const q = useQuery<Player[], Error>({
    queryKey: ['squad', teamCode],
    queryFn: ({ signal }) => activeSource.squad(teamCode!, signal!),
    enabled: Boolean(teamCode),
    staleTime: TTL_MS,
  });
  const images = usePlayerImages();

  const players: Player[] = useMemo(() => {
    const base = q.data ?? [];
    const imageMap = images.data?.players ?? {};
    return base.map((p) => {
      const img = imageMap[p.id];
      return img ? { ...p, image: img } : p;
    });
  }, [q.data, images.data]);

  return { ...q, players };
}
```

- [ ] **Step 2: Verify `openfootball` has no `squad` method — add a delegate so the resolver type holds when no key is set**

In `src/data/api/openfootball.ts`, add inside the `openfootball` object:

```ts
  squad: async (): Promise<import('@/data/types').Player[]> => {
    // openfootball has no per-team squad data; squads require the bzzoiro key.
    return [];
  },
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Run the app, open a TeamPage, confirm real names render**

Run: `npm run dev`, open a team page (e.g. Argentina).
Expected: real player names/clubs/caps appear (not placeholders).

- [ ] **Step 5: Commit**

```bash
git add src/data/queries/useSquad.ts src/data/api/openfootball.ts
git commit -m "feat: load real World Cup squads from bzzoiro"
```

---

### Task 9: Swap match hooks to active source

**Files:**
- Modify: `src/data/queries/useLiveMatches.ts`, `useAllMatches.ts`, `useTodayMatches.ts`, `useUpcomingMatches.ts`, `useGroupStandings.ts`, `useBracket.ts`, `useFinalMatch.ts`, `useTeams.ts`, `useStadiums.ts`

**Interfaces:**
- Consumes: `activeSource` (Task 7).
- Produces: same hook return types as before.

- [ ] **Step 1: In each listed hook, replace the import and call**

Change:
```ts
import { openfootball } from '@/data/api/openfootball';
```
to:
```ts
import { activeSource } from '@/data/api/dataSource';
```
and replace every `openfootball.<method>(` with `activeSource.<method>(`.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Run app, confirm matches/groups/bracket still render**

Run: `npm run dev`
Expected: home/schedule/bracket pages render as before.

- [ ] **Step 4: Commit**

```bash
git add src/data/queries/
git commit -m "feat: route match data hooks through active source"
```

---

### Task 10: LiveSocket WebSocket client

**Files:**
- Create: `src/data/api/bzzoiroLive.ts`

**Interfaces:**
- Produces: `liveSocket.subscribe(eventId, cb): () => void`. Callback receives `LiveFrame`.
- Produces type `LiveFrame = { eventId: number; home_score?: number; away_score?: number; minute?: number; period?: string; momentum?: number; raw: unknown }`.

- [ ] **Step 1: Create the file**

```ts
export type LiveFrame = {
  eventId: number;
  home_score?: number;
  away_score?: number;
  minute?: number;
  period?: string;
  momentum?: number;
  raw: unknown;
};

type Listener = (frame: LiveFrame) => void;

const WS_BASE = import.meta.env.VITE_BZZOIRO_WS_URL ?? 'wss://sports.bzzoiro.com';
const KEY = import.meta.env.VITE_BZZOIRO_KEY;

class LiveSocket {
  private ws: WebSocket | null = null;
  private listeners = new Map<number, Set<Listener>>();
  private backoff = 1000;
  private connecting = false;

  private url(): string {
    // WS auth mechanism unconfirmed; default to query-param token.
    return KEY ? `${WS_BASE}/ws/live/?token=${KEY}` : `${WS_BASE}/ws/live/`;
  }

  private connect() {
    if (this.connecting || (this.ws && this.ws.readyState <= 1)) return;
    this.connecting = true;
    const ws = new WebSocket(this.url());
    this.ws = ws;

    ws.onopen = () => {
      this.connecting = false;
      this.backoff = 1000;
      for (const id of this.listeners.keys()) this.send(id);
    };
    ws.onmessage = (ev) => this.dispatch(ev.data);
    ws.onclose = () => {
      this.connecting = false;
      this.ws = null;
      if (this.listeners.size > 0) {
        setTimeout(() => this.connect(), this.backoff);
        this.backoff = Math.min(this.backoff * 2, 30_000);
      }
    };
    ws.onerror = () => ws.close();
  }

  private send(eventId: number) {
    if (this.ws?.readyState === 1) {
      this.ws.send(JSON.stringify({ action: 'subscribe', event_id: eventId }));
    }
  }

  private dispatch(data: string) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    const eventId = Number(msg.event_id ?? msg.eventId);
    if (!eventId) return;
    const frame: LiveFrame = {
      eventId,
      home_score: msg.home_score as number | undefined,
      away_score: msg.away_score as number | undefined,
      minute: (msg.minute ?? msg.current_minute) as number | undefined,
      period: msg.period as string | undefined,
      momentum: msg.momentum as number | undefined,
      raw: msg,
    };
    this.listeners.get(eventId)?.forEach((cb) => cb(frame));
  }

  subscribe(eventId: number, cb: Listener): () => void {
    let set = this.listeners.get(eventId);
    if (!set) {
      set = new Set();
      this.listeners.set(eventId, set);
    }
    set.add(cb);
    this.connect();
    this.send(eventId);

    return () => {
      const s = this.listeners.get(eventId);
      s?.delete(cb);
      if (s && s.size === 0) this.listeners.delete(eventId);
      if (this.listeners.size === 0) {
        this.ws?.close();
        this.ws = null;
      }
    };
  }
}

export const liveSocket = new LiveSocket();
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/data/api/bzzoiroLive.ts
git commit -m "feat: add ref-counted live WebSocket client"
```

---

### Task 11: useLiveEvent hook with polling fallback

**Files:**
- Create: `src/data/queries/useLiveEvent.ts`

**Interfaces:**
- Consumes: `liveSocket` (Task 10), `bzzoiroRequest` (Task 3), `EventV2` (Task 2).
- Produces: `useLiveEvent(eventId?, wsTracked?)` → `{ home_score, away_score, minute, period, momentum, connected }`.

- [ ] **Step 1: Create the file**

```ts
import { useEffect, useState } from 'react';
import { liveSocket, type LiveFrame } from '@/data/api/bzzoiroLive';
import { bzzoiroRequest } from '@/data/api/client';
import type { EventV2 } from '@/data/api/bzzoiroTypes';

type LiveState = {
  home_score?: number;
  away_score?: number;
  minute?: number;
  period?: string;
  momentum?: number;
  connected: boolean;
};

export function useLiveEvent(eventId?: number, wsTracked = false): LiveState {
  const [state, setState] = useState<LiveState>({ connected: false });

  useEffect(() => {
    if (!eventId) return;

    if (wsTracked) {
      const apply = (f: LiveFrame) =>
        setState((s) => ({
          ...s,
          home_score: f.home_score ?? s.home_score,
          away_score: f.away_score ?? s.away_score,
          minute: f.minute ?? s.minute,
          period: f.period ?? s.period,
          momentum: f.momentum ?? s.momentum,
          connected: true,
        }));
      const unsub = liveSocket.subscribe(eventId, apply);
      return () => {
        unsub();
        setState((s) => ({ ...s, connected: false }));
      };
    }

    // Polling fallback: /api/v2/events/{id}/ every 30s.
    let cancelled = false;
    const controller = new AbortController();
    const poll = async () => {
      try {
        const e = await bzzoiroRequest<EventV2>(
          `/api/v2/events/${eventId}/`,
          controller.signal,
          { ttlMs: 30_000, staleOk: true },
        );
        if (!cancelled)
          setState({
            home_score: e.home_score ?? undefined,
            away_score: e.away_score ?? undefined,
            minute: e.current_minute ?? undefined,
            period: e.period,
            connected: false,
          });
      } catch {
        /* keep last state */
      }
    };
    void poll();
    const t = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(t);
    };
  }, [eventId, wsTracked]);

  return state;
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/data/queries/useLiveEvent.ts
git commit -m "feat: add useLiveEvent hook with polling fallback"
```

---

### Task 12: Wire live updates into MatchPage

**Files:**
- Modify: `src/pages/MatchPage/` (the main match component — locate the score/clock render)

**Interfaces:**
- Consumes: `useLiveEvent` (Task 11).

- [ ] **Step 1: Inspect MatchPage to find the score/minute render site**

Run: `npx tsc -b` first to confirm clean baseline, then read the MatchPage component file(s) under `src/pages/MatchPage/`.

- [ ] **Step 2: Call the hook and override displayed score/minute when live**

In the match component, derive `eventId` from the match `id` (numeric for bzzoiro matches) and pass `live_websocket` as `wsTracked`:

```ts
import { useLiveEvent } from '@/data/queries/useLiveEvent';

// inside component, where `match` is available:
const eventId = Number(match.id);
const live = useLiveEvent(
  Number.isFinite(eventId) ? eventId : undefined,
  match.status === 'live',
);
const homeScore = live.home_score ?? match.home.score;
const awayScore = live.away_score ?? match.away.score;
const minute = live.minute ?? match.minute;
```

Use `homeScore`/`awayScore`/`minute` in the existing render in place of the static values. Show a "LIVE" badge when `match.status === 'live'`.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Run app, open a match page**

Run: `npm run dev`
Expected: match page renders; with no live match in window it shows scheduled state cleanly (no crash, no console errors from the hook).

- [ ] **Step 5: Commit**

```bash
git add src/pages/MatchPage/
git commit -m "feat: wire live WebSocket updates into match page"
```

---

### Task 13: README + final verification

**Files:**
- Modify: `README.md` (env/setup section)

- [ ] **Step 1: Document the bzzoiro env vars in README**

Add a short subsection under setup listing `VITE_BZZOIRO_API_URL`, `VITE_BZZOIRO_WS_URL`, `VITE_BZZOIRO_KEY` and the `/register/` link.

- [ ] **Step 2: Full build**

Run: `npm run build`
Expected: `tsc -b && vite build` exits 0.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document bzzoiro API setup"
```

---

## Self-Review

**Spec coverage:**
- Auth client → Task 3. Raw types → Task 2. Mappers → Task 4. Team id map → Task 5. Squads → Task 6+8. Source resolver → Task 7. Match hooks swap → Task 9. WebSocket → Task 10+11. MatchPage live → Task 12. Env → Task 1. README → Task 13. All spec sections covered.
- Deferred items (predictions/odds/H2H/POEM) correctly excluded.

**Placeholder scan:** No TBD/TODO; every code step shows full code; commands have expected output. Task 12 reads MatchPage at execution (component path not pre-known) — explicitly an inspect step, not a placeholder.

**Type consistency:** `SquadRowV2`/`EventV2`/`TeamV2`/`Paginated` defined in Task 2, consumed identically in 4/5/6/11. `bzzoiroRequest` signature `(path, signal, opts?)` consistent across 5/6/11. `activeSource` produced in 7, consumed in 8/9. `liveSocket.subscribe` / `LiveFrame` consistent 10→11. `Player`/`Match` field usage to be confirmed against `src/data/types` at Task 4 step 2.
