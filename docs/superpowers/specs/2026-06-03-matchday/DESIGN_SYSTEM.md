# Matchday — Design System

**Date:** 2026-06-03

---

## Brand Identity

- **Name:** Matchday
- **Logo lockup:** `FIFA 2⚽26` — Anton, weight 400, white default, gold accent variant. The football replaces the `0`.
- **Tagline:** "Experience the journey to the Final."
- **Tone:** Premium, festive, cinematic, reverent of the tournament.

---

## Color Tokens

Midnight Pitch palette. All tokens defined as CSS custom properties in `src/styles/tokens.css`, mirrored into `tailwind.config.ts` so Tailwind utilities use the same source of truth.

```css
:root {
  /* surfaces */
  --c-bg-deep:     #050810;
  --c-bg:          #0A1428;
  --c-bg-elev-1:   #0E1A30;
  --c-bg-elev-2:   #142340;

  /* pitch */
  --c-pitch:       #1F5A1F;
  --c-pitch-dark:  #0D2818;
  --c-pitch-line:  #FFFFFF;

  /* accent */
  --c-gold:        #D4A017;
  --c-gold-light:  #FFD700;

  /* text */
  --c-text:        #F5F7FA;
  --c-text-dim:    #8A95A8;
  --c-text-muted:  #4A5468;

  /* status */
  --c-live:        #FF3B3B;
  --c-success:     #2ECC71;
  --c-loss:        #E74C3C;
}
```

Tailwind extend:

```ts
colors: {
  bg:       { deep: 'var(--c-bg-deep)', DEFAULT: 'var(--c-bg)', elev1: 'var(--c-bg-elev-1)', elev2: 'var(--c-bg-elev-2)' },
  pitch:    { DEFAULT: 'var(--c-pitch)', dark: 'var(--c-pitch-dark)', line: 'var(--c-pitch-line)' },
  gold:     { DEFAULT: 'var(--c-gold)', light: 'var(--c-gold-light)' },
  text:     { DEFAULT: 'var(--c-text)', dim: 'var(--c-text-dim)', muted: 'var(--c-text-muted)' },
  live:     'var(--c-live)',
  success:  'var(--c-success)',
  loss:     'var(--c-loss)',
}
```

### Contrast

- `text` on `bg`: 14.8:1 (AAA).
- `text-dim` on `bg`: 5.4:1 (AA large + body).
- `gold` on `bg`: 7.6:1 (AAA).
- `text-muted` reserved for non-essential borders, never body text.

---

## Typography

### Families

| Role | Family | Source |
| --- | --- | --- |
| Display | Anton | `@fontsource/anton` weight 400 |
| Body | Inter | `@fontsource-variable/inter` |
| Mono | JetBrains Mono | `@fontsource-variable/jetbrains-mono` |

`font-display: swap`. FOUT acceptable.

### Scale (rem at root 16px)

| Token | Rem | Px | Use |
| --- | --- | --- | --- |
| `text-xs` | 0.75 | 12 | captions, eyebrow |
| `text-sm` | 0.875 | 14 | body small, table cells |
| `text-base` | 1 | 16 | body |
| `text-lg` | 1.125 | 18 | body large |
| `text-xl` | 1.5 | 24 | card titles |
| `text-2xl` | 2 | 32 | section subheads |
| `text-3xl` | 3 | 48 | section headlines |
| `text-display` | 4.5 | 72 | hero headlines |
| `text-hero` | 6 | 96 | live scores, hero numbers |

### Pairings

| Use | Family | Size | Weight | Tracking | Transform |
| --- | --- | --- | --- | --- | --- |
| Hero headline | Anton | display | 400 | -0.01em | none |
| Section title | Anton | 3xl | 400 | -0.005em | uppercase |
| Card title | Inter | xl | 700 | normal | none |
| Eyebrow | Inter | xs | 700 | +0.2em | uppercase |
| Body | Inter | base | 400 | normal | none |
| Label | Inter | sm | 600 | +0.05em | uppercase |
| Mono number | JetBrains Mono | xl | 500 | normal | none |
| Countdown | JetBrains Mono | hero | 500 | normal | none |

---

## Spacing

Tailwind default 4px scale. Common spots:

| Token | Use |
| --- | --- |
| `space-1` (4px) | tight gaps |
| `space-2` (8px) | inline icon-text |
| `space-3` (12px) | card inner |
| `space-4` (16px) | base gap |
| `space-6` (24px) | section inner |
| `space-8` (32px) | column gaps |
| `space-12` (48px) | section top padding |
| `space-24` (96px) | section vertical padding |

Section vertical rhythm: 96px top, 96px bottom desktop. 48px mobile.

---

## Radius

| Token | Value | Use |
| --- | --- | --- |
| `rounded-sm` | 4px | inline pills |
| `rounded` | 8px | buttons, inputs |
| `rounded-lg` | 12px | cards (default) |
| `rounded-xl` | 16px | hero cards |
| `rounded-2xl` | 24px | feature tiles |
| `rounded-full` | 999px | pills, avatars, ball indicators |

---

## Elevation / Shadow

```css
--shadow-card:   0 4px 16px rgba(0,0,0,0.35);
--shadow-raised: 0 12px 40px rgba(0,0,0,0.5);
--shadow-gold:   0 0 24px rgba(212,160,23,0.35);
--shadow-live:   0 0 16px rgba(255,59,59,0.5);
--shadow-impact: 0 0 80px 40px rgba(255,255,255,0.9);
```

Application:

