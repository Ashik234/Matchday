# Matchday — UI / UX Plan

**Date:** 2026-06-03

---

## Experience Thesis

The football is the narrator. The user does not navigate — they are guided. The ball introduces the tournament, drops onto today, then leads the eye through 7 chapters of the World Cup story.

Every chapter answers one of the user's mental questions:

| Chapter | User's question |
| --- | --- |
| Hero | "What is happening today?" |
| Today's Matches | "What can I watch right now?" |
| Tournament Progress | "Where are we in the tournament?" |
| Group Standings | "Who is winning their group?" |
| Featured Teams | "What about the team I follow?" |
| Live Match Center | "What's the score right now?" |
| Road to the Final | "Who plays who next?" |
| Final Countdown | "When is the moment?" |

---

## Page Architecture (single page `/`)

```
┌───────────────────────────────────────────────┐
│  PitchNavbar (literal pitch, 140px desktop)    │  ← ball intro lives here
├───────────────────────────────────────────────┤
│  Hero (3-col grid)                             │
│  ┌─────────┬─────────┬─────────┐               │
│  │ Stadium │ TODAY   │ Upcoming│               │
│  │ + audio │ matches │  ×2     │               │
│  └─────────┴─────────┴─────────┘               │
├───────────────────────────────────────────────┤
│  Section 1 — Today's Matches (full grid)       │  ← ball waypoint
├───────────────────────────────────────────────┤
│  Section 2 — Tournament Progress               │  ← ball waypoint
├───────────────────────────────────────────────┤
│  Section 3 — Group Standings                   │  ← ball waypoint
├───────────────────────────────────────────────┤
│  Section 4 — Featured Teams                    │  ← ball waypoint
├───────────────────────────────────────────────┤
│  Section 5 — Live Match Center                 │  ← ball waypoint
├───────────────────────────────────────────────┤
│  Section 6 — Road to the Final (bracket)       │  ← ball waypoint
├───────────────────────────────────────────────┤
│  Section 7 — Final Countdown                   │  ← ball parks here
├───────────────────────────────────────────────┤
│  Footer (credits, API sources)                 │
└───────────────────────────────────────────────┘
```

---

## Navbar (PitchNavbar)

Literal top edge of football pitch viewed from above. Approved Option A.

- **Height:** 140px desktop, 88px mobile.
- **Surface:** dark-toned grass gradient (`#0D2818 → #1F5A1F`), mowed-stripe texture (subtle repeating linear-gradient), penalty arc + spot center.
- **White sideline:** 3px, runs full width, this is the ball's roll path.
- **Logo:** `FIFA 2⚽26` top-left. Football replaces the `0`. Anton, white, letter-spacing 1px.
- **Links:** HOME / MATCHES / TEAMS / STADIUMS / BRACKET top-right. Inter 600, uppercase, 13px, opacity 85%. Active link gets gold underline.
- **Ball path:** along the sideline at bottom of navbar. Ball is the Three.js mesh from `<GlobalCanvas>` — DOM ball anchor is `<span data-ball-anchor="logo">`.
- **Mobile:** static gold dot inside logo (no ball roll). Hamburger menu replaces inline links.

---

## Hero Layout (3-column, CSS Grid)

Desktop columns: `1.1fr | 1.4fr | 1fr`. Mobile stacks: Center → Left → Right.

### Left column — Cinematic Stadium

- Stadium bowl rendered with CSS gradients (deep navy sky → bowl arc → green pitch foreground).
- Floodlight wash animates (4s loop, low amplitude).
- Overlay copy:
  - Eyebrow: `FIFA WORLD CUP 2026` (gold, Inter 700, letter-spacing 3px, 10px).
  - Headline: `Experience the journey to the Final.` (Anton, white, 32px desktop / 24px mobile).
- Audio player docks bottom-left of column.

**Audio player** — premium Spotify-mini-player feel.

- Album-art tile (anthem cover image) 56×56, rounded 8.
- Track label "Official Tournament Anthem" (Inter 600, 13px).
- Subtitle "FIFA 2026" (Inter 500, 11px, dim).
- Controls: Play/Pause (primary), Mute/Unmute (secondary).
- Progress bar (gold fill, 2px height).
- Initially muted + paused. Anthem file lazy-loaded on first interaction.
- Zustand state: `audio.muted`, `audio.playing`, `audio.progress`.

### Center column — Today's Matches Command Center

- Pre-impact state: empty card surface, faint date stamp watermark, soft pulse glow at expected impact point.
- Impact (after ball drop): card flashes white 80ms → ripple ring expands → contents stagger-reveal from impact point outward.
- Card contents post-reveal:
  - Date header: full date in Anton (e.g. `WED · JUN 3 · 2026`), gold.
  - Stat strip: `4 matches today · 2 live now · 6 upcoming`.
  - Featured match (largest tile): two flags, team names, stage label, kickoff time, "WATCH LIVE" CTA.
  - Quick list of remaining matches (compact rows).
