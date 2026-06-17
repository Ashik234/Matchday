# Live Momentum Visualization — Design

**Date:** 2026-06-17
**Branch:** `feat/bzzoiro-api-integration`
**Status:** Approved

## Goal

Show a live, diverging "momentum wave" on the match page: minute-by-minute
pressure swinging between the two teams, fed by the REST momentum curve and
extended in real time from the live WebSocket while a match is in play.

## API facts (verified live)

- `GET /api/v2/events/{id}/stats/` returns
  `{ event_id, stats, shotmap, momentum, average_positions, xg_per_minute }`.
- `momentum` is an array `[{ m: number, v: number }]` — `m` = minute, `v` =
  signed pressure (positive = home dominance, negative = away). Verified on
  finished event 8306 (Argentina v Algeria): `[{m:1,v:5},...,{m:9,v:40},...,{m:13,v:-3},...]`.
- The momentum field is populated for live/finished matches. The `?full=true`
  flag on the event detail endpoint did NOT return momentum in testing; the
  `/stats/` endpoint is the reliable source.
- Live WebSocket frames already carry a single `momentum?: number`
  (captured in `useLiveEvent`).

## Architecture

### Data layer

**`bzzoiroTypes.ts`** — add:
```ts
export type MomentumPoint = { m: number; v: number };
export type EventStatsV2 = {
  event_id: number;
  momentum: MomentumPoint[] | null;
};
```

**`bzzoiro.ts`** — add adapter method:
```ts
async function momentum(eventId: number, signal: AbortSignal): Promise<MomentumPoint[]>
```
Fetches `/api/v2/events/{id}/stats/`, returns `res.momentum ?? []`. TTL 30s
(`staleOk: true`) — short so a live curve stays fresh; cached so revisits don't
refetch within the window.

**`useMomentum.ts`** (new hook):
- TanStack Query `['momentum', eventId]` → `activeSource`-routed momentum fetch.
  Only enabled when `eventId` is a finite number.
- When the match is live, also subscribe via `useLiveEvent(eventId, wsTracked)`
  and append each incoming `{ m: live.minute, v: live.momentum }` to the curve,
  de-duped by minute (a later frame for the same minute overwrites the earlier).
- Returns `{ points: MomentumPoint[], isLive: boolean, isLoading, isError }`.

### Component

**`MomentumWave.tsx`** (pure SVG, no chart library):
- Props: `{ points: MomentumPoint[]; homeColor?: string; awayColor?: string; isLive?: boolean }`.
- Single `<svg viewBox>` full width. X = minute (domain 0 → max(90, last minute)),
  Y = pressure, horizontal center line = neutral.
- Two filled `<path>`s built from a smoothed (monotone) line through the points:
  area above center filled `homeColor` where `v > 0`, below center `awayColor`
  where `v < 0`.
- Normalize `v` to the Y range by the max absolute value in the set, clamped so a
  single spike doesn't flatten the rest.
- Axis: half-time line at m=45; minute ticks at 15/30/45/60/75/90.
- When `isLive`: a pulsing dot at the latest point.
- Empty state (`points` empty): "Momentum available once the match kicks off."
- Colors default to gold (home) / blue (away) if team colors not supplied.

### Placement

**`MomentumTab.tsx`** (new) in `src/pages/MatchPage/tabs/`, registered in
`MatchTabs.tsx` alongside the existing tabs. Content:
- `useMomentum(Number(match.id))` → `<MomentumWave points isLive homeColor awayColor />`.
- A small legend: home color ↑ / away color ↓ and the current pressure value.
- Non-numeric `match.id` (openfootball-sourced match) → empty state
  "Live momentum needs the live data source."

## Data flow

Open match page, switch to Momentum tab → `useMomentum` fetches the REST curve
once (cached 30s). If the match is live, WS momentum frames append to the curve
in real time. No momentum call for matches whose tab is never opened.

## Error handling

- Stats fetch error → empty curve + empty state; no crash.
- No momentum array (not-started match) → empty state.
- Non-numeric event id → empty state, no fetch.

## Testing

- Manual: open a finished match's Momentum tab (e.g. event 8306), confirm the
  wave renders from real data and that exactly one `/stats/` request fires.
- Confirm switching away and back does not refetch within the TTL window.
- `npm run build` passes; lint clean for new files.

## Out of scope

- shotmap, average_positions, xg_per_minute (available in the same payload,
  deferred).
- Wiring momentum into MatchHero (kept to its own tab per design).
