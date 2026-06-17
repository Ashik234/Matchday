# Live Incidents Timeline — Design

**Date:** 2026-06-17
**Branch:** feat/bzzoiro-api-integration
**Feature ideas ref:** `docs/bzzoiro-feature-ideas.md` #7
**API ref:** `[[reference_bzzoiro_api]]`

## Goal

An always-visible **Incidents** tab on the match page showing a vertical timeline
of match events — goals, cards, subs, VAR, penalties — with minute + player.
Updates live during the match (REST poll + WebSocket-triggered refetch) and the
final timeline persists for finished matches. Present in every match state:
upcoming, live, finished.

## Decisions (locked)

- **Scope:** New always-visible `incidents` tab. Renders in all states (upcoming
  preview/empty, live auto-updating, finished static). Never hidden.
- **Live source:** REST poll + WS merge, mirroring the Momentum vertical slice.
  WebSocket frames are a *trigger* for early refetch; REST `/incidents/` is the
  source of truth. No guessing the undocumented WS incident-frame shape.
- **Tests:** None. Match current project parity (no test runner configured).

## Architecture

Mirrors the existing Momentum slice end-to-end:

```
bzzoiroTypes.ts        → IncidentV2 (raw)  + Incident (mapped)
bzzoiro.ts             → bzzoiro.incidents(eventId, signal)   [REST, 30s cache]
queries/useIncidents.ts→ REST useQuery + WS subscribe → merged Incident[]
components/IncidentsTimeline.tsx → vertical timeline render
tabs/IncidentsTab.tsx  → tab wrapper + state gating (like MomentumTab)
MatchTabs.tsx          → register 'incidents' key + label
MatchPage/index.tsx    → conditional render of IncidentsTab
```

### Reference files (existing patterns to copy)

- Hook pattern: `src/data/queries/useMomentum.ts`
- API method pattern: `src/data/api/bzzoiro.ts` (`momentum`)
- Client/auth/cache: `src/data/api/client.ts` (`bzzoiroRequest`, `requestCached`)
- WebSocket: `src/data/api/bzzoiroLive.ts` (`liveSocket.subscribe`, `LiveFrame`)
- Tab wrapper + gating: `src/pages/MatchPage/tabs/MomentumTab.tsx`
- Tab registration: `src/pages/MatchPage/components/MatchTabs.tsx`, `src/pages/MatchPage/index.tsx`
- Timeline visual language: `src/pages/MatchPage/components/EventTimeline.tsx`

## Data Flow

1. `useIncidents(eventId, isLive, wsTracked)`:
   - `useQuery({ queryKey: ['incidents', eventId], queryFn: () => bzzoiro.incidents(eventId, signal) })`
   - Enabled only when `eventId` is numeric (bzzoiro). Non-numeric → disabled.
   - `staleTime: 30_000`, `refetchInterval: isLive ? 30_000 : false`.
2. WebSocket subscribe via existing `liveSocket.subscribe(eventId, cb)`:
   - Track last-seen `home_score` / `away_score` / `minute`.
   - On any frame where one of those changed → `queryClient.invalidateQueries({ queryKey: ['incidents', eventId] })` for instant refetch.
   - WS = trigger only; REST = source of truth. Unsubscribe on unmount.
3. Merge / output:
   - Dedupe REST list by stable key `id` (fallback `minute|type|player|teamSide`).
   - Sort **newest-first** (minute desc, addedTime desc) for live feel.
   - Return `{ incidents: Incident[], isLoading, isError, isLive }`.

## Types

```ts
// raw, defensively coerced (shape undocumented)
type IncidentV2 = Record<string, unknown>;

type IncidentType =
  | 'goal' | 'own-goal' | 'penalty' | 'penalty-miss'
  | 'yellow' | 'red' | 'sub' | 'var' | 'unknown';

type Incident = {
  id: string;             // stable dedupe key
  minute: number;
  addedTime?: number;     // stoppage, e.g. 45+2
  type: IncidentType;
  teamSide: 'home' | 'away';
  player: string;
  detail?: string;        // assist name, sub-out player, card reason
};
```

Mapper `mapIncident(raw): Incident` coerces unknown fields defensively (same
approach as `LiveFrame` in `bzzoiroLive.ts`). Unrecognized event types → `'unknown'`
mapped to a neutral dot. Missing player → empty string handled in render.

## Component States (IncidentsTab gating)

- **Non-numeric eventId** (openfootball match): notice — "Live incidents not
  available for this match."
- **Upcoming** (pre-match status): empty state — "No incidents yet."
- **Live**: timeline + pulsing "LIVE" badge, auto-updating.
- **Finished**: full final timeline, static, persists.
- **Loading**: skeleton rows.
- **Error**: stale/cached shown if present, else error notice with retry.

## Rendering (IncidentsTimeline)

Extends `EventTimeline` visual language — Tailwind only, left border rail,
absolute dot markers, minute in monospace, emoji icon per type, player + detail.

- Icon map: ⚽ goal/own-goal/penalty · ❌ penalty-miss · 🟨 yellow · 🟥 red ·
  🔄 sub · 📺 var · ⚪ unknown.
- Home/away distinguished via team-color accent on the dot (`teamSide`).
- Minute display: `45+2'` when `addedTime` present, else `45'`.
- Newest incident at top.

## Error Handling

- Fetch errors → show stale cached data if present, else error notice.
- WS merge / refetch trigger wrapped so a malformed frame can't crash render.
- Dedupe by `id` prevents double entries when 30s poll and WS-triggered refetch
  overlap.

## Out of Scope

- Tests (project parity).
- Parsing a structured incident payload from the WS frame (undocumented; WS is
  trigger-only).
- Player deep-linking from incident rows (future, ties to feature #14).
