# Bzzoiro Sports API Integration — Design

**Date:** 2026-06-17
**Branch:** `feat/bzzoiro-api-integration`
**Status:** Approved design, pending implementation plan

## Goal

Integrate the Bzzoiro Sports Data API (`https://sports.bzzoiro.com`) as the primary
live football data source for Matchday, replacing/enriching the current static
openfootball JSON. Two user-facing wins this pass:

1. **Real World Cup 2026 squads** — replace placeholder squad data with real
   announced call-ups (jersey, position, club, caps, goals, age).
2. **Live WebSocket match center** — real-time score, clock, momentum, ball-movement
   for tracked matches, with REST polling fallback.

openfootball remains as a fallback source. Fixtures mode (`VITE_USE_FIXTURES`) unchanged.

## API Facts (verified live with provided token)

- **Auth:** header `Authorization: Token <key>`. Free registration at `/register/`.
- **OpenAPI schema (public):** `https://sports.bzzoiro.com/api/schema/`
- **Token is client-exposed** via `VITE_*` env (ships in browser bundle). Acceptable
  for a read-only free-tier key; flagged as a known trade-off.
- **Squads:** `/api/v2/worldcup/squads/` — 1452 rows confirmed live. Params:
  `team` (int id), `group` (A–L), `status` (official|preliminary|projected|dropped),
  `has_player`, `limit` (max 200), `offset`. Each row: `team_id`, `name`,
  `jersey_number`, `position` (GK/DF/MF/FW), `status`, `club`, `club_country`,
  `caps`, `goals`, `date_of_birth`, `age`, `player_id` (nullable).
- **Teams:** `/api/v2/teams/?name=Argentina` resolves national teams by exact name.
  Returns `{id, name, short_name, country, venue_id}`. No FIFA code field.
  (e.g. Argentina=489, Algeria=490). `search` param is ignored; use `name`.
- **Events:** `/api/v2/events/` (64k+), `/api/v2/events/{id}/`, `/api/v2/events/live/`
  (Redis-cached 30s TTL, designed for high-freq polling). Rich fields: scores,
  xG, momentum, weather, attendance, H2H (embedded), `live_websocket` (bool),
  `websocket_plus` (bool), highlights.
- **Live WebSocket:** `/ws/live/` — after connect send
  `{"action":"subscribe","event_id":<id>}`. Only events with `live_websocket:true`
  push. Premium pitch-level tracking at `/ws/poem/{event_id}/` (out of scope).
- **Leagues:** `/api/v2/leagues/` returned empty result set with the provided key
  (no WC league discoverable via league filters). WC data is accessed via the
  dedicated `/api/v2/worldcup/squads/` endpoint and via national-team lookups by name.

## Architecture

### Data layer ([src/data/api/](../../../src/data/api/))

**`client.ts` changes:**
- Add `'bzzoiro'` to the `ApiSource` union.
- Add `bzzoiroRequest<T>(path, init, opts)`: prepends `VITE_BZZOIRO_API_URL`,
  injects `Authorization: Token <VITE_BZZOIRO_KEY>` header, delegates to the
  existing `requestCached` for SWR/TTL caching. 401/403 → non-retryable `ApiError`.

**`bzzoiro.ts` (new adapter):** mirrors the `openfootball` adapter's method
signatures so hooks can swap source with minimal change. Methods:
`allMatches`, `todayMatches`, `upcomingMatches`, `liveMatches`, `groups`,
`bracket`, `finalMatch`, `teams`, `stadiums`, and new `squad(teamCode)`.
Maps `EventV2 → Match`, `TeamV2 → Team`, `SquadRowV2 → Player`.

**Source selection:** a `dataSource` resolver picks the active adapter:
`VITE_USE_FIXTURES=true` → fixtures; else bzzoiro if `VITE_BZZOIRO_KEY` present;
else openfootball. Hooks call the resolved adapter. Preserves fallback safety.

### Team id ↔ FIFA code mapping

bzzoiro teams expose no FIFA code. Build a `name → fifa_code` map from the
openfootball teams payload (already loaded), and `name → team_id` from bzzoiro
team-by-name lookups. Cache both. Squad rows carry `team_id` directly, so squad
fetches need only the reverse `teamCode → team_id` lookup.

