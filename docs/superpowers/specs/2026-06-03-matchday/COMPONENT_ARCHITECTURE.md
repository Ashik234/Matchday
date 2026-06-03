# Matchday — Component Architecture

**Date:** 2026-06-03

---

## Folder Layout

```
src/
  app/
    App.tsx
    providers.tsx              # QueryClientProvider, Router, ErrorBoundary
    routes.tsx                 # Single route '/' mounted MVP

  three/
    GlobalCanvas.tsx           # R3F <Canvas>, fixed, full-viewport, pointer-events: none
    Ball.tsx                   # PBR football mesh
    Lights.tsx                 # ambient + directional + spot
    ScrollPath.tsx             # Catmull-Rom curve from waypoints (dev: visible)
    useBallController.ts       # subscribes scroll progress + stage → position/rotation
    useAnchorRect.ts           # DOM rect → world-space coords helper
    MotionGate.tsx             # gates canvas based on breakpoint + reduced-motion

  components/
    navbar/
      PitchNavbar.tsx
      Logo.tsx                 # FIFA 2⚽26 with data-ball-anchor="logo"
      NavLinks.tsx
      MobileMenu.tsx

    hero/
      HeroGrid.tsx
      HeroLeft.tsx
      StadiumBackdrop.tsx      # CSS bowl + floodlights
      AudioPlayer.tsx
      HeroCenter.tsx
      TodayMatchesCard.tsx     # data-ball-anchor="date-card"
      HeroRight.tsx
      UpcomingMatchCard.tsx

    sections/
      TodayMatchesSection.tsx
      TournamentProgress.tsx
      GroupStandings.tsx
      GroupCard.tsx
      FeaturedTeams.tsx
      TeamCarouselCard.tsx
      LiveMatchCenter.tsx
      EventTimeline.tsx
      StatBars.tsx
      RoadToFinal.tsx
      BracketMatch.tsx
      FinalCountdown.tsx

    ui/
      Button.tsx
      Card.tsx
      MatchCard.tsx            # variant: hero | upcoming | live | bracket | today
      Flag.tsx                 # countryCode → SVG sprite
      Countdown.tsx            # to: Date, format: 'DD:HH:MM:SS' | 'HH:MM:SS'
      LiveDot.tsx
      StatTile.tsx
      TeamRow.tsx
      Skeleton.tsx
      FallbackBanner.tsx
      Footer.tsx
      SkipToContent.tsx

  data/
    api/
      client.ts                # base fetch wrapper, ApiError class
      wc2026.ts
      apiFootball.ts
      ballDontLie.ts
    queries/
      useTodayMatches.ts
      useUpcomingMatches.ts
      useLiveMatch.ts
      useTournamentProgress.ts
      useGroupStandings.ts
      useFeaturedTeams.ts
      useTeamStats.ts
      useH2H.ts
      useBracket.ts
      useFinalMatch.ts
    fixtures/
      today-matches.json
      upcoming-matches.json
      groups.json
      live-sample.json
      teams.json
      bracket.json
      final-match.json
    types/
      match.ts
      team.ts
      group.ts
      event.ts
      bracket.ts

  store/
    uiStore.ts                 # audio, ballStage, scrollProgress, banners
    selectors.ts

  hooks/
    useReducedMotion.ts
    useBreakpoint.ts
    useDocumentVisibility.ts
    useScrollStage.ts          # GSAP ScrollTrigger wrapper

  styles/
    tokens.css                 # CSS custom properties
    fonts.css                  # @import Anton, Inter, JetBrains Mono
    globals.css

  assets/
    textures/
      ball-albedo.jpg
      ball-normal.jpg
      ball-roughness.jpg
    audio/
      anthem.mp3
    images/
      stadium-bowl.svg

  utils/
    formatDate.ts
    formatScore.ts
    cn.ts                      # clsx + tailwind-merge

  vite-env.d.ts
  main.tsx

public/
  favicon.svg
  og-image.png
```

---

## Component Contracts

### `<GlobalCanvas>`

Mounted once at root. Owns the only R3F `<Canvas>` instance. No props.

Internals:

- `<MotionGate>` decides render: full canvas | empty fragment (mobile / reduced-motion).
- On mount, reads anchors (`logo`, `date-card`) via `useAnchorRect`.
- Subscribes to `uiStore.ballStage` + scroll progress.

### `<Ball>`

Pure 3D actor. Props:

```ts
type BallProps = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: number;
};
```

Geometry: icosahedron with subdivision OR loaded Telstar 18 GLB. PBR via `useTexture`. No external behavior — driven entirely by `useBallController()`.

### `useBallController()`

```ts
function useBallController(): {
  position: Vector3;
  rotation: Euler;
  scale: number;
};
```

Subscribes to:

