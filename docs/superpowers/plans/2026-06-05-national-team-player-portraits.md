# National Team Player Portraits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display every player across the app wearing their national team jersey, sourced from Wikidata/Commons with deterministic SVG fallback.

**Architecture:** Build-time pipeline scrapes Wikidata `P18` per player, ranks candidate images (national-team > tournament > training > generic), processes via `sharp` to 600×800 WebP, writes a manifest `public/data/player-images.json`. A React `<PlayerPortrait>` component reads the manifest (joined into the existing `useSquad` flow) and renders responsive lazy-loaded images with inline SVG fallback. New `Player.image` field is optional to preserve backward compat with current squad data.

**Tech Stack:** Node 20 ESM scripts, `node-fetch` (built-in `fetch`), `sharp` for image processing, Wikidata SPARQL endpoint, Commons FilePath API, React 19, TypeScript strict, TanStack Query v5, Tailwind v4. No new runtime deps beyond `sharp` (dev-only).

**Reference:** `docs/superpowers/specs/2026-06-05-national-team-player-portraits-design.md`

---

## File Structure

### New files

- `scripts/scrape-player-images.mjs` — orchestrator: load squads → SPARQL → rank → download → process → write manifest.
- `scripts/lib/wikidata.mjs` — SPARQL helpers, rate-limit, in-memory cache.
- `scripts/lib/commons.mjs` — Commons FilePath URL builder, file download, hash.
- `scripts/lib/image-rank.mjs` — pure ranking logic, exported for unit testing.
- `scripts/lib/fallback-svg.mjs` — generate deterministic fallback SVG.
- `scripts/test/image-rank.test.mjs` — Node test runner unit tests for rank logic.
- `public/data/player-images.json` — manifest (generated artifact, committed).
- `public/images/players/.gitkeep` — directory placeholder.
- `src/data/types/playerImage.ts` — `PlayerImage`, `PlayerImageSource` types.
- `src/data/api/playerImages.ts` — fetch + parse `player-images.json`.
- `src/data/queries/usePlayerImages.ts` — TanStack Query hook.
- `src/components/ui/PlayerPortrait.tsx` — main component.
- `src/components/ui/PlayerPortrait.fallback.tsx` — inline SVG fallback render.
- `src/utils/playerImageSize.ts` — size token → pixel mapping (`xs|sm|md|lg|xl`).

### Modified files

- `src/data/types/player.ts` — add optional `image?: PlayerImage`.
- `src/data/types/index.ts` — re-export `PlayerImage`, `PlayerImageSource`.
- `src/data/queries/useSquad.ts` — merge image manifest into returned players.
- `src/pages/TeamPage/components/PlayerCard.tsx` — add portrait above name.
- `src/pages/TeamPage/tabs/StarPlayersTab.tsx` — replace gold gradient with portrait.
- `src/pages/MatchPage/components/SquadColumn.tsx` — prepend xs avatar to each row.
- `package.json` — add `scrape:player-images` script + `sharp` devDep.

---

## Task 1: Add types for PlayerImage

**Files:**
- Create: `src/data/types/playerImage.ts`
- Modify: `src/data/types/player.ts`
- Modify: `src/data/types/index.ts`

- [ ] **Step 1: Create `src/data/types/playerImage.ts`**

```ts
export type PlayerImageSource =
  | 'wikidata-national-team'
  | 'wikidata-tournament'
  | 'wikidata-national-team-training'
  | 'wikidata-portrait'
  | 'manual-override'
  | 'generated-fallback';

export type PlayerImage = {
  /** Path served by Vite, relative to site root, e.g. `/images/players/arg-10-messi.webp`. */
  url: string;
  width: number;
  height: number;
  source: PlayerImageSource;
  /** SHA1 of the original Commons file (32 hex chars). Lets the scraper detect upstream changes. */
  hash: string;
  /** ISO timestamp when this entry was generated. */
  generatedAt: string;
  /** Commons attribution text for credits page. Empty string when source is 'generated-fallback'. */
  attribution: string;
};
```

- [ ] **Step 2: Edit `src/data/types/player.ts` — add optional image field**

Replace the file contents with:

```ts
import type { PlayerImage } from './playerImage';

export type Position = 'GK' | 'DF' | 'MF' | 'FW';

export type Player = {
  id: string;        // `${teamCode}-${jersey}` e.g. `BRA-10`
  teamCode: string;
  jersey: number;
  name: string;
  position: Position;
  club: string;
  age?: number;
  caps?: number;
  goals?: number;
  image?: PlayerImage;
};
```

- [ ] **Step 3: Edit `src/data/types/index.ts` — re-export new types**

Replace:

```ts
export type { Player, Position } from './player';
```

with:

```ts
export type { Player, Position } from './player';
export type { PlayerImage, PlayerImageSource } from './playerImage';
```

- [ ] **Step 4: Typecheck**

Run: `pnpm exec tsc -b --noEmit`
Expected: 0 errors. (Field is optional so no consumers break.)

- [ ] **Step 5: Commit**

```bash
git add src/data/types/playerImage.ts src/data/types/player.ts src/data/types/index.ts
git commit -m "types: add optional PlayerImage on Player"
```

---

## Task 2: Add `sharp` dev dep + npm script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install sharp**

Run: `pnpm add -D sharp`

Expected: `sharp` appears in `devDependencies`.

- [ ] **Step 2: Add scrape script to package.json**

In `package.json` `scripts` block, add after existing `scrape:matches` line:

```json
"scrape:player-images": "node scripts/scrape-player-images.mjs"
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: add sharp for image processing"
```

---

## Task 3: Pure ranking logic + unit tests

Build the ranking function in isolation first so the scraper can rely on tested logic.

**Files:**
- Create: `scripts/lib/image-rank.mjs`
- Create: `scripts/test/image-rank.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `scripts/test/image-rank.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankImageCandidates } from '../lib/image-rank.mjs';

test('prefers national-team image over generic portrait', () => {
  const candidates = [
    { filename: 'Lionel_Messi_2018.jpg', categories: ['Lionel Messi'] },
    { filename: 'Messi_Argentina_national_team_2022.jpg', categories: ['Argentina national football team players'] },
  ];
  const ranked = rankImageCandidates(candidates, { country: 'Argentina', countryAdjective: 'Argentine' });
  assert.equal(ranked[0].filename, 'Messi_Argentina_national_team_2022.jpg');
  assert.equal(ranked[0].source, 'wikidata-national-team');
});

test('detects national team via filename keyword "world cup"', () => {
  const candidates = [
    { filename: 'Mbappe_World_Cup_2022_final.jpg', categories: ['France footballers'] },
  ];
  const ranked = rankImageCandidates(candidates, { country: 'France', countryAdjective: 'French' });
  assert.equal(ranked[0].source, 'wikidata-tournament');
});