### Squads ([src/data/queries/useSquad.ts](../../../src/data/queries/useSquad.ts))

- `bzzoiro.squad(teamCode)`: reverse-map teamCode → team_id, fetch
  `/api/v2/worldcup/squads/?team=<id>&status=official&limit=200`.
- `SquadRowV2 → Player`:
  - `id` = `${teamCode}-${jersey_number}` (keeps player-image join key format)
  - `teamCode` from id map; `jersey` ← `jersey_number`; `name`, `position`,
    `club`, `age`, `caps`, `goals` map directly.
- `useSquad` swaps `squadsApi.all` for the resolved adapter. The `usePlayerImages`
  SVG-motif join is **unchanged** — real player photos are NOT scraped (per prior
  decision: SVG-for-all with per-player motifs).

### Live WebSocket ([src/data/api/bzzoiroLive.ts](../../../src/data/api/bzzoiroLive.ts) — new)

`LiveSocket` class:
- Single shared connection, ref-counted subscriptions (many components → one socket).
- `subscribe(eventId, cb)` → sends subscribe frame, registers callback, returns
  an unsubscribe function.
- Reconnect with exponential backoff (1s → 30s cap); re-send all active
  subscriptions on reopen.
- Heartbeat / idle-timeout detection; tear down and reconnect dead sockets.
- Auth: probe query-param token (`?token=`) vs first-frame auth on a live match;
  default to query-param token.

`useLiveEvent(eventId)` hook:
- Subscribes on mount, unsubscribes on unmount.
- Returns `{ score, minute, period, momentum, lastEvent, connected }`.
- **Polling fallback:** if the event is not WS-tracked or the socket is down,
  poll `/api/v2/events/{id}/` every 30s (matches Redis TTL). UI is agnostic to path.
- WS frames normalize and merge into the TanStack Query cache via
  `queryClient.setQueryData`, so live and REST share one source of truth.

### UI wiring

- **MatchPage:** live badge, ticking clock, momentum bar fed by `useLiveEvent`.
  Degrades cleanly to scheduled state when no live match is in window.
- **TeamPage:** real squad list from bzzoiro (jersey/position/club/caps/goals/age).

## Environment

`.env.example` (committed) + `.env` (gitignored, holds the real key):

```
VITE_BZZOIRO_API_URL=https://sports.bzzoiro.com
VITE_BZZOIRO_WS_URL=wss://sports.bzzoiro.com
VITE_BZZOIRO_KEY=<token>   # .env only
```

The existing `BSD=<token>` line in `.env` will be renamed to `VITE_BZZOIRO_KEY`
(Vite only exposes `VITE_`-prefixed vars to the client).

## Error Handling

- 401/403 → non-retryable `ApiError`; data layer falls back to openfootball.
- 429 / 5xx → retryable (existing behavior).
- WS disconnect → backoff reconnect; meanwhile REST polling covers the gap.
- Unknown/empty WC league data → squads via dedicated endpoint (already handled).

## Testing

- Adapter mapping unit tests: `SquadRowV2 → Player`, `EventV2 → Match`,
  `TeamV2 → Team` with real captured fixtures.
- `LiveSocket`: reconnect/backoff and ref-count subscribe/unsubscribe (mock WS).
- `useLiveEvent`: WS-path vs polling-fallback selection.
- Live integration verified manually against a tracked match when one is in window.

## Known Unknowns (resolved at build time)

1. **WS auth mechanism** (query param vs frame) — probe on a live match; default
   to `?token=` query param.
2. **WS push frame shape** — not defined in the OpenAPI schema. Build a defensive
   normalizer; log raw frames first to confirm shape.
3. No live match is currently in window (WC events are `notstarted`), so live
   paths are built against the documented protocol and verified later.

## Out of Scope (this pass)

- ML predictions (`/api/v2/predictions/`) — confirmed working, deferred.
- Odds + H2H widgets — H2H embedded in events, deferred.
- POEM pitch-level tracking (`/ws/poem/`) — premium.
- Other sports (basketball, tennis, etc.) — football only.
- Full removal of openfootball — kept as fallback.
