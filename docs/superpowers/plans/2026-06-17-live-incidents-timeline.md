# Live Incidents Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an always-visible **Incidents** tab to the match page showing a live vertical timeline (goals, cards, subs, VAR, penalties) that updates during a match and persists after it ends.

**Architecture:** A vertical slice mirroring the existing Momentum feature. New raw + mapped types, a `bzzoiro.incidents()` REST method, a `useIncidents` hook (TanStack Query REST poll + WebSocket-triggered refetch via the existing `liveSocket`), an `IncidentsTimeline` presentational component, and an `IncidentsTab` wrapper registered in the tab bar. WebSocket frames are only a *trigger* for early refetch — REST `/incidents/` is the source of truth.

**Tech Stack:** React 18 + TypeScript, Vite, TanStack Query (`@tanstack/react-query`), Tailwind CSS, framer-motion. No test runner (project ships untested — parity is intentional).

## Global Constraints

- No test framework — verification is `npm run build` + `npm run lint` + manual browser check. Do NOT add vitest/jest.
- bzzoiro auth/caching only via `bzzoiroRequest` from `src/data/api/client.ts` (injects `Authorization: Token …`). Never call `fetch` directly.
- Incidents are bzzoiro-only: a missing key (`hasBzzoiroKey()` false) or a non-numeric (openfootball) event id yields an empty timeline, never an error.
- WS push-frame shape is undocumented — coerce defensively; never read an incident payload from the frame. WS = early-refetch trigger only.
- Tailwind only, using existing color tokens (`text-text`, `text-text-dim`, `bg-gold`, `border-white/10`). Match `EventTimeline.tsx` visual language.
- Commit messages: plain conventional style, no Claude co-author / generated-with trailer (per project convention).
- Use the Bash tool (not PowerShell) for all commands.

---

### Task 1: Incident types + defensive mapper

**Files:**
- Modify: `src/data/api/bzzoiroTypes.ts` (append incident types)
- Create: `src/data/api/bzzoiroIncidents.ts` (raw→mapped mapper)

**Interfaces:**
- Consumes: nothing (leaf task).
- Produces:
  - Type `Incident = { id: string; minute: number; addedTime?: number; type: IncidentType; teamSide: 'home' | 'away'; player: string; detail?: string }`
  - Type `IncidentType = 'goal' | 'own-goal' | 'penalty' | 'penalty-miss' | 'yellow' | 'red' | 'sub' | 'var' | 'unknown'`
  - Type `IncidentsResponseV2 = { event_id?: number; incidents?: unknown[] }`
  - Function `mapIncidents(raw: IncidentsResponseV2, homeTeamId?: number): Incident[]`

- [ ] **Step 1: Append incident types to `bzzoiroTypes.ts`**

Append at the end of `src/data/api/bzzoiroTypes.ts`:

```ts
// Match incidents from GET /api/v2/events/{id}/incidents/. The per-incident
// shape is undocumented, so the raw array is `unknown[]` and coerced in
// bzzoiroIncidents.ts.
export type IncidentsResponseV2 = {
  event_id?: number;
  incidents?: unknown[];
};

export type IncidentType =
  | 'goal'
  | 'own-goal'
  | 'penalty'
  | 'penalty-miss'
  | 'yellow'
  | 'red'
  | 'sub'
  | 'var'
  | 'unknown';

// Normalised incident the UI renders. `teamSide` is resolved from the raw
// team id against the event's home team; defaults to 'home' when unknown.
export type Incident = {
  id: string;
  minute: number;
  addedTime?: number;
  type: IncidentType;
  teamSide: 'home' | 'away';
  player: string;
  detail?: string;
};
```

- [ ] **Step 2: Create the mapper `src/data/api/bzzoiroIncidents.ts`**

