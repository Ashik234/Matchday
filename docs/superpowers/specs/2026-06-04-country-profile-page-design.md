# Country Profile Page — Design Spec

**Date:** 2026-06-04
**Branch:** `feat/matchday-impl`
**Author:** assistant (Matchday team)

## Goal

Dedicated, premium per-country page reachable from any team card on the
landing page. Six tabs (Overview, Squad, Statistics, Matches, Tournament
Journey, Star Players). Animated, glassmorphic, football-themed. Real
data only — no fabricated metrics.

## Non-Goals

- Possession %, xG, passing accuracy, shots on target, tackles won —
  no available free source.
- Player photos — Wikipedia thumbnail quality + bandwidth too uneven
  for v1.
- Heat-map visualisations — no source.
- Per-player career highlights pulled at scrape time — hand-curated
  only for the starred players.
- Replacing the existing landing page layout. The new page is a route
  in addition to `/`.

## Constraints

- Free, no-API-key data sources. Match data already comes from
  `openfootball/worldcup.json`. Squad data comes from a one-time
  Wikipedia scrape (`scripts/scrape-squads.mjs`) producing
  `public/data/squads.json` — mirrors the existing FIFA-ranking
  scraper pattern (commit `caf083b`).
- Reuse existing primitives: `Flag`, `MatchCard`, `Pill`, `Card`,
  `Skeleton`, `Countdown`. Reuse existing hooks: `useTeams`,
  `useAllMatches`, `useGroups`, `useBracket`, `useFifaRanking`.
- Respect `useReducedMotion`. No new heavy libs — Framer Motion is
  already in dependencies. No Three.js.

## Routing

- New route: `/team/:slug`.
- `slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')`.
- Helper: `src/utils/slug.ts` with `toSlug(name)` and a lookup helper
  `findTeamBySlug(teams, slug)`.
- Team cards on the landing page (`FeaturedTeams`, group standings,
  bracket nodes) wrap their content in `<Link to={`/team/${toSlug(name)}`}>`.
- 404: if no team matches the slug after teams load, render a centred
  "Team not found" card with a button back to `/`.

## File Structure

```
src/
├── pages/TeamPage/
│   ├── index.tsx
│   ├── TeamHero.tsx
│   ├── TeamTabs.tsx
│   ├── tabs/
│   │   ├── OverviewTab.tsx
│   │   ├── SquadTab.tsx
│   │   ├── StatsTab.tsx
│   │   ├── MatchesTab.tsx
│   │   ├── JourneyTab.tsx
│   │   └── StarPlayersTab.tsx
│   ├── components/
│   │   ├── FlagWave.tsx
│   │   ├── StatCard.tsx
│   │   ├── RecentForm.tsx
│   │   ├── PlayerCard.tsx
│   │   ├── StatBar.tsx
│   │   ├── CircleProgress.tsx
│   │   └── MatchTimeline.tsx
│   └── data/
│       ├── starPlayers.ts       # countryCode → string[] of player IDs
│       └── achievements.ts      # countryCode → string[] of bullet lines
├── data/
│   ├── api/squads.ts            # adapter for /data/squads.json
│   ├── queries/useSquad.ts
│   ├── queries/useTeamProfile.ts
│   └── types/player.ts
├── scripts/scrape-squads.mjs
├── public/data/squads.json
└── utils/slug.ts
```

## Data shapes

### `src/data/types/player.ts`

```ts
export type Position = 'GK' | 'DF' | 'MF' | 'FW';

export type Player = {
  id: string;        // `${teamCode}-${jersey}`, e.g. `BRA-10`
  teamCode: string;  // FIFA 3-letter code
  jersey: number;
  name: string;
  position: Position;
  club: string;
  age?: number;
  caps?: number;
  goals?: number;    // career international goals
};
```

### `public/data/squads.json`

```json
{
  "scrapedAt": "2026-06-04",
  "teams": {
    "BRA": { "teamCode": "BRA", "players": [ /* Player[] */ ] },
    "ARG": { "teamCode": "ARG", "players": [ /* ... */ ] }
  }
}
```

## Scraper — `scripts/scrape-squads.mjs`

Source: `https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads`.

Behaviour:

1. Puppeteer launches headless, navigates to source.
2. For each team subsection (h3 with team name): find the squad table
   directly below.
3. Read rows. Wikipedia columns are stable: `No.`, `Pos.`, `Player`,
   `Date of birth (age)`, `Caps`, `Goals`, `Club`.
4. Convert position abbreviation (`1GK`, `2DF`, `3MF`, `4FW`) to the
   `Position` enum.
5. Compute age from DOB if present (Wikipedia renders the parenthetical
   age but we recompute to keep it fresh).
