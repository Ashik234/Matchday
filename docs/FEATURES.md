# Matchday — Feature Roadmap

Suggestions for next-wave features. Ordered by impact / effort. Each entry: **what**, **why**, **data source**, **scope**.

Current shipped surface:
- Home (countdown, today matches, featured teams, groups, road to final, progress)
- `/team/:slug` (squad, flag, stats)
- `/match/:slug` (overview, H2H, form, squad compare, history)

---

## P0 — High value, low/med effort

### 1. Player Jersey Image Pipeline (HD)
**What:** Scrape + cache HD international jersey images per player + per team kit (home/away/third). Show on player cards, squad lists, match lineups, team page.

**Why:** Differentiator. Squads currently feel flat — just names. Jersey art = identity, color, drama. Powers future lineup viz, kit-clash detection, jersey number badges.

**Sources (free, no API key):**
- **Wikidata SPARQL** — `P18` (image) on player items; `P527` (has part) on national team kit items. Returns Commons file names → resolve to `https://commons.wikimedia.org/wiki/Special:FilePath/<filename>?width=600`.
- **Wikimedia Commons category scrape** — categories like `Category:Football_kits_of_<country>_national_football_team` give kit SVGs.
- **Footballkitarchive.com** — has HD kit PNGs but ToS-fuzzy; treat as last resort.

**Scope:**
- `scripts/scrape-player-jerseys.mjs` — batches Wikidata SPARQL per squad, downloads images, resizes to 600px wide WebP, writes `public/images/jerseys/<countryCode>-<playerSlug>.webp` + manifest `public/data/jerseys.json`.
- New type `JerseyAsset { playerId, url, width, height, source }`.
- `useJersey(playerId)` hook + `<PlayerJersey>` component (fallback to numbered jersey SVG generated from team kit colors).
- Lazy-load + `loading="lazy"` + responsive `srcset`.

**Risks:** Many players lack Wikidata images. Need fallback: generate SVG jersey using `flagColors` + player number.

---

### 2. Live Match Center (real-time scores)
**What:** During tournament window, poll a live score feed. Show ticking time, score updates, goal flash animations on home + match page.

**Why:** This is the killing feature for a WC site. Static fixtures are commodity.

**Sources:**
- **api-football.com** free tier — 100 req/day, enough for 64 WC matches polled every 60s during live windows.
- Fallback: Wikipedia infobox scrape on a 5min loop (lower fidelity).

**Scope:**
- `src/data/api/live.ts` — TanStack Query w/ `refetchInterval: 60_000` only when match status === 'live'.
- Goal-event toast + confetti via existing `framer-motion` setup.
- Push live data into `MatchHero` so countdown swaps to live clock + score.

---

### 3. Bracket Predictor / Pick-Em
**What:** User clicks through brackets, predicts each KO match winner. Persist to localStorage. Share via URL (encode picks in base64 query param).

**Why:** Engagement multiplier. Recurring visits. Social loop via shared URLs.

**Scope:**
- `src/pages/PredictorPage` route `/predict`.
- Reuse existing `RoadToFinal` bracket viz; make each match a `<button>` toggling pick.
- `src/data/predictions.ts` — localStorage adapter.
- "Your bracket vs actual" diff view post-match.

**No backend needed.** Pure client state + URL encoding.

---

### 4. Stadium Pages `/stadium/:slug`
**What:** Each WC 2026 host stadium gets a page: photos, capacity, city, fixtures hosted, weather forecast for match day, transit notes.

**Why:** 16 host cities across 3 countries. Travel-planning audience exists. Strong SEO long-tail.

**Sources:**
- Wikipedia stadium pages (already have URL refs in your stadium data).
- `open-meteo.com` free weather API by lat/lon (no key) for forecast on match dates within 16-day window.
- Wikidata for stadium images.

**Scope:**
- Reuse existing `Stadium` type. New route + page component.
- Stadium card on `MatchPage` overview clicks through here.

---

## P1 — Med value, med effort

