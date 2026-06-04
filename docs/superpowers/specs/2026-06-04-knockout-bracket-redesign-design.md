# Knockout Bracket Redesign — Design Spec

**Date:** 2026-06-04
**Branch:** `feat/matchday-impl`
**Author:** assistant

## Goal

Replace the current 4-column horizontally-scrolling bracket with a
fully connected, symmetric tournament tree (R16 → QF → SF → F) anchored
on a central FIFA World Cup trophy. Lines connect every match. Hovering
any team highlights its full progression path.

## Non-Goals

- R32 round (cut for symmetric layout).
- 3rd-place match (visually separate, not part of the tree).
- Confetti / trophy celebration animations.
- Tooltip popovers (path highlight communicates the same info).
- Federation tint accents inside the bracket (kept only on team page).
- Animated "winners advance" reveal sequence beyond mount-time draw-in.

## Constraints

- Drop-in replacement: `<RoadToFinal />` keeps the same import path
  and section position on `HomePage`.
- Data source unchanged: `useBracket()` (which already wraps
  `openfootball.bracket`).
- Free, no-API-key. No new dependencies. Framer Motion already in deps.
- Respect `useReducedMotion`.
- Tailwind v4 tokens only — no new colour tokens.

## Data flow

1. `useBracket()` → `BracketNode[]`.
2. Filter `round ∈ {R16, QF, SF, F}`.
3. Sort within each round by `matchId` (or `id`) ascending — purely
   deterministic, so the same payload always lays out the same way.
4. Split each round into left/right halves by index:
   - R16: 8 → left[0..3], right[4..7]
   - QF: 4 → left[0..1], right[2..3]
   - SF: 2 → left[0], right[1]
   - F: 1 → centre
5. Pairing rule for the next round: indices `(2k, 2k+1)` in the
   current round feed index `k` in the next, on each side.

## Architecture

`src/components/sections/RoadToFinal/` directory:

| File | Responsibility |
|---|---|
| `index.tsx` | Section shell. Reads `useBracket`. Owns `hoveredTeam` state. Branches desktop vs mobile via `useBreakpoint('md')`. |
| `BracketTree.tsx` | Desktop layout. Container ref + `useBracketLayout`. Renders cards + connectors + trophy. |
| `BracketWaterfall.tsx` | Mobile layout. Reuses the current snap-scrolling column pattern (rounds stacked top→bottom). |
| `TrophyCenter.tsx` | Inline SVG trophy + glow pulse. |
| `MatchCard.tsx` | Two-side card (home/away + scores if finished). Click side → `/team/:slug`. Hover card → set `hoveredTeam`. |
| `BracketConnector.tsx` | One SVG path between two parent cards and one child card. |
| `useBracketLayout.ts` | Computes card x/y positions from container size + visible round count. |
| `isPlaceholder.ts` | Shared placeholder detector (extracted from current `BracketColumn`). |

Files deleted:
- `src/components/sections/RoadToFinal.tsx`
- `src/components/sections/BracketColumn.tsx` (logic moves into
  `BracketWaterfall.tsx`).

`HomePage.tsx` import path is unchanged because the new directory has
an `index.tsx` and exports the same `RoadToFinal` named binding.

## Desktop layout

Fixed grid of 7 columns, computed at runtime from container width:

```
0: R16 L   1: QF L   2: SF L   3: F   4: SF R   5: QF R   6: R16 R
```

- Card size: 180 × 56 px.
- Column x positions evenly distributed across container width;
  `useBracketLayout` returns `{ x, y }` per node.
- Y positions: vertical spacing doubles per round. R16 spacing = `s`,
  QF = `2s`, SF = `4s`, F centred at `4s`.
- The Final card sits at column 3, centred vertically. The trophy
  sits directly above the Final card.

Container is `position: relative` with explicit `height` (computed
from the deepest R16 column). Cards are `position: absolute`.

### Connector rendering

Each `BracketConnector` takes two parent cards and one child card,
emits one SVG `<path>`:

```
src1(x,y) ───┐
             ├──── dest(x,y)
src2(x,y) ───┘
```

- Two horizontal stubs from each src out to a shared x mid-point.
- One vertical brace connecting the two stubs.
- One horizontal feed line from the brace mid-point to the destination.
- Corner radius 6 px (use SVG arc commands).
- `stroke: rgba(255,215,0,0.35)` neutral; `stroke: rgb(0,200,255)`
  (cyan) when on the hovered team's path.
- `strokeWidth: 1.5` neutral; `2` on hovered path.
- Mount animation: `stroke-dasharray = pathLength`,
  `stroke-dashoffset` animates from `pathLength` to `0` via Framer
  Motion. Stagger by round (R16→QF connectors first, then QF→SF, etc.).
  Reduced motion → no animation, lines render solid.

### Hover-path highlight

State in `RoadToFinal/index.tsx`:
`const [hoveredTeam, setHoveredTeam] = useState<string | null>(null)`.

Algorithm (pure helper `pathFor(team, allNodes): Set<string>`):