```ts
import type { Incident, IncidentType, IncidentsResponseV2 } from './bzzoiroTypes';

// Raw incident shape is undocumented; coerce every field defensively so a
// missing/mistyped value never crashes the timeline. Mirrors the LiveFrame
// coercion approach in bzzoiroLive.ts.
function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

// Map a wide range of API/source type strings onto our IncidentType union.
function mapType(raw: unknown): IncidentType {
  const t = (str(raw) ?? '').toLowerCase();
  if (t.includes('own')) return 'own-goal';
  if (t.includes('miss') || t.includes('penalty_miss') || t.includes('penalty-miss')) return 'penalty-miss';
  if (t.includes('pen')) return 'penalty';
  if (t === 'goal' || t.includes('goal')) return 'goal';
  if (t.includes('yellow')) return 'yellow';
  if (t.includes('red')) return 'red';
  if (t.includes('sub')) return 'sub';
  if (t.includes('var')) return 'var';
  return 'unknown';
}

function mapOne(raw: unknown, index: number, homeTeamId?: number): Incident | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const minute = num(r.minute ?? r.time ?? r.elapsed);
  if (minute === undefined) return null;

  const rawTeamId = num(r.team_id ?? r.team ?? r.participant_id);
  const teamSide: 'home' | 'away' =
    homeTeamId !== undefined && rawTeamId !== undefined && rawTeamId !== homeTeamId
      ? 'away'
      : homeTeamId !== undefined && rawTeamId === homeTeamId
        ? 'home'
        : str(r.side) === 'away'
          ? 'away'
          : 'home';

  const id =
    str(r.id) ??
    str(r.incident_id) ??
    `${minute}|${mapType(r.type ?? r.incident_type)}|${str(r.player ?? r.player_name) ?? ''}|${teamSide}`;

  return {
    id,
    minute,
    addedTime: num(r.added_time ?? r.injury_time ?? r.extra),
    type: mapType(r.type ?? r.incident_type ?? r.code),
    teamSide,
    player: str(r.player ?? r.player_name ?? r.name) ?? '',
    detail:
      str(r.detail) ??
      str(r.assist ?? r.assist_name) ??
      str(r.player_out ?? r.sub_out) ??
      str(r.reason),
  };
}

// Map the raw incidents payload to a sorted (newest-first) Incident[].
export function mapIncidents(raw: IncidentsResponseV2, homeTeamId?: number): Incident[] {
  const list = Array.isArray(raw.incidents) ? raw.incidents : [];
  const mapped = list
    .map((item, i) => mapOne(item, i, homeTeamId))
    .filter((x): x is Incident => x !== null);

  // De-dupe by id, then sort newest-first (minute desc, addedTime desc).
  const byId = new Map<string, Incident>();
  for (const inc of mapped) byId.set(inc.id, inc);
  return Array.from(byId.values()).sort((a, b) => {
    if (b.minute !== a.minute) return b.minute - a.minute;
    return (b.addedTime ?? 0) - (a.addedTime ?? 0);
  });
}
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: PASS, no type errors. `bzzoiroIncidents.ts` and the new types compile (they're not yet imported anywhere — that's fine).

- [ ] **Step 4: Commit**

```bash
git add src/data/api/bzzoiroTypes.ts src/data/api/bzzoiroIncidents.ts
git commit -m "feat: incident types + defensive incidents mapper"
```

---

### Task 2: `bzzoiro.incidents()` REST method

**Files:**
- Modify: `src/data/api/bzzoiro.ts` (add `incidents` fn + export)

**Interfaces:**
- Consumes: `mapIncidents` and types from Task 1; `bzzoiroRequest` from `client.ts`.
- Produces: `bzzoiro.incidents(eventId: number, homeTeamId: number | undefined, signal: AbortSignal): Promise<Incident[]>`

- [ ] **Step 1: Add imports**

In `src/data/api/bzzoiro.ts`, add to the type import block (the `import type { … } from './bzzoiroTypes'`) the names `IncidentsResponseV2` and `Incident`, and add a new import line after the existing `bzzoiroMap` import:

```ts
import { mapIncidents } from './bzzoiroIncidents';
```

Resulting type import block:

```ts
import type {
  Paginated,
  SquadRowV2,
  EventV2,
  EventStatsV2,
  MomentumPoint,
  PolymarketResponse,
  IncidentsResponseV2,
  Incident,
} from './bzzoiroTypes';
```

- [ ] **Step 2: Add the `incidents` function**

Add after the `momentum` function (around line 31):

```ts
async function incidents(
  eventId: number,
  homeTeamId: number | undefined,
  signal: AbortSignal,
): Promise<Incident[]> {
  const res = await bzzoiroRequest<IncidentsResponseV2>(
    `/api/v2/events/${eventId}/incidents/`,
    signal,
    { ttlMs: EVENTS_TTL, staleOk: true },
  );
  return mapIncidents(res, homeTeamId);
}
```

- [ ] **Step 3: Export it on the `bzzoiro` object**

In the `export const bzzoiro = { … }` block, add `incidents,` next to `momentum,`:

```ts
export const bzzoiro = {
  squad,
  liveMatches,
  momentum,
  incidents,
  polymarket,
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

- [ ] **Step 4: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/api/bzzoiro.ts
git commit -m "feat: bzzoiro.incidents REST method"
```

---

### Task 3: `useIncidents` hook (REST poll + WS-triggered refetch)

**Files:**
- Create: `src/data/queries/useIncidents.ts`

**Interfaces:**
- Consumes: `bzzoiro.incidents` (Task 2); `hasBzzoiroKey` from `client.ts`; `liveSocket`, `LiveFrame` from `bzzoiroLive.ts`; `Incident` type.
- Produces: `useIncidents(eventId?: number, homeTeamId?: number, isLive?: boolean, wsTracked?: boolean): { incidents: Incident[]; isLive: boolean; isLoading: boolean; isError: boolean }`

- [ ] **Step 1: Create the hook**

```ts
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bzzoiro } from '@/data/api/bzzoiro';
import { hasBzzoiroKey } from '@/data/api/client';
import { liveSocket, type LiveFrame } from '@/data/api/bzzoiroLive';
import type { Incident } from '@/data/api/bzzoiroTypes';