6. Map team name → FIFA code via the openfootball teams payload
   (already cached during dev) — re-use `nameToIso` + a name→code map.
7. Output to `public/data/squads.json` with the shape above.
8. Add `"scrape:squads": "node scripts/scrape-squads.mjs"` to
   `package.json` scripts.
9. Add the output path to `.gitignore`? No — commit the JSON so the
   site works without re-running the scraper, identical to the
   FIFA-ranking pattern.

Error handling:

- If a team subsection has no table (e.g. squad not yet announced),
  the team key is still written with `players: []`.
- Network failure → script exits non-zero, leaves any prior JSON in
  place.

## Data layer additions

### `src/data/api/squads.ts`

```ts
export type SquadsPayload = {
  scrapedAt: string;
  teams: Record<string, { teamCode: string; players: Player[] }>;
};

export const squadsApi = {
  all: async (_: void, signal: AbortSignal): Promise<SquadsPayload> => {
    const res = await fetch('/data/squads.json', { signal });
    if (!res.ok) throw new Error(`squads.json: ${res.status}`);
    return res.json();
  },
};
```

### `src/data/queries/useSquad.ts`

```ts
export function useSquad(teamCode?: string) {
  const q = useQuery({
    queryKey: ['squads'],
    queryFn: ({ signal }) => squadsApi.all(undefined, signal!),
    staleTime: 7 * 24 * 60 * 60 * 1000,
  });
  const players = teamCode ? q.data?.teams[teamCode]?.players ?? [] : [];
  return { ...q, players };
}
```

### `src/data/queries/useTeamProfile.ts`

Composite hook. Given a slug, returns `{ team, matches, group,
bracketNodes, squad, isLoading, error }`. Internally calls `useTeams`,
`useAllMatches`, `useGroups`, `useBracket`, `useSquad`. Filters matches
to those where the team is home or away. Identifies the team's group
standing.

## Hero section — `TeamHero.tsx`

Layout (desktop, ≥768 px): two-column grid.

- **Left column:** `FlagWave` component — large flag (220 × 140) with
  subtle CSS keyframe animation that skews the X axis ±2° on a 4 s loop
  plus a translucent gradient overlay that shifts horizontally.
  Reduced-motion → no animation.
- **Right column:**
  - Federation chip (coloured per confederation, see palette below).
  - Team name in `font-display`, `text-5xl md:text-hero`.
  - "FIFA World Cup 2026" badge pill in gold.
  - "FIFA Rank #N" line with big number, small label.
  - "Group X" chip.

Below the columns, a 5-card stat grid (responsive: 2 cols mobile, 5
cols desktop). Each card uses `StatCard`:

- Matches Played
- Wins
- Goals Scored
- Clean Sheets
- Group Position (e.g. "1st of 4")

`StatCard` props: `{ label, value, icon? }`. On viewport enter, Framer
Motion animates `value` from 0 to the target over 800 ms via a
keyframe array.

Background: same blue stadium gradient used in `StadiumBackdrop`
(blue tokens after the recent theme swap) plus an animated radial
floodlight at the top centre that pulses slowly.

### Federation palette

| Code     | Colour       |
|----------|--------------|
| UEFA     | `#3B82F6`    |
| CONMEBOL | `#FBBF24`    |
| AFC      | `#10B981`    |
| CAF      | `#F97316`    |
| CONCACAF | `#A855F7`    |
| OFC      | `#06B6D4`    |

Chip = filled background at 20 % opacity + 1 px border at 60 % + text
at full.

## Tabs — `TeamTabs.tsx`

- Six buttons. Sticky position below the hero on scroll
  (`top-[var(--navbar-height,140)]`).
- Active button has a 2 px gold underline. Underline is shared across
  buttons with `<motion.div layoutId="team-tab-underline" />`.
- Tab content is rendered inside `<AnimatePresence mode="wait">` with
  a fade + 8 px slide. 200 ms duration.
- State: a single `activeTab` prop driven by the URL hash
  (`#overview`, `#squad`, …) so deep-links work. Default `overview`.

## Tabs — content

### Overview

- Programmatic summary paragraph:
  "{name} represent {federation} at the FIFA World Cup 2026. They sit
  at FIFA rank #{rank}, placed in Group {group}."
- Qualification: derived from finished matches in qualification rounds
  if present; otherwise the literal "Qualified via {federation}
  qualifiers".
- Tournament performance: `StatBar` rows for GF, GA, GD; `W/D/L` count.
- Recent form: last 5 finished matches as coloured pills
  (green W, gold D, red L) with opponent flag underneath each pill.
- Key achievements: `achievements.ts` lookup, displays as a bulleted
  list. If no entry, hide the section entirely (no empty header).

