# Polymarket Prediction-Market Prices (1X2) — Design

**Date:** 2026-06-17
**Branch:** `feat/bzzoiro-api-integration`
**Status:** Approved

## Goal

Show Polymarket prediction-market prices for the match-result (1X2) market on a
new "Markets" tab of the match page: home / draw / away as implied probability
(%) and decimal odds. A "what the market thinks" view, distinct from bookmaker
odds and (future) ML predictions.

## API facts (verified live, event 7366 Cruzeiro v Internacional)

- `GET /api/v2/events/{id}/polymarket/` — cached 1 min.
- Success shape:
  ```json
  { "event_id": 7366, "polymarket_event_id": "350115",
    "home_team": "...", "away_team": "...", "event_date": "...",
    "markets": { "1x2": { "home": 0.0005, "draw": 0.0005, "away": 0.9995 },
                 "btts": {...}, "over_under": {...}, "halftime": {...}, "handicap": {...} },
    "goalscorers": null, "exact_scores": null, "updated_at": "..." }
  ```
- Prices are implied probabilities in 0–1. `%` = price × 100; decimal odds = 1 / price.
- No market: `{ "detail": "No Polymarket markets available for this event." }`
  (no `markets` key). Common — most events lack a Polymarket market.
- `halftime` values are often null pre-match. `1x2` is the headline market.

## Scope

This pass: **1X2 only**, shown as both implied probability % and decimal odds.
BTTS / over-under / handicap deferred. Model-vs-market comparison deferred until
the ML prediction panel exists.

## Architecture

### Data layer

**`bzzoiroTypes.ts`** — add:
```ts
export type PolymarketMarket1x2 = {
  home: number | null;
  draw: number | null;
  away: number | null;
};
export type PolymarketResponse = {
  event_id?: number;
  polymarket_event_id?: string;
  markets?: { '1x2'?: PolymarketMarket1x2 };
  updated_at?: string;
  detail?: string; // present when no market available
};
```

**`bzzoiro.ts`** — add:
```ts
export type Market1x2 = { home: number | null; draw: number | null; away: number | null; updatedAt?: string };
async function polymarket(eventId: number, signal: AbortSignal): Promise<Market1x2 | null>
```
Fetches the endpoint; returns `null` when there is no `markets['1x2']` (covers
the `detail` empty case). TTL 60s, `staleOk: true`.

**`useMarkets.ts`** (new hook): TanStack Query `['polymarket', eventId]`, enabled
only when a bzzoiro key is present and `eventId` is a finite number. Returns
`{ data: Market1x2 | null | undefined, isLoading, isError }`.

### Component

**`MarketBar.tsx`** — a three-segment horizontal bar:
- Segments home (gold) / draw (grey) / away (blue); each segment width = implied
  probability (raw price; not re-normalized — prediction markets carry overround).
- Each labeled: team/outcome name, `%` (price × 100, 1 decimal), and `@ odds`
  (1 / price, 2 decimals). Null price → show `—` and zero-width segment.
- Footer: "Polymarket · updated <relative time>".
- Props: `{ market: Market1x2; homeName: string; awayName: string }`.

### Tab

- Add `'markets'` to `MatchTabKey` and `MATCH_TABS` (label "Markets"), placed
  after "Momentum".
- `MarketsTab.tsx`: `useMarkets(Number(match.id))` → `<MarketBar>`.
  - Non-numeric `match.id` → "Prediction-market prices need the live data source."
  - `data === null` (no market) → "No prediction-market prices for this match."
  - Loading / error → short status text.
- Render in `MatchPage/index.tsx` panel switch.

## Data flow

Open match → Markets tab → one `/polymarket/` fetch (cached 60s). No fetch for
matches whose tab is never opened. No fetch for non-numeric (openfootball) ids.

## Error handling

- `detail` present / no `1x2` → `null` → empty state.
- Network/HTTP error → `isError` → "Prices unavailable" text. No crash.
- Null individual prices → `—`, segment omitted.

## Testing

- Manual: open a match with a Polymarket market (event 7366) on the Markets tab,
  confirm three segments with % and odds and that exactly one `/polymarket/`
  request fires.
- Open a match without a market → empty state, no crash.
- `npm run build` passes; lint clean for new files.

## Out of scope

- BTTS, over/under, handicap, halftime, goalscorers, exact scores markets.
- Bookmaker odds (`/odds/`), ML predictions (`/prediction/`), model-vs-market compare.