1. Find every node whose `home.teamId === team` or
   `away.teamId === team` — these card IDs are in the highlight set.
2. Pair-walk forward: for each R16 node containing the team, follow
   the `pair → next` mapping (derived from the sort/index pairing
   rule) to QF, then SF, then F. Add those node IDs too.
3. Return the set.

`MatchCard` accepts `isOnPath: boolean` and visually upgrades when on
the path (gold border + lift). `BracketConnector` accepts
`isOnPath: boolean` and switches stroke colour/width.

The lookup is by `teamId` (which in this codebase = team name string,
see `openfootball.bracket`).

## Mobile waterfall

Used below the `md` breakpoint (default `768 px`).

Stacked rounds top→bottom:

```
R16 (snap-scroll, 8 cards horizontal)
  ↓
QF  (snap-scroll, 4 cards horizontal)
  ↓
SF  (snap-scroll, 2 cards horizontal)
  ↓
F   (1 card, centred)
  ↓
Trophy
```

- Each round renders its sticky label at the top of its strip.
- Between rounds: a thin "8 → 4 → 2 → 1" indicator strip
  (`flex justify-around` with chevron icons).
- No SVG connectors. Vertical brace bars between strips suffice.
- Placeholder pills (W74, L11, etc.) keep the existing styling.

## Trophy centre

`TrophyCenter.tsx` renders an inline SVG cup icon:

- 96 × 96 svg, gold fill + radial highlight.
- Sits centred above the Final card on desktop, below the F-strip
  on mobile.
- Continuous glow pulse via `motion.div`:
  ```
  animate={{ filter: [
    'drop-shadow(0 0 6px rgba(255,215,0,0.4))',
    'drop-shadow(0 0 18px rgba(255,215,0,0.7))',
    'drop-shadow(0 0 6px rgba(255,215,0,0.4))',
  ]}}
  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
  ```
- Reduced motion → static `drop-shadow(0 0 10px rgba(255,215,0,0.5))`.

## Match card

```
┌──────────────────────┐
│ 🇧🇷 Brazil      2   │  ← winner row: gold left border, brighter bg
├──────────────────────┤
│ 🇰🇷 South Korea 1   │
└──────────────────────┘
```

- Glass: `bg-bg-elev1/40 backdrop-blur-md border border-white/10
  rounded-lg`.
- Winner row: `border-l-2 border-gold bg-bg-elev1/70`.
- Score rendered only when match `status === 'finished'`.
- Placeholder side (W74-style): gray pill, same logic as existing.
- Each side is wrapped in `<Link to={`/team/${toSlug(name)}`}>`
  when it isn't a placeholder.
- `onMouseEnter` on the card → `setHoveredTeam(homeOrAwayName)` for
  whichever side is non-placeholder. If both placeholders → no
  hover behaviour.
- `onMouseLeave` → `setHoveredTeam(null)`.

## Animations (mount)

1. Round 0 (R16) cards fade-in + slide 20 px inward (left half slides
   from `x: -20`, right half from `x: +20`), stagger 60 ms.
2. Connectors draw in waves: R16→QF first (300 ms), QF→SF (300 ms),
   SF→F (300 ms).
3. Trophy fade-in then glow pulse starts.
4. Total budget ≤ 1.5 s.
5. Reduced motion → all cards visible, connectors solid, trophy
   static.

## Accessibility

- Card containers are `<div role="group" aria-label="${homeName} vs
  ${awayName}">`.
- Each side that links to a team page uses the visible team name as
  link text (no icon-only links).
- Trophy SVG `aria-label="World Cup trophy"`.
- Mobile waterfall uses `<section aria-labelledby="round-r16">`-style
  semantics for each round strip.
- Reduced motion respected throughout.
- Focus-visible state on every card link inherits the existing gold
  outline.

## Loading & error states

- Skeleton: a single `Skeleton h-72` (existing pattern).
- If `useBracket()` returns empty after load → render a single text
  line: "Bracket will appear once knockout draws are confirmed."
- `FallbackBanner` already rendered by `RoadToFinal/index.tsx` via
  `useBracket().isFallback`.

## Test plan

- [ ] Desktop ≥768 px: trophy centred, 8 R16 cards on edges, F in
      middle, all connectors visible.
- [ ] Hover Brazil (or any R16 team): card + every downstream
      connector + every downstream node card glow cyan/gold.
- [ ] Mouse leave: highlight clears.
- [ ] Click a non-placeholder side: navigates to `/team/<slug>`.
- [ ] Click a placeholder side: nothing happens (no Link wrap).
- [ ] Mobile ≤640 px: waterfall stack, snap-scroll within rounds.
- [ ] Reduced motion: lines render solid, no draw-in, no trophy pulse.
- [ ] Empty payload: "Bracket will appear …" message, no errors.
- [ ] tsc + vite build clean.

## Out of scope (revisit later)

- R32 round
- 3rd place match
- Animated winners-advance sequence
- Federation tints inside the bracket
- Trophy click → final match modal