### Squad

- Grid: 1 col mobile, 2 col sm, 3 col md, 4 col lg.
- `PlayerCard` shows: jersey number (big, top-right), position chip
  (top-left), name, club, age, intl goals.
- Search input above grid filters by `name` or `club`
  (case-insensitive substring).
- Position chips above grid: `All | GK | DF | MF | FW` — active chip
  filters the grid.
- Hover (desktop only, `hover:` Tailwind variants): card scales
  `1.02`, reveals a `caps` row below the visible stats.
- Empty squad → "Squad not yet scraped. Run `pnpm scrape:squads`."
  with a small how-to-rebuild hint.

### Statistics

- Top row: four `CircleProgress` indicators —
  - Win %
  - Draw %
  - Loss %
  - Clean Sheet %
- Below: two `StatBar` charts — Goals scored per match (last 10) and
  Goals conceded per match (last 10).
- Bottom: comparison strip — team's avg goals per match vs group avg
  (two bars side by side, gold vs grey).

### Matches

- "Last 5" timeline: horizontal line, 5 nodes spaced evenly.
  Each node = opponent flag + score. Click expands a detail
  card below with stage, group letter, kickoff time, stadium city.
- "Upcoming" horizontal scroll carousel (drag-scrollable, same
  affordance as `FeaturedTeams`). Each item is a reused `MatchCard`
  variant.
- Empty states: "No previous matches" / "No upcoming fixtures".

### Tournament Journey

- Vertical timeline. Rows: Group Stage, R32 (if applicable), R16,
  QF, SF, Final.
- Each row coloured by status: green (won/qualified), red (eliminated
  here), grey (not yet played).
- Group Stage row shows GF–GA aggregate over the three matches.
- Knockout rows show "vs {opponent}: {score} ({outcome})".
- Animated path on first paint: SVG `stroke-dashoffset` animation
  from top to current stage (skipped when reduced-motion).

### Star Players

- Pull `starPlayers.ts[teamCode]` (1–3 player IDs).
- For each, render a large card:
  - Left: silhouette placeholder (gold gradient + jersey-number watermark).
  - Right: name, position, club, age, jersey, intl goals.
  - One curated highlight line from `achievements.ts` per starred
    player (e.g. for Brazil/Vinicius Jr: "UEFA Champions League winner
    2024"). Optional — if absent, omit.
- No heat map, no strength rating.

## Loading & error states

- Hero, tab nav, and active tab each render a skeleton block while
  `useTeamProfile().isLoading` is true.
- Per-tab "no data" messages are textual, not error banners.
- If squads JSON 404s (file missing), the Squad tab shows the
  scraper-hint message and other tabs still work.
- If the slug doesn't match any team after teams load, render the
  "Team not found" card with a back-home button.

## Accessibility

- All buttons have aria-labels where icon-only.
- Tabs use `role="tablist"` / `role="tab"` / `aria-selected`. Content
  panels use `role="tabpanel"` with matching `id`.
- The flag image is `aria-label`'d to the team name.
- Reduced motion: disables flag wave, count-up, layoutId underline
  movement (instant), `AnimatePresence` fade duration → 0.
- Focus ring (existing `:focus-visible` gold outline) inherited.

## Visual style

- Glassmorphism: `backdrop-blur-md bg-bg-elev1/40 border border-white/8`.
- Section spacing: `py-12 md:py-16`.
- Stat cards: rounded-2xl, padding 5/6, gold accent border on the
  top-most stat row only (visual hierarchy hint).
- Floodlight effect: a 600 × 200 radial gradient at the top centre
  of the hero (`bg-gradient-radial` via inline style) with a slow
  `motion.div` opacity pulse 0.4 → 0.6 over 6 s, paused under
  reduced motion.

## Test plan

- [ ] `/team/brazil` loads, shows Brazil hero, all 6 tabs.
- [ ] Click a team on the landing page → navigates to the right slug.
- [ ] Unknown slug `/team/xyz` → renders "Team not found" + back link.
- [ ] Run `pnpm scrape:squads` → produces a `public/data/squads.json`
      with at least the 32 teams that had squads on Wikipedia at run
      time. Page refreshes, Squad tab populates.
- [ ] Reduced motion: flag is still, no count-up, tab swap is instant.
- [ ] Mobile (≤640 px): hero stacks, stat grid is 2 cols, tabs
      horizontal-scroll, all interactions work.
- [ ] Lighthouse a11y ≥ 95 on the new route.

## Out of scope (revisit later)

- Live possession / passing / xG (needs paid API).
- Live shot maps.
- Player photos.
- Multi-language.
- Per-player career highlights from Wikipedia at scrape time.
