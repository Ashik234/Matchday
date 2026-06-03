# Matchday — Project Plan

**Date:** 2026-06-03
**Codename:** Matchday — FIFA World Cup 2026 Companion
**Owner:** ashik.k@dignizant.com

---

## Vision

A premium, immersive FIFA World Cup 2026 companion experience. Not a typical sports site. Users feel they have entered an official FIFA digital experience — festive, cinematic, modern. Every section tells a story; every animation guides attention; every scroll reveals something meaningful.

Reference inspiration: FIFA+, UEFA, Apple product launches, award-show presentations, interactive storytelling websites.

---

## MVP Scope (locked)

**In scope:**

- Single-page landing experience at `/`.
- Hero with 3-column layout, Three.js football intro sequence, pitch-themed navbar.
- 7 scroll-driven sections (Today's Matches → Tournament Progress → Group Standings → Featured Teams → Live Match Center → Road to Final → Final Countdown).
- Three real API integrations (World Cup 2026 API, API-Football, BallDontLie FIFA) with fixture fallback on error/rate-limit.
- Persistent Three.js scroll-guide ball (desktop ≥ 1024px); 2D SVG sprite fallback for mobile and `prefers-reduced-motion`.
- Midnight Pitch palette, Anton + Inter typography.
- Audio player for Official Tournament Anthem (muted initial).
- Real-time live match polling (15s interval, visibility-gated).

**Deferred (post-MVP):**

- 3D interactive trophy scene.
- PWA installability + offline support.
- Deep routes (`/match/:id`, `/team/:id`, `/group/:id`).
- Multi-page navigation (matches, teams, brackets, stadium dedicated pages).
- Storybook component library.
- Server-side rendering.

---

## Technology Stack

| Concern | Choice |
| --- | --- |
| Build / dev | Vite |
| Language | TypeScript (strict) |
| UI | React 18 |
| Styling | Tailwind CSS + CSS custom-property tokens |
| DOM animation | Framer Motion |
| 3D | Three.js + @react-three/fiber + @react-three/drei |
| Scroll choreography | GSAP ScrollTrigger |
| State (UI) | Zustand |
| Data fetching | TanStack Query |
| Routing | React Router (installed; only `/` mounted MVP) |
| Icons | lucide-react |
| Flags | flag-icons (SVG sprite) |
| Audio | Native `HTMLAudioElement` |

---

## Constraints & Non-Functional Targets

- **Performance:** Lighthouse Performance ≥ 85 desktop, ≥ 70 mobile. LCP < 2.5s desktop. CLS < 0.05.
- **Bundle budget:** Initial JS ≤ 250 KB gzip (excluding Three.js texture assets). Three.js + R3F lazy-loaded.
- **A11y:** WCAG AA across all text. `prefers-reduced-motion` honored globally. Keyboard navigation for all interactive controls.
- **Browser support:** Chrome / Edge / Firefox / Safari current + previous major. Mobile Safari 16+, Chrome Android current.
- **Privacy:** No tracking pixels in MVP. No PII collection.

---

## API Sources

1. **World Cup 2026 API** — teams, matches, groups, standings, stadiums, schedule, live scores. Key: `VITE_WC2026_KEY`.
2. **API-Football** (`v3.football.api-sports.io`) — H2H, historical, team compare. Key: `VITE_API_FOOTBALL_KEY`.
3. **BallDontLie FIFA** — player stats, match events, analytics. Key: `VITE_BDL_KEY`.

All three real from day one. Each behind an adapter returning normalized domain types. Fixture JSON fallback on error or rate-limit. See `API_INTEGRATION_PLAN.md`.

---

## Success Criteria

- Hero load sequence runs end-to-end (ball intro → navbar roll → date-card drop → reveal) at ≥ 50fps on a 2020-era laptop.
- All 7 sections render real or fixture data without dev intervention.
- Scroll-guide ball traverses page smoothly across 7 waypoints on desktop; mobile shows graceful 2D fallback.
- Live match center polls and updates score within 15s of provider change.
- Site loads and is usable with all 3 APIs returning 429.
- Manual cross-browser pass on Chrome / Safari / Firefox / Edge.

---

## Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| API CORS blocks browser origin | Phase 2 discovery hits each API; if blocked, spec a Vite dev proxy + prod Cloudflare/Vercel edge worker. |
| API key rate limits (esp. API-Football free 100/day) | Aggressive TanStack `staleTime`; fixture fallback automatic. |
| Three.js perf on mid mobile | Canvas gated to `≥lg` breakpoint; SVG sprite fallback otherwise. |
| Scroll-guide ball drift on resize | Waypoints recomputed via `ResizeObserver`; ball position recalculated on next frame. |
| Audio autoplay policies | Anthem starts muted + paused; user must click play. Audio file lazy-loaded on first interaction. |
| Real World Cup 2026 API may not exist or change | Adapter isolates source; fixtures keep dev unblocked; swap adapter if provider changes. |

---

## Team & Tooling

- Single developer (assumed). Estimate ~12 working days.
- Source control: git, main branch.
- Package manager: pnpm preferred (npm acceptable).
- Lint: ESLint + typescript-eslint. Format: Prettier. Pre-commit: lint-staged + husky (optional).

---

## Deliverables (this planning round)

1. `PROJECT_PLAN.md` (this file)
2. `UI_UX_PLAN.md`
3. `COMPONENT_ARCHITECTURE.md`
4. `API_INTEGRATION_PLAN.md`
5. `ANIMATION_STORYBOARD.md`
6. `DESIGN_SYSTEM.md`
7. `IMPLEMENTATION_ROADMAP.md`

No application code written until all 7 docs approved. Implementation proceeds phase-by-phase per `IMPLEMENTATION_ROADMAP.md`.