### 5. Player Profile Pages `/player/:slug`
**What:** Player career timeline, club history, WC appearance log, photo, jersey (from #1 above), bio.

**Sources:**
- Wikipedia infobox + first paragraph.
- jfjelstul `players.csv` + `player_appearances.csv` for historical WC stats.

**Scope:**
- Scrape script + `useplayer(slug)` hook.
- Link from squad lists already in place.

---

### 6. Multi-Match Day View `/day/:date`
**What:** A "matchday" page — all fixtures on a given day with synced kickoff times, tab-switch between concurrent matches.

**Why:** WC group stage has 4 matches/day, often concurrent. Users want one page to follow them all.

**Scope:**
- Route + composite view embedding mini `MatchCard`s in time-sorted columns.
- "Now playing" sticky bar at top showing simultaneously-live games.

---

### 7. Group Stage Simulator
**What:** "What if Mexico beats Argentina?" Click any group-stage fixture, set result, recompute standings + KO bracket.

**Why:** WC subreddit content goldmine. Highly shareable.

**Scope:**
- Group standings algo already exists. Wire it to mutable overrides in Zustand or React Context.
- "Reset to actual" button.
- Share state via URL param.

---

### 8. Search & Command Palette
**What:** Cmd+K opens spotlight: search teams, players, matches, stadiums. Type "BRA" → Brazil. Type "Saturday" → Saturday's matches.

**Scope:**
- `cmdk` library (lightweight).
- Index built at build time from squads + fixtures + stadiums.
- Fuzzy match via `fuse.js`.

---

### 9. Comparison Mode `/compare?a=BRA&b=ARG`
**What:** Side-by-side two teams: FIFA rank, squad value, avg age, WC titles, H2H summary, road overlap.

**Scope:**
- Reuse `SquadColumn` + `H2HSummary` components.
- Selector UI at top with searchable dropdowns.

---

## P2 — Polish / lower priority

### 10. PWA + Offline Mode
**What:** Service worker caches today's matches, squads, group standings. App opens offline showing last known state.

**Scope:** `vite-plugin-pwa`. Manifest already needed for iOS install banner.

### 11. Match Calendar Subscription (.ics)
**What:** Download `.ics` for any team's full fixture list → adds to Google/Apple Calendar. Per-team `/team/:slug/calendar.ics`.

**Scope:** Build-time generation of `.ics` files into `public/calendars/`. Static.

### 12. Theme: Team Mode
**What:** Pick "your team" in nav. Site re-skins primary accent to that team's flag colors, header shows next fixture countdown for them.

**Scope:** Persist team pick in localStorage. CSS custom properties driven by `flagColors`.

### 13. Historical "On This Day"
**What:** Banner on home page: "On this day in 1986, Maradona scored the Hand of God." Pulls from existing `match-history.json` filtered by today's MM-DD.

**Scope:** Single component + a curated highlights overlay file `public/data/iconic-moments.json`.

### 14. Audio: Anthem Player
**What:** On `/team/:slug`, tiny play button → plays 30s of national anthem.

**Sources:** Wikimedia Commons hosts most anthems as OGG.

**Scope:** Scrape Commons category, drop in `public/audio/anthems/`. `<audio>` element.

### 15. 3D Trophy Easter Egg Customization
**What:** Trophy currently exists. Add: spin via mouse, swap base plinth color to your favorite team's flag colors, share screenshot.

**Scope:** Extends existing `@react-three/fiber` setup.

---

## Quick wins (< 1 day each)

- **Share buttons** on match page (Twitter / WhatsApp / copy-link with OG image)
- **OG image generator** — `og-image.tsx` route returning PNG per match via `satori` (deferred til SSR)
- **Last-5 form sparkline** on team carousel cards (data already in `useMatchProfile`)
- **Kickoff timezone toggle** — show local stadium time vs user's local time
- **"Add to home screen"** iOS banner
- **404 page with random WC photo + "lost in the tunnel" copy**
- **Sitemap.xml + robots.txt** — generate at build time from teams + matches

---

## Tech debt to address before scaling

- Migrate `public/data/*.json` to chunked files — `match-history.json` is 1.16MB, blocks first paint on slow connections. Split per-decade.
- Add `vite-plugin-imagemin` for flag CDN fallback compression.
- Extract `useMatchProfile` aggregation logic to a worker — currently blocks main thread when joining 964-match history.
- Wire `@tanstack/query-devtools` only in dev (already loaded in prod bundle — check).

---

## Suggested next sprint (1 week)

1. **Player Jersey Pipeline** (#1) — 2 days. Highest visual payoff.
2. **Stadium Pages** (#4) — 1.5 days. Strong SEO.
3. **Live Match Center skeleton** (#2) — 1.5 days. Wire api-football, even if not turned on yet.
4. **Quick wins:** form sparkline + share buttons + timezone toggle — 1 day.
