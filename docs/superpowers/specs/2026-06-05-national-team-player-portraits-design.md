# Spec — National Team Player Portrait System

**Date:** 2026-06-05
**Branch target:** `feat/matchday-impl`
**Status:** Draft

---

## 1. Problem

Player visuals across the app are inconsistent or absent:

- Squad tab `PlayerCard` shows no image. Just jersey number + name.
- Star Players tab uses a gold gradient placeholder with the jersey number.
- Match page `SquadColumn` is a plain text list.
- No player profile route exists.

Even if we wired stock images today, they would be club photos (mixed kits, varied backgrounds) — wrong vibe for a World Cup product. WC product = national team identity, every frame.

## 2. Goal

Every player rendered in the app shows a portrait of that player wearing **their national team jersey**, with consistent framing, transparent or unified background, and HD source.

Aesthetic target: FIFA.com player cards, EA Sports FC squad screens, Sofascore national team pages.

## 3. Non-goals

- AI-generated / synthesized portraits (future phase).
- Background removal pipeline (future phase — we accept the original Wikidata image as-is for v1, with a per-player override mechanism for later cleanup).
- Live in-tournament photo updates.
- Per-match action shots.

## 4. Where portraits appear (UI inventory)

| Surface | File | Portrait usage |
|---|---|---|
| Team page → Squad tab | `src/pages/TeamPage/components/PlayerCard.tsx` | Small portrait, top-left of card. Size: `md`. |
| Team page → Star Players tab | `src/pages/TeamPage/tabs/StarPlayersTab.tsx` | Replace gold-gradient placeholder with `xl` portrait, aspect `3/4`. |
| Match page → Squad Compare tab | `src/pages/MatchPage/components/SquadColumn.tsx` | `xs` avatar (24px) next to each row. |
| Match page → Overview "Key Players" (new) | new component | `lg` portrait, 3 per side. |
| Formation View (future) | new | `md` portrait inside pitch node. Defer to phase 2. |
| Player profile `/player/:slug` (new) | new route | Hero `xl` portrait. |

`PlayerPortrait` size scale:

```
xs  = 32x32   (table rows)
sm  = 64x64   (lists)
md  = 128x171 (3:4 card thumb)
lg  = 240x320 (key-player feature)
xl  = 480x640 (hero / star)
```

## 5. Data model

### 5.1 Type changes

`src/data/types/player.ts` — add optional image fields. Optional preserves back-compat with current `squads.json`.

```ts
export type PlayerImageSource =
  | 'wikidata-national-team'
  | 'wikidata-tournament'
  | 'wikidata-national-team-training'
  | 'wikidata-portrait'
  | 'manual-override'
  | 'generated-fallback';

export type PlayerImage = {
  url: string;            // /images/players/arg-10-messi.webp
  width: number;
  height: number;
  source: PlayerImageSource;
  /** SHA1 of the original Commons file; lets us detect upstream changes. */
  hash: string;
  /** When this image was scraped + processed. ISO timestamp. */
  generatedAt: string;
};

export type Player = {
  // ...existing fields...
  image?: PlayerImage;
};
```

### 5.2 New manifest

`public/data/player-images.json` — separate file from `squads.json` so re-scraping images doesn't require re-running the squad scraper.

```json
{
  "generatedAt": "2026-06-05T00:00:00.000Z",
  "players": {
    "BRA-10": { "url": "...", "width": 600, "height": 800, "source": "wikidata-national-team", "hash": "abc...", "generatedAt": "..." },
    "ARG-10": { ... }
  }
}
```

`useSquad` hook merges the image manifest into `Player` objects at the boundary, so React components consume a single shape.

### 5.3 Asset storage

```
public/images/players/
  arg-10-messi.webp
  bra-7-vinicius-jr.webp
  fra-10-mbappe.webp
  ...
public/images/players/_fallback/
  generated-arg-10.svg   (built on-demand server-side at scrape time)
```

Filename pattern: `<isoCountryCode>-<jersey>-<slug>.webp`.

## 6. Scrape pipeline

`scripts/scrape-player-images.mjs` — runs after `scrape-squads.mjs`. Independent from match-history scraper.

### 6.1 High-level steps