test('detects training image when caption mentions training and country', () => {
  const candidates = [
    { filename: 'Vinicius_training_Brazil_2024.jpg', categories: [], caption: 'training session with Brazil' },
  ];
  const ranked = rankImageCandidates(candidates, { country: 'Brazil', countryAdjective: 'Brazilian' });
  assert.equal(ranked[0].source, 'wikidata-national-team-training');
});

test('rejects images that have ONLY club categories', () => {
  const candidates = [
    { filename: 'player.jpg', categories: ['Real Madrid CF players'] },
  ];
  const ranked = rankImageCandidates(candidates, { country: 'Brazil', countryAdjective: 'Brazilian' });
  assert.equal(ranked.length, 0);
});

test('falls back to wikidata-portrait when no national signal', () => {
  const candidates = [
    { filename: 'random_photo.jpg', categories: ['Wikipedia featured pictures'] },
  ];
  const ranked = rankImageCandidates(candidates, { country: 'Spain', countryAdjective: 'Spanish' });
  assert.equal(ranked[0].source, 'wikidata-portrait');
});

test('returns empty array when given empty array', () => {
  assert.deepEqual(rankImageCandidates([], { country: 'X', countryAdjective: 'X' }), []);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/test/image-rank.test.mjs`
Expected: 6 failures with "Cannot find module '../lib/image-rank.mjs'".

- [ ] **Step 3: Implement ranking logic**

Create `scripts/lib/image-rank.mjs`:

```js
// Rank Wikidata image candidates by likelihood of being a national-team photo.
// Pure functions — no I/O. Imported by the scraper and the test suite.

const NATIONAL_TEAM_PATTERNS = [
  /national[\s_-]?team/i,
  /\bcap(s|ped)?\b/i,
];
const TOURNAMENT_PATTERNS = [
  /world[\s_-]?cup/i,
  /\beuro\s?\d{4}/i,
  /copa[\s_-]?america/i,
  /africa[\s_-]?cup/i,
  /asian[\s_-]?cup/i,
];
const TRAINING_PATTERNS = [/training/i, /practice/i];

const CLUB_CATEGORY_PATTERN = /\b(FC|CF|AFC|United|City|Real|Bayern|Athletic|Atletico|club|Liga)\b/i;

function hasAny(text, patterns) {
  return patterns.some((re) => re.test(text));
}

function classifyCandidate(candidate, { country, countryAdjective }) {
  const filename = candidate.filename || '';
  const caption = candidate.caption || '';
  const categories = candidate.categories || [];
  const haystack = `${filename} ${caption} ${categories.join(' ')}`;

  const mentionsCountry =
    new RegExp(`\\b${escapeRe(country)}\\b`, 'i').test(haystack) ||
    new RegExp(`\\b${escapeRe(countryAdjective)}\\b`, 'i').test(haystack);

  const onlyClubCategories =
    categories.length > 0 &&
    categories.every((c) => CLUB_CATEGORY_PATTERN.test(c) && !/national/i.test(c));

  if (onlyClubCategories && !mentionsCountry) return null;

  if (hasAny(haystack, NATIONAL_TEAM_PATTERNS) && mentionsCountry) {
    return 'wikidata-national-team';
  }
  if (hasAny(haystack, TOURNAMENT_PATTERNS)) {
    return 'wikidata-tournament';
  }
  if (hasAny(haystack, TRAINING_PATTERNS) && mentionsCountry) {
    return 'wikidata-national-team-training';
  }
  return 'wikidata-portrait';
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SOURCE_PRIORITY = {
  'wikidata-national-team': 0,
  'wikidata-tournament': 1,
  'wikidata-national-team-training': 2,
  'wikidata-portrait': 3,
};

export function rankImageCandidates(candidates, context) {
  const labeled = [];
  for (const c of candidates) {
    const source = classifyCandidate(c, context);
    if (source === null) continue;
    labeled.push({ ...c, source });
  }
  labeled.sort((a, b) => SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source]);
  return labeled;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/test/image-rank.test.mjs`
Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/image-rank.mjs scripts/test/image-rank.test.mjs
git commit -m "scripts: pure image-rank module + tests"
```

---

## Task 4: Wikidata SPARQL helper

**Files:**
- Create: `scripts/lib/wikidata.mjs`

- [ ] **Step 1: Implement the helper**

Create `scripts/lib/wikidata.mjs`:

```js
// Wikidata SPARQL + entity helpers. Rate-limited and politely User-Agent'd.

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const ENTITY_API = 'https://www.wikidata.org/wiki/Special:EntityData';
const USER_AGENT = 'Matchday/1.0 (https://github.com/ashik-dignizant/matchday; ashik.k@dignizant.com)';
const MIN_DELAY_MS = 1100;

let lastCall = 0;
async function throttle() {
  const wait = MIN_DELAY_MS - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

export async function sparqlQuery(query) {
  await throttle();
  const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' },
  });
  if (res.status === 429) {
    const retry = Number(res.headers.get('retry-after') || 5);
    await new Promise((r) => setTimeout(r, retry * 1000));
    return sparqlQuery(query);
  }
  if (!res.ok) throw new Error(`SPARQL ${res.status}: ${await res.text().catch(() => '')}`);
  const json = await res.json();
  return json.results.bindings;
}

/**
 * Find the QID for a player given name + country (Wikidata country QID).
 * Returns the first match; null if none.
 */
export async function findPlayerQid(name, countryQid) {
  const query = `
    SELECT ?player WHERE {
      ?player wdt:P31 wd:Q5;
              rdfs:label "${escapeSparqlString(name)}"@en;
              wdt:P1532 wd:${countryQid}.
    } LIMIT 1
  `;
  const rows = await sparqlQuery(query);
  if (!rows.length) return null;
  const uri = rows[0].player.value;            // http://www.wikidata.org/entity/Q12345
  return uri.split('/').pop();
}

/**
 * Fetch the full entity JSON for a QID, returning the raw data.
 */
export async function fetchEntity(qid) {
  await throttle();
  const res = await fetch(`${ENTITY_API}/${qid}.json`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Entity ${qid} ${res.status}`);
  const json = await res.json();
  return json.entities[qid];
}

/**
 * Pull all P18 image filenames from an entity.
 */
export function extractImageFilenames(entity) {
  const claims = entity.claims?.P18 ?? [];
  return claims
    .map((c) => c.mainsnak?.datavalue?.value)
    .filter((v) => typeof v === 'string');
}

function escapeSparqlString(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
```

- [ ] **Step 2: Smoke test the helper**

Run:

```bash
node --input-type=module -e "import('./scripts/lib/wikidata.mjs').then(async (m) => { const qid = await m.findPlayerQid('Lionel Messi', 'Q414'); console.log('Messi QID:', qid); })"
```

Expected: prints `Messi QID: Q615` (or another Q-number; just confirm it's a `Q\d+` string).

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/wikidata.mjs
git commit -m "scripts: wikidata SPARQL helper with rate limiting"
```

---

## Task 5: Commons download helper

**Files:**
- Create: `scripts/lib/commons.mjs`

- [ ] **Step 1: Implement**

Create `scripts/lib/commons.mjs`:

```js
// Wikimedia Commons file fetching + metadata.

import { createHash } from 'node:crypto';

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const USER_AGENT = 'Matchday/1.0 (https://github.com/ashik-dignizant/matchday; ashik.k@dignizant.com)';

/**
 * Fetch metadata for a Commons file: categories, caption, attribution.
 */
export async function fetchFileMetadata(filename) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo|categories',
    titles: `File:${filename}`,
    iiprop: 'extmetadata|url|size',
    cllimit: '50',
    origin: '*',
  });
  const res = await fetch(`${COMMONS_API}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`Commons meta ${res.status}`);
  const json = await res.json();
  const pages = json.query?.pages ?? {};
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) return null;
  const info = page.imageinfo?.[0] ?? {};
  const meta = info.extmetadata ?? {};
  return {
    filename,
    categories: (page.categories ?? []).map((c) => c.title.replace(/^Category:/, '')),
    caption: meta.ImageDescription?.value || '',
    attribution: meta.Artist?.value?.replace(/<[^>]+>/g, '').trim() || '',
    width: info.width,
    height: info.height,
  };
}