- `uiStore.ballStage` (`'intro' | 'roll-navbar' | 'drop-card' | 'idle-card' | 'scroll-guide' | 'parked-countdown'`).
- ScrollTrigger progress (0 → 1) once stage === 'scroll-guide'.
- Anchor rects.

Returns interpolated transform each frame.

### `<PitchNavbar>`

No props. Self-contained.

- Renders grass + sideline + arc + penalty spot via CSS.
- `<Logo>` with anchor span.
- `<NavLinks>` desktop, `<MobileMenu>` < md.

### `<MatchCard variant>`

Single source of truth for all match renders. Variants drive layout:

| Variant | Use site |
| --- | --- |
| `hero` | hero center featured match |
| `upcoming` | hero right + upcoming sections |
| `today` | Section 1 grid |
| `live` | Section 5 hero match |
| `bracket` | Section 6 bracket nodes |

Props:

```ts
type MatchCardProps = {
  variant: 'hero' | 'upcoming' | 'today' | 'live' | 'bracket';
  match: Match;
  onClick?: () => void;
};
```

### `<Flag>`

```ts
type FlagProps = {
  countryCode: string;   // ISO 3166-1 alpha-2 (or alpha-3 normalized)
  size?: 'sm' | 'md' | 'lg' | 'xl';
  rounded?: boolean;
  ariaLabel?: string;
};
```

### `<Countdown>`

```ts
type CountdownProps = {
  to: Date;
  format: 'DD:HH:MM:SS' | 'HH:MM:SS' | 'MM:SS';
  onComplete?: () => void;
  flashOnTick?: boolean;
};
```

Self-ticking via `setInterval(1000)`, cleared on unmount or visibility hidden.

### `<AudioPlayer>`

```ts
type AudioPlayerProps = {
  src: string;
  cover: string;
  title: string;
  artist: string;
};
```

Internal HTMLAudioElement. Reads/writes Zustand `audio` slice. Lazy-loads `src` on first user interaction.

### `<FallbackBanner>`

```ts
type FallbackBannerProps = {
  message: string;
  onRetry?: () => void;
};
```

Shown above section when query is `isFallback`.

---

## State Boundaries

**`uiStore` (Zustand)** owns ephemeral UI state:

```ts
type UIStore = {
  audio: { muted: boolean; playing: boolean; progress: number };
  ballStage: BallStage;
  scrollProgress: number;            // 0 → 1
  fallbackBanners: Record<string, boolean>;
  setAudio: (patch: Partial<UIStore['audio']>) => void;
  setBallStage: (stage: BallStage) => void;
  setScrollProgress: (p: number) => void;
  setFallback: (key: string, on: boolean) => void;
};
```

**TanStack Query** owns server data + caching. UI components consume via hooks only.

**Never cross:** data layer must not touch `uiStore`; `uiStore` must not call APIs.

---

## Data Flow

```
Provider (wc2026 / apiFootball / ballDontLie)
   │
   ▼
src/data/api/<source>.ts  (adapter, normalized output, ApiError on fail)
   │
   ▼
src/data/queries/use<Resource>.ts  (TanStack Query, retries, fallback)
   │
   ▼
React component  (loading skeleton | data | fallback banner | error retry)
```

---

## Render Order on Mount

1. `<App>` mounts.
2. Providers initialize (QueryClient, Router).
3. `<GlobalCanvas>` mounts behind content (fixed, z-index 1).
4. `<PitchNavbar>` paints → `<Logo>` anchor available.
5. Hero paints → `<TodayMatchesCard>` anchor available.
6. `<GlobalCanvas>` resolves anchor rects → sets ball at `logo` position.
7. `uiStore.setBallStage('intro')` triggers timeline.

---

## Resize Handling

- `useAnchorRect` recomputes on `ResizeObserver` callback.
- `useBallController` re-interpolates next frame.
- ScrollTrigger refreshes (`ScrollTrigger.refresh()`) on resize debounced 200ms.

---

## Boundary Test

For each unit, the design must answer:

| Unit | What does it do | How to use it | Depends on |
| --- | --- | --- | --- |
| `<Ball>` | Renders one football mesh | `<Ball position rotation />` | none |
| `useBallController` | Computes ball transform from stage + scroll | `const t = useBallController()` | `uiStore`, anchor hook |
| `<MatchCard>` | Renders any match in any context | `<MatchCard variant match />` | `<Flag>`, `<Countdown>` |
| `wc2026 adapter` | Fetches WC data, returns normalized | `await wc2026.todayMatches(signal)` | `client.ts`, env |
| `useTodayMatches` | Caches + provides today's matches | `const {data, isLoading} = useTodayMatches()` | adapter, fixtures |
| `uiStore` | Holds ephemeral UI state | `useUIStore(s => s.audio.muted)` | none |

If a unit cannot be described this cleanly during impl, the boundary needs revision.