1. Load `public/data/squads.json`.
2. Load existing `public/data/player-images.json` if present (incremental — skip players already resolved unless `--force`).
3. For each player:
    1. Resolve player's Wikidata QID via SPARQL (search by name + national team).
    2. Fetch entity → read `P18` (image), `P54` (member of sports team), `P166` (awards if needed for star pick), `P641` (sport).
    3. **Rank candidate images** by source preference (see §6.2).
    4. Download chosen file from Commons via `https://commons.wikimedia.org/wiki/Special:FilePath/<filename>?width=800`.
    5. Process with `sharp`: crop to 3:4, resize to 600×800, convert to `.webp` quality 82.
    6. Write to `public/images/players/`.
    7. Update manifest entry.
4. For players with no Wikidata hit OR no acceptable image: write `source: 'generated-fallback'` and produce SVG (see §7).
5. Write `public/data/player-images.json`.

### 6.2 Image candidate ranking

Wikidata image candidates per player ordered by:

1. `P18` value whose Commons filename or caption matches `/\bnational team\b|world cup|euro|copa america|africa cup|asian cup/i` → **wikidata-national-team**.
2. Files in Commons category `Category:<player name>` whose filename contains the country adjective or ISO code → infer national-team.
3. `P18` with caption containing "training" + country → **wikidata-national-team-training**.
4. Plain `P18` value → **wikidata-portrait**.

Reject if the chosen file's category set includes only club categories (e.g. `Real Madrid CF players in...`).

### 6.3 SPARQL prototype

```sparql
SELECT ?player ?image ?caption WHERE {
  ?player wdt:P31 wd:Q5;
          rdfs:label "Lionel Messi"@en;
          wdt:P54 ?club.
  OPTIONAL { ?player wdt:P18 ?image. }
  OPTIONAL { ?image schema:caption ?caption. }
  ?player wdt:P1532 wd:Q414.  # represents country = Argentina
}
LIMIT 5
```

We will batch queries (`VALUES ?label`) up to 20 names at a time to stay polite. Rate limit: 1 req/sec, retry-after honored.

### 6.4 Disambiguation

Multiple players share names (e.g. "João Silva"). Disambiguate by:

1. Wikidata `P1532` (country for sport) = team's ISO code.
2. Then by club affiliation match against `Player.club`.
3. Then by birth-year ± age tolerance ±1.

If still ambiguous: log warning, fall back to generated portrait.

### 6.5 CLI

```
node scripts/scrape-player-images.mjs           # incremental
node scripts/scrape-player-images.mjs --force   # re-scrape all
node scripts/scrape-player-images.mjs --team ARG   # single team
node scripts/scrape-player-images.mjs --player BRA-10   # single player
```

### 6.6 Politeness + caching

- Persistent SQLite cache `.cache/wikidata.sqlite` keyed by SPARQL query hash → 7-day TTL.
- Image downloads cached by hash; skip download if hash unchanged.
- `User-Agent: Matchday/1.0 (https://...; ashik.k@dignizant.com)` — Wikidata requires real UA.

## 7. Generated fallback portrait

When no upstream image is acceptable, generate a deterministic SVG card so the layout never shows an empty box.

Spec:

- 600×800 SVG.
- Background: vertical gradient using `flagColors(team.countryCode)` — first two stops.
- Center: large flag emoji or `<Flag size="xl">` rendered as data-URL.
- Below flag: player initials in big display font.
- Top-right: `#<jersey>` in gold.
- Subtle noise texture overlay.

Generated once at scrape time and committed as `.svg` (not `.webp`) so it scales without quality loss. Referenced from manifest with `source: 'generated-fallback'`.

## 8. React API

### 8.1 Component

`src/components/ui/PlayerPortrait.tsx`

```tsx
type Props = {
  player: Player;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'card';          // default 'card'
  className?: string;
  loading?: 'lazy' | 'eager';         // default 'lazy'
  showJerseyBadge?: boolean;          // default false; true on Star Players
};
```

Behavior:

- Renders `<img>` with `srcset` for 1x/2x.
- `loading="lazy"` and `decoding="async"` by default.
- Skeleton (shimmer) while loading via `onLoad` state.
- `onError` swaps to `<GeneratedPortrait>` fallback rendered inline (no extra request).
- Memoized via `React.memo`; key on `player.id`.
- All sizes share `object-cover object-top` so heads remain visible after crop.
- Optional jersey badge: `#<jersey>` chip in top-right corner.

