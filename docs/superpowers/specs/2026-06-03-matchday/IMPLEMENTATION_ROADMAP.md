# Matchday — Implementation Roadmap

**Date:** 2026-06-03

---

## Sequencing Principle

Build the shell, then the data layer, then the static page, then the choreography. Each phase ends with a usable, reviewable artifact. No phase depends on a future phase's polish — each is shippable as a milestone.

---

## Phase 0 — Bootstrap (≈ 0.5 day)

**Goal:** Empty Vite app boots clean with all dependencies installed and configured.

**Tasks:**

1. `pnpm create vite matchday --template react-ts`.
2. Install runtime deps: `react-router-dom`, `@tanstack/react-query`, `zustand`, `framer-motion`, `three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `lucide-react`, `flag-icons`, `react-helmet-async`, `@fontsource/anton`, `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`, `clsx`, `tailwind-merge`.
3. Install dev deps: `tailwindcss`, `postcss`, `autoprefixer`, `@types/three`, `eslint-config-prettier`, `prettier`, `eslint-plugin-react-hooks`, `@typescript-eslint/*`.
4. `npx tailwindcss init -p`. Configure `content` paths.
5. `vite.config.ts`: add `@/` alias for `src/`, set up `server.proxy` stub for CORS (commented placeholder).
6. `.env.example` committed with `VITE_WC2026_KEY=`, `VITE_API_FOOTBALL_KEY=`, `VITE_BDL_KEY=`, `VITE_USE_FIXTURES=false`.
7. `.gitignore` already excludes `.env.local`; verify.
8. ESLint + Prettier configured.
9. README scaffold.

**Exit criteria:** `pnpm dev` serves a blank Vite app. Type-check clean.

---

## Phase 1 — Design system + shell (≈ 1 day)

**Goal:** Page chrome lays down. Tokens, fonts, navbar, footer all paint correctly.

**Tasks:**

1. `src/styles/tokens.css` with all color/spacing/motion CSS custom properties.
2. `tailwind.config.ts` extends `colors`, `fontFamily`, `transitionDuration`, `transitionTimingFunction` from tokens.
3. `src/styles/fonts.css` imports Anton, Inter, JetBrains Mono via fontsource.
4. `src/styles/globals.css`: reset, `html` bg, `body` text color, focus ring, reduced-motion override.
5. `src/app/App.tsx` + `providers.tsx` (QueryClient, Router).
6. `<PitchNavbar>` static: grass, sideline, arc, penalty spot (CSS), `<Logo>` (with anchor span placeholder for ball), `<NavLinks>` desktop, `<MobileMenu>` < md.
7. `<Footer>`.
8. `<SkipToContent>` at top of body.
9. `useReducedMotion`, `useBreakpoint` hooks.

**Exit criteria:** Page loads with navbar + footer painted using tokens. Lighthouse a11y ≥ 95. Responsive across breakpoints.

---

## Phase 2 — Data layer (≈ 1.5 days)

**Goal:** All three APIs adapter-wrapped, TanStack hooks exposed, fixtures fall back automatically.

**Tasks:**

1. `src/data/types/` — all domain types (`Match`, `Team`, `Group`, `GroupStanding`, `MatchEvent`, `BracketNode`, `Stadium`).
2. `src/data/api/client.ts` — `ApiError`, `request<T>()` helper.
3. `src/data/api/wc2026.ts` — adapter functions + normalization mappers. **Discovery sub-task:** hit each endpoint once from localhost, document CORS state, document real response shape, document any auth quirks. If CORS blocks → add Vite dev proxy entry.
4. `src/data/api/apiFootball.ts` — same.
5. `src/data/api/ballDontLie.ts` — same.
6. `src/data/fixtures/*.json` — hand-craft realistic samples for: today-matches, upcoming-matches, groups, live-sample (with events), teams, bracket, final-match.
7. `src/data/queries/*` — one hook per resource. Stale-time per § API_INTEGRATION_PLAN.
8. `<FallbackBanner>` component.
9. Enriched return wrapper that surfaces `isFallback`.
10. `useDocumentVisibility` hook (for live polling gate).

**Exit criteria:**

- `pnpm dev` with empty `.env.local` (no real keys) → hooks return fixture data + banner state.
- `pnpm dev` with valid keys → hooks return live data, fallback only on real error.
- `VITE_USE_FIXTURES=true` forces fixtures regardless of keys.

---

## Phase 3 — Hero static (≈ 1 day)

**Goal:** Hero looks right with real data, no ball yet.

**Tasks:**

1. `<HeroGrid>` CSS Grid layout (3 cols desktop, stacked mobile order Center → Left → Right).
2. `<StadiumBackdrop>` SVG bowl + CSS gradients per § UI_UX_PLAN. Floodlight loop class disabled by default until Phase 4 idle loop wires up.
3. `<HeroLeft>` overlay copy + audio player slot.
4. `<AudioPlayer>` full component. Anthem placeholder `public/anthem.mp3` (silent track OK for MVP if real anthem unavailable). Lazy-load on first interaction.
5. `<HeroCenter>` `<TodayMatchesCard>` — render directly from `useTodayMatches()`. Reveal animation deferred to Phase 4; content visible from mount.
6. `<HeroRight>` `<UpcomingMatchCard>` × 2 from `useUpcomingMatches({ limit: 2 })`. Live countdown ticking.
7. `<MatchCard variant>` base implementation (hero, upcoming, today variants).
8. `<Flag>`, `<Countdown>`, `<Skeleton>`, `<LiveDot>`, `<StatTile>`, `<TeamRow>` UI primitives.

**Exit criteria:** Hero renders end-to-end with real or fixture data. Audio plays on interaction. Countdown ticks. No console errors.

---

## Phase 4 — Three.js ball + intro sequence (≈ 2 days)

**Goal:** The hero load sequence runs. Ball spawns from logo, rolls navbar, drops on date card, contents reveal on impact.

**Tasks:**

1. `<GlobalCanvas>` mounts fixed, full-viewport, `pointer-events: none`, z-index above content but below modals.
2. `<MotionGate>` gates render: skip on `< lg` breakpoint OR `prefers-reduced-motion`.
3. `<Ball>` mesh: icosphere or imported Telstar GLB. PBR textures via Drei `useTexture` (`/assets/textures/ball-*.jpg`).
4. `<Lights>` ambient + directional.
5. `useAnchorRect(name)` — resolves DOM `data-ball-anchor` rect to world coords.
6. `uiStore` ballStage slice + actions.
7. `useBallController()` — reads stage, drives position/rotation per frame.
8. Intro timeline orchestration: stage transitions on timer + via stage exit callbacks.
9. Date card impact: ripple SVG component triggered on stage `idle-card` entry. Contents stagger reveal via Framer (re-mount with `<AnimatePresence>` or `whileInView`-equivalent triggered by store flag).
10. Reduced-motion path: stage advances instantly to `idle-card`, ripple replaced with simple fade-in, ball never enters DOM.
11. Mobile path: same as reduced-motion, plus static gold dot in logo `0`.

**Exit criteria:** Load page → ball performs intro at ≥ 50fps on a 2020 laptop. Reduced-motion + mobile fallbacks work. Resize doesn't break ball position.

---

## Phase 5 — Sections (≈ 3 days)

**Goal:** All 7 sections render, real data + fallback, viewport-triggered micro-animations.

**Build order (one per ~0.4 day):**

1. `<TodayMatchesSection>` — filter chips + grid of `<MatchCard variant="today">`.
2. `<TournamentProgress>` — 4 `<StatTile>` + radial progress ring SVG.
3. `<GroupStandings>` — `<GroupCard>` grid (12 groups for 48-team 2026 format). `<TeamRow>` per standing.
4. `<FeaturedTeams>` — horizontal scroll-snap carousel of `<TeamCarouselCard>`.
5. `<LiveMatchCenter>` — empty state + live state (hero match + `<EventTimeline>` + `<StatBars>`). Live polling enabled.
6. `<RoadToFinal>` — bracket SVG, `<BracketMatch>` nodes, line-draw animation.
7. `<FinalCountdown>` — huge JetBrains Mono countdown, gold flash on digit change.

Each section:

- Wired to its TanStack hook.
- Skeleton on `isLoading`.
- `<FallbackBanner>` on `isFallback`.
- Empty state for legitimately empty data.
- Framer Motion `whileInView` enter animation per § ANIMATION_STORYBOARD § Beat 8.

**Exit criteria:** All 7 sections render end-to-end with real or fixture data. Each section visually matches the storyboard. Mobile responsive.

---

## Phase 6 — Scroll-guide ball (≈ 1.5 days)

**Goal:** Persistent Three.js ball follows scroll path across 7 section waypoints.

**Tasks:**

1. GSAP ScrollTrigger wired to body scroll. Progress 0 → 1.
2. Waypoint resolver: collects all `[data-ball-stage]` elements, computes target world positions, rebuilds on `ResizeObserver`.
3. Catmull-Rom curve from `THREE.CatmullRomCurve3(waypoints)`.
4. `useBallController` extended: stage `'scroll-guide'` reads ScrollTrigger progress, samples `curve.getPointAt(progress)`, sets ball position + tangent rotation.
5. Stage transition: on first scroll past 50vh, stage → `'scroll-guide'`. On scroll-progress ≥ 0.95, stage → `'parked-countdown'`.
6. Mobile fallback path: small SVG ball sprite per section, Framer keyframe roll-in on viewport enter.
7. Reduced-motion: no scroll-guide ball at all. Sections fade in without ball.
8. Performance: ball `frameloop` set to `demand` when no scroll movement detected for 200ms; wakes on next scroll event.

**Exit criteria:**

- Desktop: smooth ball journey across all 7 sections, no jank on 6× CPU throttle.
- Mobile: SVG ball sprites visible per section.
- Reduced-motion: no ball, sections still fade in.
- Resize at any point: ball recovers to correct position.

---

## Phase 7 — Polish + QA (≈ 1.5 days)

**Goal:** Production-ready.

**Tasks:**

1. **Performance audit:**
   - Lighthouse on landing (mobile + desktop).
   - Bundle analysis (`vite-plugin-bundle-analyzer`).
   - Three.js: draw call count, texture memory.
   - Lazy-load Three.js bundle (dynamic import in `<MotionGate>`).
2. **Cross-browser:** Chrome, Safari (macOS + iOS), Firefox, Edge.
3. **Real-device mobile test:** iOS Safari, Android Chrome.
4. **A11y:**
   - axe DevTools pass.
   - Keyboard-only walkthrough.
   - Screen reader smoke (VoiceOver + NVDA).
   - Reduced motion + high contrast modes.
5. **SEO:**
   - `react-helmet-async` for managed `<title>`, meta description, OG tags. (Locked over native `<title>` so per-section copy can update head if deep routes ship post-MVP.)
   - `og-image.png` placed in `public/`.
   - Structured data `SportsEvent` injected per match via inline `<script type="application/ld+json">`.
6. **Error boundary** at app root + per major section.
7. **README** with setup, env vars, dev/build commands, API source attribution.
8. **Deployment readiness:** Vercel/Netlify config (`vercel.json` or `netlify.toml`) with SPA fallback. No prod env yet — out of scope unless requested.

**Exit criteria:**

- Lighthouse perf ≥ 85 desktop / ≥ 70 mobile.
- Bundle initial JS ≤ 250 KB gzip (excl Three.js assets).
- a11y score ≥ 95.
- All 4 browsers visually correct.
- README sufficient for a new dev to run locally in < 10 min.

---

## Total Estimate

| Phase | Days |
| --- | --- |
| 0 — Bootstrap | 0.5 |
| 1 — Shell | 1.0 |
| 2 — Data | 1.5 |
| 3 — Hero static | 1.0 |
| 4 — Ball + intro | 2.0 |
| 5 — Sections | 3.0 |
| 6 — Scroll ball | 1.5 |
| 7 — Polish | 1.5 |
| **Total** | **~12 days** |

Solo developer, focused. Add buffer for API discovery surprises.

---

## Deferred Backlog (post-MVP)

- 3D interactive trophy scene (Section bonus).
- PWA installability + service worker offline cache.
- Deep routes: `/match/:id`, `/team/:id`, `/group/:id`, `/stadium/:id`.
- Multi-page nav (Matches, Teams, Bracket, Stadium dedicated pages).
- User accounts + favorite teams.
- Storybook component library.
- i18n (English-only MVP).
- Analytics (privacy-respecting, e.g., Plausible).
- Push notifications for match start / goals.
- SSR / SSG for SEO uplift.
- Server-side proxy if any API later requires server secret.

---

## Review Gates

After each phase, run:

1. `pnpm typecheck` clean.
2. `pnpm lint` clean.
3. `pnpm build` succeeds.
4. Manual smoke test of phase exit criteria.
5. Commit with clear message: `phase N: <description>`.

No phase rolls forward until gates pass.
