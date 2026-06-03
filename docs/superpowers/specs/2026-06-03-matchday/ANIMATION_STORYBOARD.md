# Matchday — Animation Storyboard

**Date:** 2026-06-03

---

## Master Timeline (initial page load)

Three actors: **Ball** (Three.js), **Content** (DOM via Framer Motion), **Audio** (idle until interaction).

```
T (ms)    Beat                                  Actor
─────────────────────────────────────────────────────────────────────────
0–300     Skeleton paint + font swap            Content
300–500   Navbar grass fade-in                  Content
500–700   Sideline draws left→right             Content
700–900   Logo fade-in (zero is placeholder)    Content
900–1100  Canvas mounts, ball spawn @ logo      Ball (scale 0→1, bounce)
1100–2800 Ball rolls along sideline →           Ball
            passing each nav link
            links bump + gold underline
2800–3200 Ball drops onto date card             Ball (gravity ease)
3200–3280 Date card flash (white 80ms)          Content
3280–3600 Ripple ring expands from impact       Content (Framer)
3600–4200 Today's matches stagger-reveal        Content (60ms stagger)
4200+     Ball idles on date card (bob+rotate)  Ball loop
          Hero left floodlight pulse (4s loop)  Content loop
          Upcoming countdowns tick              Content
          Audio ready (muted/paused)            Audio
```

Total intro ≈ 4.2s, skippable (click anywhere skips to T=4200).

---

## Easing & Duration Tokens

```
--ease-out:     cubic-bezier(.22,.61,.36,1)
--ease-impact:  cubic-bezier(.55,.05,.67,.19)    # ball drop
--ease-spring:  cubic-bezier(.34,1.56,.64,1)     # bumps, pops
--dur-fast:     150ms
--dur-base:     300ms
--dur-slow:     600ms
--dur-reveal:   1200ms
```

---

## Beat-by-Beat Detail

### Beat 0 — Mount (0–300ms)

- React paints skeleton DOM.
- Fonts swap when Anton + Inter ready (`font-display: swap` accepted).
- `uiStore.ballStage = 'pre-intro'`.

### Beat 1 — Navbar reveal (300–900ms)

- Navbar `<div>` fades from `opacity: 0` to `1` (`--dur-base`).
- Sideline white bar animates `width: 0 → 100%` (`--dur-base`, ease-out).
- Logo letters fade in staggered 40ms each.
- Zero placeholder is a static gold dot at this moment.

### Beat 2 — Ball spawn (900–1100ms)

- `<GlobalCanvas>` becomes visible (was `opacity: 0`).
- Ball spawns at world position of `data-ball-anchor="logo"` zero.
- Scale tween: `0 → 1.15 → 1` (200ms, ease-spring).
- Static gold dot inside logo fades out as ball appears.

### Beat 3 — Ball roll along navbar (1100–2800ms)

- `uiStore.ballStage = 'roll-navbar'`.
- Path: Catmull-Rom curve along sideline x-axis, from logo position to navbar 70% width.
- 1700ms duration, ease-out.
- Ball rotation: 360° per 200px traveled (rolling physics, no slip).
- As ball approaches each nav link (`<a>` rect), within 80px:
  - Link `scale: 1 → 1.05` (200ms ease-spring).
  - Gold underline draws beneath link (`scaleX: 0 → 1`, 200ms).
  - On ball departure, link reverts (400ms).

### Beat 4 — Drop on date card (2800–3200ms)

- `uiStore.ballStage = 'drop-card'`.
- Ball falls from navbar y to date-card y. ease-impact.
- 400ms.
- Slight x-jitter on impact (10px swing → 0).

### Beat 5 — Impact reveal (3200–4200ms)

- Date card div applies `box-shadow: 0 0 0 0 rgba(255,255,255,1)` → `0 0 80px 40px rgba(255,255,255,0)` over 80ms.
- Ripple SVG: circle r=0 → r=400px, opacity 0.6 → 0 over 320ms.
- Card contents enter via Framer:
  - Date header: `y:20 → 0, opacity:0 → 1` (300ms, delay 100ms).
  - Stat strip: same (delay 160ms).
  - Featured match: `scale: 0.95 → 1` + fade (300ms, delay 220ms).
  - Quick list rows: 60ms cascading stagger.

### Beat 6 — Hero idle (4200ms+)

- Ball: stage `'idle-card'`. Position parked on card. Rotation slow (0.5 rev/s y-axis), bob `±3px` y over 2s loop.
- Hero left: floodlight overlay opacity `0.05 → 0.12 → 0.05`, 4s loop.
- Upcoming match countdowns tick every 1s.

### Beat 7 — Scroll begins (user-triggered)

- On first scroll event past 50vh, `uiStore.ballStage = 'scroll-guide'`.
- ScrollTrigger pinned to `<body>`, progress 0 → 1 across full document scroll length.
- Ball position interpolated along master Catmull-Rom curve passing 7 section waypoints.
- Each waypoint resolved from section `data-ball-stage="N"` element's rect (center, slightly offset toward visual focal point).

### Beat 8 — Section enter animations