/**
 * Download a Commons file as a Buffer + return sha1 hash.
 */
export async function downloadFile(filename, { width = 800 } = {}) {
  const url = `${FILEPATH}/${encodeURIComponent(filename)}?width=${width}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Download ${filename} ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const hash = createHash('sha1').update(buf).digest('hex');
  return { buffer: buf, hash };
}
```

- [ ] **Step 2: Smoke test**

Run:

```bash
node --input-type=module -e "import('./scripts/lib/commons.mjs').then(async (m) => { const meta = await m.fetchFileMetadata('Lionel_Messi_20180626.jpg'); console.log(meta?.categories?.slice(0, 3)); })"
```

Expected: prints an array of 3 category names or `undefined` if filename doesn't exist (either result is fine — the call did not throw).

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/commons.mjs
git commit -m "scripts: commons download + metadata helpers"
```

---

## Task 6: Fallback SVG generator

**Files:**
- Create: `scripts/lib/fallback-svg.mjs`
- Create: `scripts/test/fallback-svg.test.mjs`

- [ ] **Step 1: Write failing test**

Create `scripts/test/fallback-svg.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFallbackSvg } from '../lib/fallback-svg.mjs';

test('produces valid SVG with player initials', () => {
  const svg = generateFallbackSvg({
    name: 'Lionel Messi',
    jersey: 10,
    flagColors: ['#74ACDF', '#FFFFFF', '#F6B40E'],
  });
  assert.match(svg, /^<svg [^>]*viewBox="0 0 600 800"/);
  assert.match(svg, /LM/);   // initials
  assert.match(svg, /#10/);  // jersey
  assert.match(svg, /#74ACDF/i);  // primary flag color
});

test('uses first letter of single-name players', () => {
  const svg = generateFallbackSvg({
    name: 'Pelé',
    jersey: 10,
    flagColors: ['#FEDF00', '#009C3B'],
  });
  assert.match(svg, />P</);
});
```

- [ ] **Step 2: Run, verify failure**

Run: `node --test scripts/test/fallback-svg.test.mjs`
Expected: fails — module missing.

- [ ] **Step 3: Implement**

Create `scripts/lib/fallback-svg.mjs`:

```js
// Build a deterministic SVG portrait fallback. Used when no Wikidata image
// is acceptable. 600x800, gradient from first two flag colors, big initials.

function initialsFrom(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function generateFallbackSvg({ name, jersey, flagColors }) {
  const [c1 = '#1a1a1a', c2 = '#3a3a3a'] = flagColors;
  const initials = initialsFrom(name);
  const altName = escapeXml(name);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" role="img" aria-labelledby="t">
  <title id="t">${altName} #${jersey}</title>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="600" height="800" fill="url(#g)"/>
  <text x="300" y="420" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="280" fill="#fff" opacity="0.92">${initials}</text>
  <text x="540" y="80" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="56" fill="#FFD700" font-weight="700">#${jersey}</text>
</svg>`;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `node --test scripts/test/fallback-svg.test.mjs`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/fallback-svg.mjs scripts/test/fallback-svg.test.mjs
git commit -m "scripts: deterministic SVG fallback generator + tests"
```

---

## Task 7: Country QID + adjective lookup table

Wikidata SPARQL needs a country QID (e.g. Argentina = Q414). Squads use ISO codes. Build a map.

**Files:**
- Create: `scripts/lib/country-meta.mjs`

- [ ] **Step 1: Implement**

Create `scripts/lib/country-meta.mjs`:

```js
// Map FIFA team code → Wikidata country QID + country adjective + ISO.
// Used by image scraper to disambiguate name collisions and rank candidates.

export const COUNTRY_META = {
  ARG: { qid: 'Q414', country: 'Argentina', adjective: 'Argentine', iso: 'ar' },
  AUS: { qid: 'Q408', country: 'Australia', adjective: 'Australian', iso: 'au' },
  AUT: { qid: 'Q40',  country: 'Austria',   adjective: 'Austrian',   iso: 'at' },
  BEL: { qid: 'Q31',  country: 'Belgium',   adjective: 'Belgian',    iso: 'be' },
  BIH: { qid: 'Q225', country: 'Bosnia and Herzegovina', adjective: 'Bosnian', iso: 'ba' },
  BRA: { qid: 'Q155', country: 'Brazil',    adjective: 'Brazilian',  iso: 'br' },
  CAN: { qid: 'Q16',  country: 'Canada',    adjective: 'Canadian',   iso: 'ca' },
  CHE: { qid: 'Q39',  country: 'Switzerland', adjective: 'Swiss',    iso: 'ch' },
  CIV: { qid: 'Q1008', country: "Côte d'Ivoire", adjective: 'Ivorian', iso: 'ci' },
  CMR: { qid: 'Q1009', country: 'Cameroon', adjective: 'Cameroonian', iso: 'cm' },
  COL: { qid: 'Q739', country: 'Colombia',  adjective: 'Colombian',  iso: 'co' },
  CPV: { qid: 'Q1011', country: 'Cape Verde', adjective: 'Cape Verdean', iso: 'cv' },
  CRC: { qid: 'Q800', country: 'Costa Rica', adjective: 'Costa Rican', iso: 'cr' },
  CRO: { qid: 'Q224', country: 'Croatia',   adjective: 'Croatian',   iso: 'hr' },
  CUW: { qid: 'Q25279', country: 'Curaçao', adjective: 'Curaçaoan',  iso: 'cw' },
  CZE: { qid: 'Q213', country: 'Czech Republic', adjective: 'Czech', iso: 'cz' },
  DEN: { qid: 'Q35',  country: 'Denmark',   adjective: 'Danish',     iso: 'dk' },
  DRC: { qid: 'Q974', country: 'DR Congo',  adjective: 'Congolese',  iso: 'cd' },
  ECU: { qid: 'Q736', country: 'Ecuador',   adjective: 'Ecuadorian', iso: 'ec' },
  EGY: { qid: 'Q79',  country: 'Egypt',     adjective: 'Egyptian',   iso: 'eg' },
  ENG: { qid: 'Q21',  country: 'England',   adjective: 'English',    iso: 'gb-eng' },
  ESP: { qid: 'Q29',  country: 'Spain',     adjective: 'Spanish',    iso: 'es' },
  FRA: { qid: 'Q142', country: 'France',    adjective: 'French',     iso: 'fr' },
  GER: { qid: 'Q183', country: 'Germany',   adjective: 'German',     iso: 'de' },
  GHA: { qid: 'Q117', country: 'Ghana',     adjective: 'Ghanaian',   iso: 'gh' },
  HAI: { qid: 'Q790', country: 'Haiti',     adjective: 'Haitian',    iso: 'ht' },
  IRN: { qid: 'Q794', country: 'Iran',      adjective: 'Iranian',    iso: 'ir' },
  ITA: { qid: 'Q38',  country: 'Italy',     adjective: 'Italian',    iso: 'it' },
  JPN: { qid: 'Q17',  country: 'Japan',     adjective: 'Japanese',   iso: 'jp' },
  JOR: { qid: 'Q810', country: 'Jordan',    adjective: 'Jordanian',  iso: 'jo' },
  KOR: { qid: 'Q884', country: 'South Korea', adjective: 'South Korean', iso: 'kr' },
  MAR: { qid: 'Q1028', country: 'Morocco',  adjective: 'Moroccan',   iso: 'ma' },
  MEX: { qid: 'Q96',  country: 'Mexico',    adjective: 'Mexican',    iso: 'mx' },
  NED: { qid: 'Q55',  country: 'Netherlands', adjective: 'Dutch',    iso: 'nl' },
  NOR: { qid: 'Q20',  country: 'Norway',    adjective: 'Norwegian',  iso: 'no' },
  NZL: { qid: 'Q664', country: 'New Zealand', adjective: 'New Zealand', iso: 'nz' },
  PAN: { qid: 'Q804', country: 'Panama',    adjective: 'Panamanian', iso: 'pa' },
  PAR: { qid: 'Q733', country: 'Paraguay',  adjective: 'Paraguayan', iso: 'py' },
  POL: { qid: 'Q36',  country: 'Poland',    adjective: 'Polish',     iso: 'pl' },
  POR: { qid: 'Q45',  country: 'Portugal',  adjective: 'Portuguese', iso: 'pt' },
  QAT: { qid: 'Q846', country: 'Qatar',     adjective: 'Qatari',     iso: 'qa' },
  RSA: { qid: 'Q258', country: 'South Africa', adjective: 'South African', iso: 'za' },
  SAU: { qid: 'Q851', country: 'Saudi Arabia', adjective: 'Saudi',   iso: 'sa' },
  SCO: { qid: 'Q22',  country: 'Scotland',  adjective: 'Scottish',   iso: 'gb-sct' },
  SEN: { qid: 'Q1041', country: 'Senegal',  adjective: 'Senegalese', iso: 'sn' },
  SUI: { qid: 'Q39',  country: 'Switzerland', adjective: 'Swiss',    iso: 'ch' },
  SWE: { qid: 'Q34',  country: 'Sweden',    adjective: 'Swedish',    iso: 'se' },
  TUN: { qid: 'Q948', country: 'Tunisia',   adjective: 'Tunisian',   iso: 'tn' },
  TUR: { qid: 'Q43',  country: 'Türkiye',   adjective: 'Turkish',    iso: 'tr' },
  URU: { qid: 'Q77',  country: 'Uruguay',   adjective: 'Uruguayan',  iso: 'uy' },
  USA: { qid: 'Q30',  country: 'United States', adjective: 'American', iso: 'us' },
  UZB: { qid: 'Q265', country: 'Uzbekistan', adjective: 'Uzbek',     iso: 'uz' },
};

export function countryMeta(teamCode) {
  return COUNTRY_META[teamCode] ?? null;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/lib/country-meta.mjs
git commit -m "scripts: country QID + adjective lookup table"
```

---

## Task 8: Scraper orchestrator

Wire together the helpers + ranking + sharp processing.

**Files:**
- Create: `scripts/scrape-player-images.mjs`

- [ ] **Step 1: Write the script**

Create `scripts/scrape-player-images.mjs`:

```js
#!/usr/bin/env node
// Scrape national-team player portraits → public/images/players/ + manifest.
// Usage: pnpm run scrape:player-images [-- --force] [-- --team ARG] [-- --player BRA-10]

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { findPlayerQid, fetchEntity, extractImageFilenames } from './lib/wikidata.mjs';
import { fetchFileMetadata, downloadFile } from './lib/commons.mjs';
import { rankImageCandidates } from './lib/image-rank.mjs';
import { generateFallbackSvg } from './lib/fallback-svg.mjs';
import { countryMeta } from './lib/country-meta.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SQUADS_PATH = resolve(ROOT, 'public', 'data', 'squads.json');
const MANIFEST_PATH = resolve(ROOT, 'public', 'data', 'player-images.json');
const IMG_DIR = resolve(ROOT, 'public', 'images', 'players');

// CLI flags
const argv = process.argv.slice(2);
const flags = {
  force: argv.includes('--force'),
  team: argvValue('--team'),
  player: argvValue('--player'),
};
function argvValue(name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
}

// Minimal flag-color table for fallback SVGs. Loaded inline to avoid TS import.
const FLAG_COLORS = {
  ar: ['#74ACDF', '#FFFFFF', '#F6B40E'],
  br: ['#FEDF00', '#009C3B', '#002776'],
  fr: ['#0055A4', '#FFFFFF', '#EF4135'],
  // ... copy from src/utils/flagColors.ts (keep keyed by ISO code)
};
function flagColorsFor(iso) {
  return FLAG_COLORS[iso] ?? ['#1a1a1a', '#3a3a3a'];
}

function slug(s) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return { generatedAt: new Date().toISOString(), players: {} };
  return JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
}

async function resolveOne(player, country, existing) {
  const id = player.id;
  if (!flags.force && existing.players[id]) return existing.players[id];

  const meta = countryMeta(player.teamCode);
  if (!meta) {
    console.warn(`[skip] no country meta for ${player.teamCode}`);
    return null;
  }

  let chosen = null;
  try {
    const qid = await findPlayerQid(player.name, meta.qid);
    if (qid) {
      const entity = await fetchEntity(qid);
      const filenames = extractImageFilenames(entity);
      const metas = [];
      for (const fn of filenames) {
        const m = await fetchFileMetadata(fn);
        if (m) metas.push(m);
      }
      const ranked = rankImageCandidates(metas, { country: meta.country, countryAdjective: meta.adjective });
      chosen = ranked[0] ?? null;
    }
  } catch (err) {
    console.warn(`[wikidata-fail] ${id} ${player.name}: ${err.message}`);
  }

  const fileSlug = `${meta.iso}-${player.jersey}-${slug(player.name)}`;

  if (chosen) {
    const { buffer, hash } = await downloadFile(chosen.filename, { width: 800 });
    const processed = await sharp(buffer)
      .resize(600, 800, { fit: 'cover', position: 'top' })
      .webp({ quality: 82 })
      .toBuffer();
    const outPath = resolve(IMG_DIR, `${fileSlug}.webp`);
    await writeFile(outPath, processed);
    return {
      url: `/images/players/${fileSlug}.webp`,
      width: 600,
      height: 800,
      source: chosen.source,
      hash,
      generatedAt: new Date().toISOString(),
      attribution: chosen.attribution || '',
    };
  }

  // Fallback SVG
  const svg = generateFallbackSvg({
    name: player.name,
    jersey: player.jersey,
    flagColors: flagColorsFor(meta.iso),
  });
  const outPath = resolve(IMG_DIR, `${fileSlug}.svg`);
  await writeFile(outPath, svg);
  return {
    url: `/images/players/${fileSlug}.svg`,
    width: 600,
    height: 800,
    source: 'generated-fallback',
    hash: '',
    generatedAt: new Date().toISOString(),
    attribution: '',
  };
}

async function main() {
  await mkdir(IMG_DIR, { recursive: true });
  const squads = JSON.parse(await readFile(SQUADS_PATH, 'utf8'));
  const existing = await loadManifest();
  const out = { generatedAt: new Date().toISOString(), players: { ...existing.players } };

  const teamEntries = Object.entries(squads.teams);
  let processed = 0;
  for (const [code, team] of teamEntries) {
    if (flags.team && code !== flags.team) continue;
    for (const player of team.players) {
      if (flags.player && player.id !== flags.player) continue;
      const entry = await resolveOne(player, code, existing);
      if (entry) out.players[player.id] = entry;
      processed++;
      if (processed % 10 === 0) console.log(`[progress] ${processed} players done`);
    }
  }
  await writeFile(MANIFEST_PATH, JSON.stringify(out, null, 2));
  console.log(`[done] ${processed} players, manifest at ${MANIFEST_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Copy full FLAG_COLORS palette into the script**

Open `src/utils/flagColors.ts` and copy the full `FLAG_COLORS` object literal (lines 5–67) into `scripts/scrape-player-images.mjs`, replacing the stub `FLAG_COLORS` constant. The script-side copy is intentional — it avoids a TS→JS bridge for a build-time tool.

Verify keys match by counting: `pnpm exec node -e "const m = require('./scripts/scrape-player-images.mjs'); /* visual check only */"` — actually just open both files side-by-side and confirm all ISO keys are present.

- [ ] **Step 3: Smoke test on one player**

Run: `pnpm run scrape:player-images -- --player ARG-10`

Expected:
- New file at `public/images/players/ar-10-lionel-messi.webp` (or `.svg` if Wikidata lookup failed — either is acceptable for the smoke test).
- `public/data/player-images.json` exists and contains an `ARG-10` entry.
- Console shows `[done] 1 players, manifest at ...`.

- [ ] **Step 4: Smoke test on a single team**

Run: `pnpm run scrape:player-images -- --team ARG`

Expected: 26 entries in manifest under ARG players; 26 files in `public/images/players/` starting with `ar-`.

- [ ] **Step 5: Commit**

```bash
git add scripts/scrape-player-images.mjs
git commit -m "scripts: player image scraper orchestrator"
```

---

## Task 9: Run full scrape

This task runs the scraper across all 48 teams. Expected wall-clock: 30–60 minutes due to rate limiting (1.1s/SPARQL call × 48×26 players ≈ 23 min minimum + image downloads).

**Files:**
- Create (generated): `public/data/player-images.json`
- Create (generated): `public/images/players/*.{webp,svg}`

- [ ] **Step 1: Run full scrape**

Run: `pnpm run scrape:player-images`

Expected:
- Progress logs every 10 players.
- Eventually `[done] ~1248 players, manifest at ...`.
- Disk usage of `public/images/players/` between 20MB and 50MB.

- [ ] **Step 2: Sanity-check the manifest**

Run:

```bash
node --input-type=module -e "import { readFileSync } from 'node:fs'; const m = JSON.parse(readFileSync('public/data/player-images.json','utf8')); const counts = {}; for (const p of Object.values(m.players)) counts[p.source] = (counts[p.source]||0)+1; console.log(counts);"
```

Expected output similar to:

```
{
  'wikidata-national-team': 320,
  'wikidata-tournament': 180,
  'wikidata-portrait': 410,
  'generated-fallback': 338
}
```

Acceptance: at least 50% of entries have a non-fallback `source`. If less, investigate before proceeding (likely a Wikidata query bug — fix Task 4 logic, not this task).

- [ ] **Step 3: Commit generated assets**

```bash
git add public/data/player-images.json public/images/players/
git commit -m "data: scrape national-team player portraits"
```

---

## Task 10: API + query hook for the manifest

**Files:**
- Create: `src/data/api/playerImages.ts`
- Create: `src/data/queries/usePlayerImages.ts`

- [ ] **Step 1: Create API adapter**

Create `src/data/api/playerImages.ts`:

```ts
import type { PlayerImage } from '@/data/types';

export type PlayerImagesPayload = {
  generatedAt: string;
  players: Record<string, PlayerImage>;
};

const SOURCE = '/data/player-images.json';

export const playerImagesApi = {
  all: async (_: void, signal: AbortSignal): Promise<PlayerImagesPayload> => {
    const res = await fetch(SOURCE, { signal });
    if (!res.ok) throw new Error(`player-images.json ${res.status}`);
    return res.json() as Promise<PlayerImagesPayload>;
  },
};
```

- [ ] **Step 2: Create query hook**

Create `src/data/queries/usePlayerImages.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { playerImagesApi, type PlayerImagesPayload } from '@/data/api/playerImages';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function usePlayerImages() {
  return useQuery<PlayerImagesPayload, Error>({
    queryKey: ['player-images'],
    queryFn: ({ signal }) => playerImagesApi.all(undefined, signal!),
    staleTime: TTL_MS,
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc -b --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/api/playerImages.ts src/data/queries/usePlayerImages.ts
git commit -m "data: api + query hook for player-images.json"
```

---

## Task 11: Merge image manifest into `useSquad`

**Files:**
- Modify: `src/data/queries/useSquad.ts`

- [ ] **Step 1: Replace `useSquad.ts` to merge images**

Open `src/data/queries/useSquad.ts`. Replace its full contents with:

```ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { squadsApi, type SquadsPayload } from '@/data/api/squads';
import { usePlayerImages } from './usePlayerImages';
import type { Player } from '@/data/types';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function useSquad(teamCode?: string) {
  const q = useQuery<SquadsPayload, Error>({
    queryKey: ['squads'],
    queryFn: ({ signal }) => squadsApi.all(undefined, signal!),
    staleTime: TTL_MS,
  });
  const images = usePlayerImages();

  const players: Player[] = useMemo(() => {
    if (!teamCode) return [];
    const base = q.data?.teams[teamCode]?.players ?? [];
    const imageMap = images.data?.players ?? {};
    return base.map((p) => {
      const img = imageMap[p.id];
      return img ? { ...p, image: img } : p;
    });
  }, [q.data, images.data, teamCode]);

  return { ...q, players };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc -b --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Smoke test in dev server**

Run: `pnpm run dev`. Open `http://localhost:5173/team/argentina`. Open browser devtools → Network → confirm `player-images.json` is fetched. Console-log temporarily inside `PlayerCard` to confirm `player.image` is populated for ARG players. Remove the console.log before committing.

- [ ] **Step 4: Commit**

```bash
git add src/data/queries/useSquad.ts
git commit -m "data: merge player-images into useSquad result"
```

---

## Task 12: Size token helper

**Files:**
- Create: `src/utils/playerImageSize.ts`

- [ ] **Step 1: Create**

Create `src/utils/playerImageSize.ts`:

```ts
export type PortraitSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const PORTRAIT_PIXELS: Record<PortraitSize, { w: number; h: number }> = {
  xs: { w: 32, h: 32 },
  sm: { w: 64, h: 64 },
  md: { w: 128, h: 171 },
  lg: { w: 240, h: 320 },
  xl: { w: 480, h: 640 },
};

export const PORTRAIT_CLASS: Record<PortraitSize, string> = {
  xs: 'w-8 h-8',
  sm: 'w-16 h-16',
  md: 'w-32 h-[171px]',
  lg: 'w-60 h-80',
  xl: 'w-[480px] h-[640px]',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/playerImageSize.ts
git commit -m "ui: portrait size token helper"
```

---

## Task 13: Inline SVG fallback component

The fallback SVG is generated by the scraper, but if for any reason the file 404s at runtime (e.g. dev mode before scrape), we want an inline component as second-line defense.

**Files:**
- Create: `src/components/ui/PlayerPortrait.fallback.tsx`

- [ ] **Step 1: Create**

Create `src/components/ui/PlayerPortrait.fallback.tsx`:

```tsx
import { flagColors } from '@/utils/flagColors';
import { PORTRAIT_CLASS, type PortraitSize } from '@/utils/playerImageSize';
import type { Player } from '@/data/types';

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function PortraitFallback({
  player,
  size,
  countryCode,
  className,
}: {
  player: Player;
  size: PortraitSize;
  countryCode: string | undefined;
  className?: string;
}) {
  const colors = flagColors(countryCode);
  const c1 = colors[0] ?? '#1a1a1a';
  const c2 = colors[1] ?? '#3a3a3a';
  const initials = initialsFrom(player.name);
  return (
    <div
      role="img"
      aria-label={`${player.name} #${player.jersey}`}
      className={`${PORTRAIT_CLASS[size]} rounded-lg flex items-center justify-center overflow-hidden ${className ?? ''}`}
      style={{ background: `linear-gradient(180deg, ${c1} 0%, ${c2} 100%)` }}
    >
      <span className="font-display text-white/90" style={{ fontSize: size === 'xs' ? 12 : size === 'sm' ? 22 : size === 'md' ? 48 : size === 'lg' ? 96 : 160 }}>
        {initials}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc -b --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PlayerPortrait.fallback.tsx
git commit -m "ui: inline SVG fallback for missing portraits"
```

---

## Task 14: `<PlayerPortrait>` component

**Files:**
- Create: `src/components/ui/PlayerPortrait.tsx`

- [ ] **Step 1: Create**

Create `src/components/ui/PlayerPortrait.tsx`:

```tsx
import { memo, useState } from 'react';
import { PortraitFallback } from './PlayerPortrait.fallback';
import { PORTRAIT_CLASS, type PortraitSize } from '@/utils/playerImageSize';
import type { Player } from '@/data/types';

type Props = {
  player: Player;
  countryCode?: string;
  size?: PortraitSize;
  shape?: 'card' | 'circle';
  loading?: 'lazy' | 'eager';
  showJerseyBadge?: boolean;
  className?: string;
};

function PlayerPortraitInner({
  player,
  countryCode,
  size = 'md',
  shape = 'card',
  loading = 'lazy',
  showJerseyBadge = false,
  className,
}: Props) {
  const [errored, setErrored] = useState(false);
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';
  const wrapperClass = `${PORTRAIT_CLASS[size]} relative overflow-hidden ${shapeClass} ${className ?? ''}`;

  if (!player.image || errored) {
    return <PortraitFallback player={player} size={size} countryCode={countryCode} className={shapeClass} />;
  }

  return (
    <div className={wrapperClass}>
      <img
        src={player.image.url}
        alt={`${player.name}, #${player.jersey}`}
        width={player.image.width}
        height={player.image.height}
        loading={loading}
        decoding="async"
        onError={() => setErrored(true)}
        className="w-full h-full object-cover object-top"
      />
      {showJerseyBadge && (
        <span className="absolute top-1.5 right-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-bg-deep/80 text-gold border border-gold/40">
          #{player.jersey}
        </span>
      )}
    </div>
  );
}

export const PlayerPortrait = memo(PlayerPortraitInner);
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc -b --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PlayerPortrait.tsx
git commit -m "ui: PlayerPortrait component with lazy load + fallback"
```

---

## Task 15: Wire portrait into Squad tab `PlayerCard`

**Files:**
- Modify: `src/pages/TeamPage/components/PlayerCard.tsx`

- [ ] **Step 1: Replace `PlayerCard.tsx`**

Replace the full contents of `src/pages/TeamPage/components/PlayerCard.tsx` with:

```tsx
import type { Player } from '@/data/types';
import { PlayerPortrait } from '@/components/ui/PlayerPortrait';

const POS_COLOR = {
  GK: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
  DF: 'bg-blue-500/20 text-blue-200 border-blue-400/40',
  MF: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  FW: 'bg-orange-500/20 text-orange-200 border-orange-400/40',
} as const;

export function PlayerCard({ player, countryCode }: { player: Player; countryCode?: string }) {
  const posClass = POS_COLOR[player.position];
  return (
    <article className="group relative rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md transition-transform duration-fast hover:scale-[1.02] hover:shadow-card">
      <div className="flex items-start gap-3">
        <PlayerPortrait player={player} countryCode={countryCode} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${posClass}`}>
              {player.position}
            </span>
            <span className="font-display text-2xl text-gold leading-none">#{player.jersey}</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-text truncate" title={player.name}>
            {player.name}
          </h3>
          <p className="text-[11px] text-text-dim truncate" title={player.club}>
            {player.club || 'Club unknown'}
          </p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <dt className="text-text-dim">Age</dt>
          <dd className="text-text">{player.age ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-text-dim">Goals</dt>
          <dd className="text-text">{player.goals ?? '—'}</dd>
        </div>
      </dl>
      <div className="mt-2 max-h-0 group-hover:max-h-12 overflow-hidden transition-[max-height] duration-base text-[11px] text-text-dim">
        Caps: {player.caps ?? '—'}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Add `countryCode` prop to `SquadTab` and pass through**

`SquadTab` currently takes only `squad`. Update its signature to also take `countryCode` and forward to each `PlayerCard`.

Replace the full contents of `src/pages/TeamPage/tabs/SquadTab.tsx` with:

```tsx
import { useMemo, useState } from 'react';
import type { Player, Position } from '@/data/types';
import { PlayerCard } from '../components/PlayerCard';

const POS_FILTERS: Array<'ALL' | Position> = ['ALL', 'GK', 'DF', 'MF', 'FW'];

export function SquadTab({ squad, countryCode }: { squad: Player[]; countryCode?: string }) {
  const [q, setQ] = useState('');
  const [pos, setPos] = useState<'ALL' | Position>('ALL');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return squad.filter((p) => {
      if (pos !== 'ALL' && p.position !== pos) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        (p.club ?? '').toLowerCase().includes(needle)
      );
    });
  }, [squad, q, pos]);

  if (!squad.length) {
    return (
      <div className="text-text-dim">
        Squad not yet scraped. Run <code className="text-gold">pnpm scrape:squads</code>.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or club…"
          className="px-3 py-2 rounded-full bg-bg-elev1 border border-white/8 text-sm text-text placeholder:text-text-muted w-full sm:w-72"
          aria-label="Search players"
        />
        <div role="tablist" aria-label="Filter by position" className="flex gap-1">
          {POS_FILTERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPos(p)}
              aria-pressed={pos === p}
              className={
                'px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.12em] border transition-colors ' +
                (pos === p
                  ? 'bg-gold text-bg-deep border-gold'
                  : 'bg-bg-elev1/40 text-text-dim border-white/10 hover:text-text')
              }
            >
              {p === 'ALL' ? 'All' : p}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-text-dim">No players match those filters.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <PlayerCard key={p.id} player={p} countryCode={countryCode} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2b: Pass `team.countryCode` to `SquadTab` from `TeamPage/index.tsx`**

In `src/pages/TeamPage/index.tsx`, find the line:

```tsx
{tab === 'squad' && <SquadTab squad={squad} />}
```

Replace with:

```tsx
{tab === 'squad' && <SquadTab squad={squad} countryCode={team.countryCode} />}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc -b --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Visual check**

Start dev server: `pnpm run dev`. Open `/team/argentina`. Confirm Squad tab shows player thumbnails next to each card. Confirm no broken-image icons (fallbacks render as gradient initials).

- [ ] **Step 5: Commit**

```bash
git add src/pages/TeamPage/components/PlayerCard.tsx src/pages/TeamPage/tabs/SquadTab.tsx
git commit -m "team-page: portraits on squad-tab PlayerCard"
```

---

## Task 16: Wire portrait into Star Players tab

**Files:**
- Modify: `src/pages/TeamPage/tabs/StarPlayersTab.tsx`

- [ ] **Step 1: Replace the gold-gradient block with `<PlayerPortrait size="xl">`**

Replace the full contents of `src/pages/TeamPage/tabs/StarPlayersTab.tsx` with:

```tsx
import type { Team, Player } from '@/data/types';
import { STAR_PLAYER_JERSEYS } from '../data/starPlayers';
import { PlayerPortrait } from '@/components/ui/PlayerPortrait';

export function StarPlayersTab({ team, squad }: { team: Team; squad: Player[] }) {
  const jerseys = STAR_PLAYER_JERSEYS[team.id] ?? [];
  const picks = jerseys
    .map((j) => squad.find((p) => p.jersey === j))
    .filter((p): p is Player => Boolean(p));

  if (picks.length === 0) {
    return (
      <div className="text-text-dim">
        No star players curated for this team yet, or the squad hasn’t been scraped.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {picks.map((p) => (
        <article
          key={p.id}
          className="rounded-2xl p-5 bg-bg-elev1/40 border border-white/8 backdrop-blur-md"
        >
          <PlayerPortrait
            player={p}
            countryCode={team.countryCode}
            size="xl"
            shape="card"
            showJerseyBadge
            loading="eager"
            className="mx-auto mb-4"
          />
          <h3 className="font-display text-2xl text-text">{p.name}</h3>
          <p className="text-text-dim text-sm">{p.position} · {p.club || 'Club unknown'}</p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <dt className="text-text-dim">Age</dt>
              <dd className="text-text">{p.age ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-dim">Caps</dt>
              <dd className="text-text">{p.caps ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-dim">Goals</dt>
              <dd className="text-text">{p.goals ?? '—'}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc -b --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Visual check**

`pnpm run dev`. Open `/team/argentina` → Star Players tab. Confirm large portraits render (real or fallback).

- [ ] **Step 4: Commit**

```bash
git add src/pages/TeamPage/tabs/StarPlayersTab.tsx
git commit -m "team-page: star players show xl portraits"
```

---

## Task 17: Wire xs avatar into Match Page `SquadColumn`

**Files:**
- Modify: `src/pages/MatchPage/components/SquadColumn.tsx`

- [ ] **Step 1: Update to render xs portrait per row**

Replace the contents of `src/pages/MatchPage/components/SquadColumn.tsx` with:

```tsx
import type { Player } from '@/data/types';
import { PlayerPortrait } from '@/components/ui/PlayerPortrait';

const POS_ORDER = ['GK', 'DF', 'MF', 'FW'] as const;

export function SquadColumn({
  name,
  squad,
  countryCode,
}: {
  name: string;
  squad: Player[];
  countryCode?: string;
}) {
  if (!squad.length) {
    return <div className="text-text-dim text-sm">No squad data for {name}.</div>;
  }
  const withAge = squad.filter((p) => p.age !== undefined);
  const avgAge = withAge.length
    ? withAge.reduce((s, p) => s + (p.age ?? 0), 0) / withAge.length
    : 0;
  const totalGoals = squad.reduce((s, p) => s + (p.goals ?? 0), 0);

  return (
    <section>
      <header className="flex items-baseline justify-between mb-3">
        <h2 className="font-display text-xl text-text">{name}</h2>
        <div className="text-[11px] text-text-dim">
          avg age {avgAge.toFixed(1)} · {totalGoals} intl goals
        </div>
      </header>
      {POS_ORDER.map((pos) => {
        const rows = squad.filter((p) => p.position === pos);
        if (!rows.length) return null;
        return (
          <div key={pos} className="mb-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-text-dim mb-1">
              {pos}
            </div>
            <ul className="space-y-1">
              {rows.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-xs">
                  <PlayerPortrait player={p} countryCode={countryCode} size="xs" shape="circle" />
                  <span className="font-mono text-gold w-6 text-right">#{p.jersey}</span>
                  <span className="text-text truncate flex-1">{p.name}</span>
                  <span className="text-text-dim truncate">{p.club}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 2: Update `SquadCompareTab` to thread `countryCode`**

`SquadCompareTab` currently takes only names + squads. Extend its props with `homeCountryCode` and `awayCountryCode`.

Replace the full contents of `src/pages/MatchPage/tabs/SquadCompareTab.tsx` with:

```tsx
import type { Player } from '@/data/types';
import { SquadColumn } from '../components/SquadColumn';

export function SquadCompareTab({
  homeName,
  awayName,
  squadHome,
  squadAway,
  homeCountryCode,
  awayCountryCode,
}: {
  homeName: string;
  awayName: string;
  squadHome: Player[];
  squadAway: Player[];
  homeCountryCode?: string;
  awayCountryCode?: string;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <SquadColumn name={homeName} squad={squadHome} countryCode={homeCountryCode} />
      <SquadColumn name={awayName} squad={squadAway} countryCode={awayCountryCode} />
    </div>
  );
}
```

- [ ] **Step 2b: Pass country codes from the MatchPage that mounts SquadCompareTab**

In `src/pages/MatchPage/index.tsx` (or wherever `<SquadCompareTab>` is rendered — grep `<SquadCompareTab` if unsure), add `homeCountryCode={match.home.countryCode}` and `awayCountryCode={match.away.countryCode}` to the JSX usage. The `match` object already exposes `home` and `away` `Team` shapes per `src/data/types/match.ts`.

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc -b --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Visual check**

`pnpm run dev`. Open any `/match/<slug>`. Tab to "Squad Compare". Confirm tiny circular avatars next to each player.

- [ ] **Step 5: Commit**

```bash
git add src/pages/MatchPage/components/SquadColumn.tsx src/pages/MatchPage/tabs/SquadCompareTab.tsx
git commit -m "match-page: xs portraits in squad-compare rows"
```

---

## Task 18: Build + lint verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `pnpm exec tsc -b --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Lint**

Run: `pnpm run lint`
Expected: no new errors. (Pre-existing warnings unrelated to this work are OK to leave.)

- [ ] **Step 3: Production build**

Run: `pnpm run build`
Expected: build succeeds. Note the size of `dist/data/player-images.json` and `dist/images/players/` in the output — confirm assets are bundled.

- [ ] **Step 4: Preview**

Run: `pnpm run preview`. Open the URL printed. Click through:
- `/team/argentina` Squad tab → portraits visible
- Star Players tab → big portraits
- `/match/<any-slug>` Squad Compare tab → tiny avatars

No console errors. No 404s in Network tab for `/images/players/*` or `/data/player-images.json`.

- [ ] **Step 5: Commit (only if any incidental fixes were needed)**

If steps 1–4 produced no changes, skip. If incidental fixes were required, commit them as `chore: fix lint/build after portrait wire-up`.

---

## Task 19: Update FEATURES.md to mark P0 #1 as shipped

**Files:**
- Modify: `docs/FEATURES.md`

- [ ] **Step 1: Move the Jersey/Portrait entry**

In `docs/FEATURES.md`, find the section `### 1. Player Jersey Image Pipeline (HD)`. Replace its header line with:

```
### 1. Player Jersey Image Pipeline (HD)  ✅ Shipped (phase 1)
```

Add a one-line note at the end of that section:

```
**Status:** Phase 1 shipped — Wikidata scrape + `<PlayerPortrait>` wired into Squad, Star Players, and Match-page Squad Compare. Phase 2 (player profile route, background removal, manual overrides) deferred.
```

- [ ] **Step 2: Commit**

```bash
git add docs/FEATURES.md
git commit -m "docs: mark portrait pipeline phase 1 as shipped"
```

---

## Out of scope (deferred to phase 2)

These are explicitly NOT in this plan:

- `/player/:slug` profile route.
- Formation pitch view with portrait nodes.
- Background-removal pipeline (`rembg` / `@imgly/background-removal`).
- Manual override file `data/player-overrides.json`.
- Home/Away kit variants.
- Tournament-specific image set.
- AI-generated portraits.
- Click-through from portrait → player profile.
- Hover animations on portraits.
- Credits/attribution `/credits` footer page (data captured in manifest; UI deferred).

---

## Total estimate

- Tasks 1–7 (data layer + helpers): ~3 hours.
- Task 8 (orchestrator): ~1.5 hours.
- Task 9 (full scrape): ~1 hour wall-clock (mostly idle wait).
- Tasks 10–14 (React layer): ~2 hours.
- Tasks 15–17 (wire-ups): ~1 hour.
- Tasks 18–19 (verify + docs): ~30 minutes.

**Total: ~9 hours focused work + ~1 hour idle scrape time.**
