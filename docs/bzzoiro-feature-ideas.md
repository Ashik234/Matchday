# Bzzoiro API — Feature Ideas

Catalog of features Matchday can build on the bzzoiro Sports API
(`https://sports.bzzoiro.com`), grounded in real endpoints from the OpenAPI
schema (`/api/schema/`). Auth: `Authorization: Token <VITE_BZZOIRO_KEY>`.

**Already shipped:** real WC squads, live WebSocket score/clock, live momentum
wave, lazy per-team id resolution with durable cache.

Effort key: **S** = ~½ day · **M** = 1–2 days · **L** = 3+ days.

---

## Match-page features

### 1. ML match prediction panel — **S**
- **Endpoint:** `GET /api/v2/events/{id}/prediction/` (or `/api/v2/predictions/`)
- **Data (verified):** CatBoost — `match_result {prob_home, prob_draw, prob_away, predicted}`, `expected_goals {home, away}`, `over_under {prob_over_15/25/35}`, `btts {prob_yes}`, `score {most_likely}`, `recommendations {favorite, bet_favorite, over_25, btts...}`.
- **UI:** win-probability bar (home/draw/away), xG dial, most-likely scoreline, "model pick" badge. Strong, ready data.

### 2. Pre-match & live odds — **M**
- **Endpoints:** `GET /api/v2/events/{id}/odds/`, `/odds/comparison/`, `/api/v2/odds/best/` (highest odds per outcome across bookmakers), `/api/v2/odds/` (bookmaker list).
- **UI:** 1X2 / over-under / BTTS odds table, best-price highlight per outcome, bookmaker comparison, odds-drift indicator (implied probability vs the ML prediction above).

### 3. Polymarket prediction-market prices — **S**
- **Endpoint:** `GET /api/v2/events/{id}/polymarket/`
- **Data:** implied prices from the Polymarket prediction market.
- **UI:** "what the market thinks" strip beside the ML prediction — crowd vs model side-by-side. Distinctive, few apps show this.

### 4. Shotmap — **M**
- **Source:** `GET /api/v2/events/{id}/stats/` → `shotmap` (same payload as momentum, already wired).
- **UI:** pitch SVG with shot dots sized by xG, colored by outcome (goal/on-target/off/blocked), home vs away ends. Reuse the SVG approach from MomentumWave.

### 5. Average positions / formation heat — **M**
- **Source:** `stats/` → `average_positions`.
- **UI:** pitch with each player's average position dot + jersey number → live formation shape. Pairs well with lineups (#6).

### 6. Lineups & formations — **M**
- **Endpoint:** `GET /api/v2/events/{id}/lineups/`
- **UI:** starting XI on a pitch by formation, bench list, captain marker. Predicted lineup pre-match (#13) → confirmed lineup at kickoff.

### 7. Live incidents timeline — **S/M**
- **Endpoint:** `GET /api/v2/events/{id}/incidents/`
- **UI:** vertical match timeline — goals, cards, subs, VAR — with minute + player. Updates live alongside the WebSocket score. (Project already has an EventTimeline component to extend.)

### 8. Per-player match stats — **M**
- **Endpoint:** `GET /api/v2/events/{id}/player-stats/`
- **UI:** sortable per-player table (touches, passes, shots, xG, rating). Tap a player → drill to their profile (#10).

### 9. AI match preview + fun facts — **S**
- **Endpoint:** `GET /api/v2/events/{id}/metadata/` → `ai_preview` (markdown, generated for kickoffs within 24h), `funfacts`, `jerseys`.
- **UI:** AI-written preview card above the match, fun-fact chips, kit thumbnails. `ai_preview` is null until generated — handle gracefully.

### 10. Match highlights & social — **S**
- **Endpoints:** `GET /api/v2/events/{id}/social/`, `highlights` field on the event.
- **UI:** post-match highlight video links + embedded tweets. Empty for upcoming/live matches.

### 11. xG race chart — **S**
- **Source:** `stats/` → `xg_per_minute`.
- **UI:** cumulative xG line per team over the 90 minutes — classic "who deserved it" chart. Same SVG toolkit as momentum.

### 12. Where to watch (broadcasts) — **S**
- **Endpoints:** `GET /api/v2/events/{id}/broadcasts/`, `/api/v2/tv-channels/`.
- **UI:** per-country TV/stream channel list with logos on the match page.

### 13. Predicted lineup (pre-match) — **S**
- **Endpoint:** `GET /api/predicted-lineup/{event_id}/`
- **UI:** projected starting XI before lineups are confirmed; swap to confirmed (#6) at kickoff.

---

## Team & player features

### 14. Rich player profile — **M**
- **Endpoints:** `GET /api/v2/players/{id}/` + `/career/` (totals by season), `/transfers/` (history, newest first), `/national-team/`, `/stats/`, `/social/`.
- **UI:** player page — career timeline, transfer history, national-team caps/goals, social feed. Squad cards (already real) link here.
- **Note:** squad rows carry `player_id` (nullable) — use it to deep-link.

### 15. Manager / coach profiles — **M**
- **Endpoints:** `GET /api/v2/managers/{id}/`, `/career/` (tenure per club with record), `/matches/`, `/social/`.
- **UI:** coach card on team page → tenure history, win record.

### 16. Referee profiles — **S**
- **Endpoints:** `GET /api/v2/referees/`, `/{id}/matches/`.
- **UI:** referee on the match page → cards-per-game, matches officiated. Niche but easy.

### 17. Team fixtures & form — **S**
- **Endpoints:** `GET /api/v2/teams/{id}/fixtures/`, `/squad/`, `/social/`.
- **UI:** upcoming/past fixtures and a form strip on the team page (the project has FormStrip already).

### 18. Venues / stadiums — **S**
- **Endpoints:** `GET /api/v2/venues/`, `/{id}/`, `/{id}/competitions/`, league venues.
- **UI:** richer stadium pages — capacity, location, matches hosted. Upgrades the current openfootball stadium data.

### 19. Head-to-head deep dive — **S**
- **Endpoint:** `GET /api/v2/events/{id}/h2h/` (also embedded in the event payload).
- **UI:** expand the existing H2H tab — full meeting history, aggregate goals, win rates, recent results.

---

## Cross-cutting / scoreboard features

### 20. Live scores hub — **M**
- **Endpoint:** `GET /api/v2/events/live/` (Redis-cached 30s, built for polling) + WebSocket for tracked matches.
- **UI:** a "today / live now" board across all live matches, each row WS-subscribed for real-time score. Landing-page centerpiece.

### 21. Tipster tips & wisdom-of-market — **M**
- **Endpoints:** `GET /tipsters/api/tips/`, `/slips/`, `/wom/`.
- **UI:** community/expert tips and consensus per match — a "tips" tab.

### 22. Multi-sport expansion — **L**
- **Endpoints:** `/basketball/`, `/tennis/`, `/hockey/`, `/csgo/`, `/darts/`, `/horseracing/` — each mirrors the football v2 shape (events, players, predictions, live).
- **Scope:** large; only if Matchday broadens beyond football.

---

## Recommended build order

1. **ML prediction panel** (#1) — highest value, smallest effort, data confirmed.
2. **Odds + Polymarket** (#2, #3) — pairs with predictions: model vs market.
3. **Shotmap + xG race** (#4, #11) — reuse the momentum SVG toolkit, same `stats/` call.
4. **Incidents timeline + lineups** (#7, #6) — completes a live match center.
5. **Player profiles** (#14) — deepens the squad work already shipped.

Each is independent and can be its own brainstorm → spec → plan → implement cycle.
See [[reference_bzzoiro_api]] for endpoint/auth details.