Triggered when section center enters viewport (via Framer `viewport={{ once: true }}` or `whileInView`).

| Section | Choreography |
| --- | --- |
| Today's Matches | Filter chips fade (200ms). Cards: 3-col grid, stagger 80ms left→right then 100ms row down. |
| Tournament Progress | Stat tiles cascade left→right (100ms each). Radial ring: stroke-dashoffset animates 0 → currentPct over 1000ms ease-out. |
| Group Standings | Group cards in grid, stagger 60ms. Each card: rows slide-in from left, 40ms apart. |
| Featured Teams | Carousel cards `scale: 0.92 → 1` + fade, stagger 80ms. Hover (desktop): stat panel `y:20 → 0, opacity:0 → 1` 200ms. |
| Live Match Center | Live dot pulse loop (1s, scale 1 → 1.3 → 1). Hero match score `scale: 0.7 → 1.05 → 1` (600ms spring). Event timeline: new events `y:30 → 0, opacity:0 → 1` 300ms each. Stat bars: `width: 0 → finalPct` over 800ms ease-out. |
| Road to Final | Bracket lines: SVG `stroke-dashoffset: total → 0`, 1200ms stagger by round (R32 first, F last). Match nodes fade in alongside their connecting line. |
| Final Countdown | Digits tick. On digit change: gold flash `box-shadow: 0 0 0 → 0 0 30px gold → 0 0 0` over 400ms. Backdrop particles drift continuously (CSS keyframe, very slow). |

### Beat 9 — Ball parks (final)

- When scroll reaches Final Countdown section (progress ≈ 1), ball settles on top of the clock.
- `uiStore.ballStage = 'parked-countdown'`.
- Rotation continues slow. Bob disabled.

### Beat 10 — Reverse scroll

- Same curve, reverse direction.
- Ball naturally rolls back up. Section enter animations are `once: true` — do not retrigger.

---

## Hover & Micro

| Element | Hover behavior |
| --- | --- |
| Upcoming match card | `translateY: -4px`, `box-shadow: shadow-gold`, 150ms. |
| Today match card | Same. |
| Featured team card | Expand stat panel from bottom, 200ms ease-out. |
| Bracket match node | Highlight border gold, draw next-line in highlight color. |
| Audio play button | Scale 1.05, gold glow. |
| Nav link | Underline draw 150ms. |

---

## Reduced Motion (`prefers-reduced-motion: reduce`)

- Beats 1–5 skipped:
  - Navbar appears instantly.
  - Ball never enters DOM (canvas not mounted).
  - Date card contents appear via simple 200ms fade.
- Beat 8 section enters: simple `opacity: 0 → 1` per section, no stagger, no slide.
- Idle loops disabled (no bob, no floodlight pulse, no live dot pulse — replaced with static red dot).
- Countdown digits still tick (functional, not decorative).
- Hover effects retained (instant, no transition).

---

## Mobile (`< lg` / 1024px)

- `<GlobalCanvas>` not mounted. Three.js bundle code-split + not loaded.
- Hero stacks: Center → Left → Right.
- Date card impact ripple still triggers via Framer Motion on mount (no ball-drop precedent, just direct ripple).
- Each section gets a small SVG ball sprite on enter:
  - Sprite enters from left edge of section, rolls 100px, settles in corner.
  - 600ms total, Framer keyframe.
  - Disabled if reduced-motion.
- Navbar pitch shrinks to 88px. No ball roll. Static gold dot in logo `0`.

---

## Implementation Tools

- **Framer Motion:** all DOM transitions, hover, in-view triggers, micro-interactions, section staggers.
- **GSAP ScrollTrigger:** scroll-guide ball pathing only (Framer's `useScroll` does not handle long Catmull-Rom mapping cleanly).
- **R3F `useFrame`:** per-frame ball transform write.
- **Zustand:** stage state machine — single source of truth read by both ball and DOM.

---

## Performance Guards

- Canvas: 1 mesh + 1 ambient + 1 directional light. Texture max 1024px. No shadows in MVP.
- Animations use `transform` + `opacity` only (no `width`/`height`/`top`/`left`).
- Section enter listeners use `IntersectionObserver` (via Framer), not scroll polling.
- ScrollTrigger configured `markers: false` prod, throttled to rAF.
- `will-change: transform` applied only during active animation, removed after.
- Audio file lazy-loaded on first user interaction (autoplay compliance + bandwidth save).
- `<Ball>` `frameloop` set to `demand` when stage is `idle-card` or `parked-countdown` AND no scroll movement — wakes on scroll or stage change.

---

## State Machine (uiStore.ballStage)

```
'pre-intro'
   └─ canvas mount ─► 'intro'
                       └─ scale-in done ─► 'roll-navbar'
                                            └─ roll done ─► 'drop-card'
                                                             └─ impact ─► 'idle-card'
                                                                          └─ user scroll past 50vh ─► 'scroll-guide'
                                                                                                       └─ scroll progress ≥ ~0.95 ─► 'parked-countdown'
```

No back-transitions except `'parked-countdown' → 'scroll-guide'` if user scrolls back up.
