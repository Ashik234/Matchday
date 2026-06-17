# Lazy Team-Id Resolution + Durable Cache — Design

**Date:** 2026-06-17
**Branch:** `feat/bzzoiro-api-integration`
**Status:** Approved

## Problem

`src/data/api/teamIdMap.ts` `resolveTeamId()` builds the entire WC team id map on
the first call: one `/api/v2/teams/?name=<team>` request **per team** (48 teams),
all fired at once via `Promise.all`. Consequences:

- Opening a single team page triggers ~48 parallel bzzoiro API calls.
- The map is held in an in-memory variable only, so a page reload rebuilds it —
  another 48-call burst.
- Requests use `staleOk: true`, so even a cached id triggers a background
  revalidation request.

## Goal

Resolve only the team that is actually needed (when its page/squad opens), and
cache the resolved id durably so no further API call is made for it.

## Design

Rewrite `teamIdMap.ts`:

1. **Per-team lazy resolve.** `resolveTeamId(teamCode, signal)` resolves ONLY the
   requested team: look up its full name from the (already-cached, static)
   openfootball teams list, then fetch `/api/v2/teams/?name=<name>&limit=1` for
   that one team. No iteration over all teams, no `Promise.all` burst.

2. **In-flight de-dupe.** A `Map<string, Promise<number | undefined>>` keyed by
   teamCode ensures concurrent calls for the same team share a single request.

3. **Durable cache, no revalidation.** The bzzoiro lookup uses the existing
   `bzzoiroRequest` storage cache with a long TTL (30 days — team ids are
   stable) and `staleOk: false`, so a cached id is returned without any
   background refetch. The in-flight map plus the storage cache mean a resolved
   id costs zero API calls on subsequent reads or reloads.

4. **teamCode → name mapping.** Built lazily from `openfootball.teams()` (static
   public JSON, already cached 6h SWR — not the bzzoiro API). Cached in-module
   after first use.

## Data flow (after)

- Open Argentina team page → `useSquad('ARG')` (already `enabled`-gated, lazy) →
  `bzzoiro.squad('ARG')` → `resolveTeamId('ARG')`:
  - 1 bzzoiro call to resolve ARG → 489 (cached 30d)
  - 1 bzzoiro call for the squad (cached per existing 7d TTL)
- Revisit / reload Argentina → 0 bzzoiro calls (both cached).
- Open Brazil → 2 calls for Brazil only. Un-opened teams → 0 calls.

## Interfaces

- `resolveTeamId(teamCode: string, signal: AbortSignal): Promise<number | undefined>`
  — signature unchanged; only the implementation changes. Existing callers
  (`bzzoiro.squad`) need no edits.

## Error handling

- Team name not found in openfootball list → resolve to `undefined` (squad
  returns `[]`, as today).
- bzzoiro lookup error → `undefined`; not cached, so a later attempt can retry.

## Testing

- Manual: open one team page with the Network panel open; confirm exactly one
  `teams/?name=` request and one squad request, and zero `teams/?name=` requests
  for other teams.
- Reload the same team; confirm zero new `teams/?name=` requests.
- `npm run build` passes.

## Out of scope

- Momentum visualization (separate spec, paused).
- Changing the squad endpoint or caching TTLs already in place.