### 8.2 Helper hook

`src/data/queries/usePlayerImage.ts` — thin wrapper around the merged `Player.image` field. Provides one place to swap to a live API later.

### 8.3 Usage sites (concrete diffs)

- **`PlayerCard.tsx`** — add 64×64 portrait above name; rearrange to vertical card.
- **`StarPlayersTab.tsx`** — replace gold gradient `<div>` with `<PlayerPortrait size="xl" shape="card" showJerseyBadge />`.
- **`SquadColumn.tsx`** — prepend `<PlayerPortrait size="xs" shape="circle" />` to each `<li>`.
- **New `MatchPage/components/KeyPlayers.tsx`** — render top 3 per team from `STAR_PLAYER_JERSEYS`.
- **New `/player/:slug` route** — phase 2.

## 9. Performance

- Portraits are large; pre-emptively decode only the visible ones. Use `loading="lazy"` everywhere except `MatchHero` key-players.
- Generate AVIF + WebP? V1 = WebP only. AVIF adds complexity, low payoff at 600×800.
- 48 teams × 26 players = **1248 images max**. At ~25KB WebP each → ~31MB total on disk. Acceptable; will be served via Vite static (and CDN once deployed).
- Manifest size: ~250KB JSON. Gzips to ~40KB. Acceptable.

## 10. Accessibility

- `<img>` always has `alt={`${player.name}, ${team.name} #${player.jersey}`}` for meaningful images.
- Decorative use cases (formation pitch nodes) get `alt=""` since the surrounding label already names the player.
- Generated fallback SVG has `<title>` and `<desc>` matching the alt text.

## 11. Phasing

**Phase 1 (this spec):**

- Scraper + manifest + image storage.
- `<PlayerPortrait>` component.
- Wire into Squad tab, Star Players tab, Squad Compare.
- Generated fallback.

**Phase 2 (later):**

- Player profile route `/player/:slug`.
- Formation pitch view.
- Background-removal pass via `rembg`/`@imgly/background-removal` for non-transparent sources.
- Manual override file `data/player-overrides.json` so we can hand-curate top 50 stars.

**Phase 3 (later still):**

- Home/Away kit variants.
- Tournament-specific image set (e.g. WC 2026 official portraits when FIFA releases them).
- AI-generated portraits for `generated-fallback` entries.

## 12. Risks & open questions

| Risk | Mitigation |
|---|---|
| Wikidata image is club kit, not national. | §6.2 ranking + reject by category filter. Star players get manual override in phase 2. |
| Many players have no Wikidata entity at all (lesser-known). | Generated SVG fallback. |
| Commons file licenses vary. | Most are CC-BY-SA. Need attribution. Store `attribution` field per image and surface in a `/credits` footer page. |
| Image manifest grows large. | Already split per team if it exceeds 500KB. Lazy-load per `/team/:slug`. |
| Background inconsistency across portraits. | Phase 2 background removal. v1: accept variance for non-star players; manually curate stars. |
| Faces cropped poorly at small sizes. | `object-position: top` for portraits ensures heads stay visible; can be overridden per-player via `image.cropY` later. |

## 13. Acceptance criteria

- `node scripts/scrape-player-images.mjs --team ARG` produces 26 entries in `public/data/player-images.json` and 26 images on disk (any mix of real + fallback).
- TypeScript `Player.image` is optional and code compiles with `verbatimModuleSyntax`.
- Squad tab renders with portraits on all 48 teams. No layout shift on load.
- Star Players tab shows real photos for at least 60% of star picks; rest fall back gracefully.
- Lighthouse LCP on `/team/arg` does not regress by more than 200ms.
- No console errors on `/team/:slug` for any of the 48 teams.

## 14. Out of scope (explicit)

- Click-through from portrait to player profile (route not built yet in phase 1).
- Hover animations on portrait (decided in design pass, phase 2).
- Sharing player card images via OG.
- Localization of player names beyond what `squads.json` already stores.

---

## Estimate

- Scraper + ranking + fallback: ~1.5 days.
- `<PlayerPortrait>` + wiring 3 surfaces: ~0.5 day.
- Manual curation pass for star players: ~0.5 day (after first scrape produces noise).

**Total phase 1: ~2.5 days of focused work.**