- Default cards: `--shadow-card`.
- Hover / featured: `--shadow-raised`.
- Hover on CTA / gold accent: `--shadow-gold`.
- Live dot, live match card border halo: `--shadow-live`.
- Date card impact moment: `--shadow-impact` (transient).

---

## Borders

- Default divider: `1px solid var(--c-text-muted)` at opacity 30%.
- Card border (subtle): `1px solid rgba(255,255,255,0.05)`.
- Gold qualification highlight (group standings top 2): `2px solid var(--c-gold)` left edge only.

---

## Iconography

- **Library:** `lucide-react`. Stroke 1.5, size 16/20/24.
- **Flags:** `flag-icons` package (CSS sprites). Always paired with `aria-label`.
- **Custom marks (logo, ball mark, trophy line-art):** inline SVG in `src/assets/`.

---

## Motion Tokens

```css
--ease-out:     cubic-bezier(.22,.61,.36,1);
--ease-impact:  cubic-bezier(.55,.05,.67,.19);
--ease-spring:  cubic-bezier(.34,1.56,.64,1);
--dur-fast:     150ms;
--dur-base:     300ms;
--dur-slow:     600ms;
--dur-reveal:   1200ms;
```

Tailwind extend:

```ts
transitionTimingFunction: {
  'out-quart': 'cubic-bezier(.22,.61,.36,1)',
  'impact':    'cubic-bezier(.55,.05,.67,.19)',
  'spring':    'cubic-bezier(.34,1.56,.64,1)',
},
transitionDuration: {
  fast: '150ms', base: '300ms', slow: '600ms', reveal: '1200ms',
},
```

Reduced-motion override (global CSS):

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
}
```

---

## Components — Base Specs

### Button

| Variant | Bg | Text | Border | Shadow |
| --- | --- | --- | --- | --- |
| primary | gold | bg-deep | none | shadow-card → shadow-gold hover |
| secondary | transparent | text | 1px gold | none → shadow-gold hover |
| ghost | transparent | text-dim | none | none |
| danger | live | text | none | shadow-live |

Padding: 10/20 (md), 8/14 (sm), 14/28 (lg). Rounded full. Inter 600.

### Card

- Bg `bg-elev1`. Border `1px rgba(255,255,255,0.05)`. Radius 12. Padding 16/24. Shadow `--shadow-card`.
- Hover variant: bg `bg-elev2`, transform `translateY(-4px)`, shadow `--shadow-raised`. Transition 150ms.

### Pill / Tag

Rounded full. Padding 4/10. Text-xs uppercase weight 700 letter-spacing 0.1em.

- `LIVE` pill: bg `live`, text white, pulsing live dot inside.
- `SCHEDULED` pill: bg `bg-elev2`, text `text-dim`.
- `FINAL` pill: bg `text-muted`, text `bg-deep`.

### Skeleton

- Bg `bg-elev1`. Shimmer overlay: linear-gradient pitch-tinted, animated `translateX(-100%) → translateX(100%)` over 1500ms infinite ease-in-out.

### Live Dot

- 8px circle, bg `live`. Pulsing ring (1s loop, scale 1 → 1.6, opacity 0.6 → 0). Disabled in reduced-motion.

### Match Card variants

Defined in `COMPONENT_ARCHITECTURE.md` § MatchCard. Visuals share:

- Flag size: `sm` for compact rows, `lg` for hero, `xl` for live.
- Team name: Anton uppercase.
- Score / time: JetBrains Mono.
- Stage/group eyebrow: Inter eyebrow style.

---

## Layout

### Grid

- Container: max-width 1440px, centered, horizontal padding 24px desktop / 16px mobile.
- Hero grid: CSS Grid `1.1fr 1.4fr 1fr`, gap 24px.
- Section grid (cards): 1/2/3-up responsive (mobile/tablet/desktop). Gap 16/20/24.

### Breakpoints (Tailwind defaults)

| Token | Min width |
| --- | --- |
| sm | 640 |
| md | 768 |
| lg | 1024 |
| xl | 1280 |
| 2xl | 1536 |

Three.js canvas gate: ≥ `lg`.

---

## Imagery Guidelines

- Stadium / hero backdrops: dark-toned, low-light, never sunny. Lean cinematic night.
- Flags: official aspect, ISO codes only. No emojis.
- Photography (post-MVP): editorial, telephoto compression, action peaks.
- Avoid: stock-photo crowds, generic stadium clip-art, neon overlays.

---

## A11y Tokens

- Focus ring: `outline: 2px solid var(--c-gold); outline-offset: 2px;`. Applied to all interactive elements.
- Skip-to-content link: visible on focus, anchored top of body.
- `aria-live="polite"` on live score regions.
- Audio controls labeled (`aria-label="Play anthem"`, `aria-pressed` on mute).

---

## SEO / Social

- Title default: `Matchday — FIFA World Cup 2026 Companion`.
- Description: 155 chars max, dynamic on data.
- OG image: 1200×630, hero composition (stadium + ball + Matchday wordmark gold). Static asset `public/og-image.png`.
- Structured data: `SportsEvent` schema injected per match (today + upcoming) for rich result eligibility.
- Sitemap (post-MVP): `/` only is the MVP scope.

---

## Don'ts

- No neon outside of `live` red.
- No glassmorphism / blur backdrops (perf + brand).
- No drop shadows on text.
- No emoji except where the design literally embeds one (`2⚽26` lockup — and even that is an SVG, not an emoji char, for typographic control).
- No gradient text in body — gradient is gold-accent reserved for logo + section eyebrows.
- No generic sports template chrome (oversized stat dashboards, gauge widgets).