const TTL_MS = 30_000;

type Result = {
  incidents: Incident[];
  isLive: boolean;
  isLoading: boolean;
  isError: boolean;
};

// Live incidents timeline for a match. Fetches the REST list (cached, polled
// every 30s while live) and, when a WebSocket frame reports a changed
// score/minute, triggers an immediate refetch instead of waiting for the next
// poll. The WS frame is a trigger only — incidents always come from REST, the
// source of truth. Incidents are bzzoiro-only: a missing key or a non-numeric
// (openfootball) event id yields an empty list.
export function useIncidents(
  eventId?: number,
  homeTeamId?: number,
  isLive = false,
  wsTracked = false,
): Result {
  const enabled = hasBzzoiroKey() && typeof eventId === 'number' && Number.isFinite(eventId);
  const queryClient = useQueryClient();

  const q = useQuery<Incident[], Error>({
    queryKey: ['incidents', eventId],
    queryFn: ({ signal }) => bzzoiro.incidents(eventId!, homeTeamId, signal!),
    enabled,
    staleTime: TTL_MS,
    refetchInterval: enabled && isLive ? TTL_MS : false,
  });

  // Last score/minute seen over the WS, used to detect a change worth an
  // early refetch. Kept in a ref so it never triggers a re-render.
  const lastSeen = useRef<{ h?: number; a?: number; m?: number }>({});

  useEffect(() => {
    if (!enabled || !isLive || !wsTracked) return;
    const apply = (f: LiveFrame) => {
      const prev = lastSeen.current;
      const changed =
        (f.home_score !== undefined && f.home_score !== prev.h) ||
        (f.away_score !== undefined && f.away_score !== prev.a) ||
        (f.minute !== undefined && f.minute !== prev.m);
      lastSeen.current = {
        h: f.home_score ?? prev.h,
        a: f.away_score ?? prev.a,
        m: f.minute ?? prev.m,
      };
      if (changed) {
        void queryClient.invalidateQueries({ queryKey: ['incidents', eventId] });
      }
    };
    const unsub = liveSocket.subscribe(eventId!, apply);
    return () => unsub();
  }, [enabled, isLive, wsTracked, eventId, queryClient]);

  return {
    incidents: q.data ?? [],
    isLive,
    isLoading: q.isLoading,
    isError: q.isError,
  };
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: PASS. (Hook not yet consumed — fine.)

- [ ] **Step 3: Commit**

```bash
git add src/data/queries/useIncidents.ts
git commit -m "feat: useIncidents hook with WS-triggered refetch"
```

---

### Task 4: `IncidentsTimeline` presentational component

**Files:**
- Create: `src/pages/MatchPage/components/IncidentsTimeline.tsx`

**Interfaces:**
- Consumes: `Incident`, `IncidentType` (Task 1).
- Produces: `IncidentsTimeline({ incidents }: { incidents: Incident[] })` — vertical timeline; renders "No incidents yet." when empty.

- [ ] **Step 1: Create the component**

Mirrors `EventTimeline.tsx` visual language (left rail, dot marker, monospace minute, emoji icon). Home/away distinguished by dot color; minute shows `45+2'` when `addedTime` set.

```tsx
import type { Incident, IncidentType } from '@/data/api/bzzoiroTypes';

const ICON: Record<IncidentType, string> = {
  goal: '⚽',
  'own-goal': '⚽',
  penalty: '⚽',
  'penalty-miss': '❌',
  yellow: '🟨',
  red: '🟥',
  sub: '🔄',
  var: '📺',
  unknown: '⚪',
};

const HOME_DOT = '#FFD700';
const AWAY_DOT = '#3B82F6';

function label(minute: number, addedTime?: number): string {
  return addedTime ? `${minute}+${addedTime}'` : `${minute}'`;
}

export function IncidentsTimeline({ incidents }: { incidents: Incident[] }) {
  if (!incidents.length) {
    return <div className="text-text-dim text-sm">No incidents yet.</div>;
  }
  return (
    <ol className="relative pl-3 border-l border-white/10 space-y-2">
      {incidents.map((e) => (
        <li key={e.id} className="relative text-xs">
          <span
            className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full"
            style={{ background: e.teamSide === 'home' ? HOME_DOT : AWAY_DOT }}
          />
          <span className="font-mono text-text-dim mr-2">{label(e.minute, e.addedTime)}</span>
          <span className="mr-1">{ICON[e.type]}</span>
          {e.player && <span className="text-text">{e.player}</span>}
          {e.detail && <span className="text-text-dim"> · {e.detail}</span>}
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/MatchPage/components/IncidentsTimeline.tsx
git commit -m "feat: IncidentsTimeline component"
```

---

### Task 5: `IncidentsTab` wrapper with state gating

**Files:**
- Create: `src/pages/MatchPage/tabs/IncidentsTab.tsx`

**Interfaces:**
- Consumes: `useIncidents` (Task 3); `IncidentsTimeline` (Task 4); `Match` type.
- Produces: `IncidentsTab({ match }: { match: Match })`.

- [ ] **Step 1: Create the tab**

Gating mirrors `MomentumTab.tsx`. States: non-numeric id → source notice; loading → loading text; error → unavailable text; live → LIVE badge above timeline; otherwise (scheduled/finished) → timeline (empty state handled inside `IncidentsTimeline`).

```tsx
import { useIncidents } from '@/data/queries/useIncidents';
import { IncidentsTimeline } from '../components/IncidentsTimeline';
import type { Match } from '@/data/types';

export function IncidentsTab({ match }: { match: Match }) {
  const eventId = Number(match.id);
  const numeric = Number.isFinite(eventId);
  const isLive = match.status === 'live';

  const { incidents, isLoading, isError } = useIncidents(
    numeric ? eventId : undefined,
    undefined,
    isLive,
    match.liveWsTracked ?? false,
  );

  if (!numeric) {
    return (
      <div className="text-text-dim text-sm">Live incidents need the live data source.</div>
    );
  }
  if (isLoading) {
    return <div className="text-text-dim text-sm">Loading incidents…</div>;
  }
  if (isError) {
    return <div className="text-text-dim text-sm">Incidents are unavailable for this match.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em]">
        <span className="text-text-dim">Match timeline</span>
        {isLive && (
          <span className="flex items-center gap-1.5 text-text">
            <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse" />
            Live
          </span>
        )}
      </div>
      <IncidentsTimeline incidents={incidents} />
    </div>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/MatchPage/tabs/IncidentsTab.tsx
git commit -m "feat: IncidentsTab wrapper with state gating"
```

---

### Task 6: Register the Incidents tab

**Files:**
- Modify: `src/pages/MatchPage/MatchTabs.tsx` (add key + label)
- Modify: `src/pages/MatchPage/index.tsx` (import + conditional render)

**Interfaces:**
- Consumes: `IncidentsTab` (Task 5).
- Produces: nothing (terminal wiring).

- [ ] **Step 1: Add the tab key + label in `MatchTabs.tsx`**

Add `'incidents'` to the `MatchTabKey` union (after `'momentum'`):

```ts
export type MatchTabKey =
  | 'overview'
  | 'momentum'
  | 'incidents'
  | 'markets'
  | 'h2h'
  | 'form'
  | 'squad'
  | 'history';
```

Add the entry to `MATCH_TABS` (after the Momentum entry):

```ts
  { key: 'momentum', label: 'Momentum' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'markets', label: 'Markets' },
```

- [ ] **Step 2: Import `IncidentsTab` in `index.tsx`**

Add after the `MomentumTab` import (line 10):

```ts
import { IncidentsTab } from './tabs/IncidentsTab';
```

- [ ] **Step 3: Add the conditional render in `index.tsx`**

Add after the momentum render line (`{tab === 'momentum' && <MomentumTab match={match} />}`):

```tsx
            {tab === 'incidents' && <IncidentsTab match={match} />}
```

- [ ] **Step 4: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 5: Manual browser check**

Run: `npm run dev`
Then in the browser:
1. Open any match page → confirm an **Incidents** tab appears between Momentum and Markets.
2. Click it → for a finished/numeric match, the timeline renders (or "No incidents yet." if the API returns none).
3. Open a non-numeric (openfootball) match → tab shows "Live incidents need the live data source."
4. Reload on `#incidents` hash → the Incidents tab is active on load (hash routing works).

Expected: all four behave as described, no console errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/MatchPage/MatchTabs.tsx src/pages/MatchPage/index.tsx
git commit -m "feat: register live incidents timeline tab"
```

---

## Self-Review

**Spec coverage:**
- Always-visible tab, all states → Task 6 (registration) + Task 5 (gating for non-numeric/loading/error/live; scheduled & finished fall through to the timeline; empty handled in Task 4).
- REST poll + WS merge, WS = early-refetch trigger → Task 3.
- New types / defensive mapping → Task 1.
- REST method → Task 2.
- Timeline render extending EventTimeline language → Task 4.
- No tests (project parity) → Global Constraints; every task verifies via build/lint + the final manual check.

**Placeholder scan:** None — every code step is complete.

**Type consistency:** `Incident` / `IncidentType` / `IncidentsResponseV2` defined in Task 1 and used unchanged in Tasks 2–5. `mapIncidents(raw, homeTeamId)` signature matches its call in Task 2. `bzzoiro.incidents(eventId, homeTeamId, signal)` signature matches its call in Task 3. `useIncidents(eventId, homeTeamId, isLive, wsTracked)` signature matches its call in Task 5. `IncidentsTimeline({ incidents })` matches its use in Task 5.

**Note on `homeTeamId`:** `Match` carries `home.teamId` as a string, while incidents resolve side against a numeric bzzoiro team id. Task 5 passes `undefined` for `homeTeamId`, so `mapIncidents` falls back to the raw `side` field (then defaults to `'home'`). This is intentional and safe; wiring a numeric home team id is a future enhancement (depends on the event payload exposing `home_team_id`, which `EventV2` has but `Match` does not currently carry).