- Always visible even on no-data — fixture fallback never leaves empty.

### Right column — Upcoming Match Center

- Stack of two upcoming match cards. Broadcast-graphic style.
- Card contents:
  - Both team flags + names (Anton uppercase).
  - Match stage label (`GROUP A`, `ROUND OF 16`, etc.) — eyebrow gold.
  - Stadium name + city.
  - Kickoff: localized time.
  - Live countdown `HH:MM:SS` ticker (JetBrains Mono, gold, 18px).
- Hover: tile elevates, gold glow shadow.

---

## Section Layouts

### Section 1 — Today's Matches (full)

- Same data source as hero center but full-width grid.
- 3-up grid desktop, 1-up mobile.
- Each card: teams, kickoff, stadium, group, status pill (LIVE / SCHEDULED / FINAL).
- Filter chips at top: ALL / LIVE / UPCOMING.

### Section 2 — Tournament Progress

- 4 stat tiles side-by-side desktop, 2×2 mobile:
  - Current Stage (e.g. "GROUP STAGE")
  - Matches Played (e.g. "32 / 104")
  - Matches Remaining
  - Days Until Final
- Radial progress ring center, large — fills from 0 → current% on viewport enter.

### Section 3 — Group Standings

- Grid of group cards. 2026 format: 48 teams → **12 groups (A–L)** of 4. (Adapter must normalize provider groupings to this; if provider returns 8 groups for legacy 32-team, fixture data overrides for MVP.)
- 3 columns desktop, 1 mobile.
- Each group card: group letter eyebrow, 4-row standings table (Team / P / W / D / L / GD / Pts).
- Top-2 rows have gold left-border (qualification zone).

### Section 4 — Featured Teams

- Horizontal scroll-snap carousel, large team tiles.
- Tile: flag, country name, federation, FIFA rank, "Next match" preview, follow CTA (visual only).
- Hover desktop: tile expands + stat panel slides up (form last 5, top scorer, key player).

### Section 5 — Live Match Center

- Empty state if nothing live: large illustration + "No live matches right now. Next kickoff in HH:MM."
- Live state: split layout:
  - Left: hero match — flags, big score (Anton 96px), pulsing live dot, minute counter.
  - Right: event timeline (goals, cards, subs) scrolling. New events animate in from bottom.
  - Bottom: stat bars (possession, shots, shots on target, corners) — gold fills.

### Section 6 — Road to the Final

- Interactive bracket: R32 → R16 → QF → SF → F.
- Pan/zoom (horizontal scroll desktop, pinch mobile).
- Bracket lines draw left → right on viewport enter, 1.2s stagger.
- Click match → modal stub (full impl deferred).

### Section 7 — Final Countdown

- Huge `DD : HH : MM : SS` countdown to Final.
- JetBrains Mono, gold, 8rem desktop, 4rem mobile.
- Every minute change → gold flash on changed digit.
- Backdrop: stadium silhouette + slow particle drift.
- Ball parks on top of the countdown clock at end of scroll journey.

---

## Footer

- 3 rows minimal:
  - Brand: `MATCHDAY` (Anton) + tagline "Unofficial FIFA World Cup 2026 companion."
  - API credits: "Data: World Cup 2026 API · API-Football · BallDontLie".
  - Legal: "Not affiliated with FIFA. © 2026."

---

## States

- **Loading:** skeleton screens per card (shimmer, pitch-green tint).
- **Error (recoverable):** fixture fallback + subtle banner top of section: `Showing sample data — live feed unavailable. Retry.`
- **Empty (e.g. no live matches):** illustrated empty state with next-best CTA.
- **Offline:** static cache from previous successful loads (MVP: just rely on browser cache; full SW deferred).

---

## Microcopy Tone

- Active, present-tense.
- Reverent of the tournament but not gushing.
- Examples:
  - "Experience the journey to the Final."
  - "Today, the road continues."
  - "Live now — pitch heating up."
  - "32 matches played. 72 to go."

---

## Accessibility

- All interactive elements keyboard reachable, visible focus (2px gold ring).
- Color contrast: body text ≥ 7:1 on bg.
- Live score updates: `aria-live="polite"`.
- Audio controls: ARIA labels, `aria-pressed` for mute toggle.
- Reduced motion: skips ball intro, removes section stagger, disables idle loops. Countdown still ticks.
- All flags have `aria-label` country name.
- Skip-to-content link at top.
