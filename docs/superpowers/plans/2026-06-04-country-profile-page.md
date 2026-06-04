# Country Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `/team/:slug` profile page reachable from any team card, with six animated tabs (Overview, Squad, Statistics, Matches, Tournament Journey, Star Players), powered by `openfootball/worldcup.json` data plus a one-time Wikipedia squad scrape (`public/data/squads.json`).

**Architecture:** New `pages/TeamPage/` tree behind a React Router route. A composite hook `useTeamProfile(slug)` aggregates team + matches + group + bracket + squad. A Puppeteer script mirrors the existing FIFA-ranking pattern to emit squad JSON. UI = glassmorphic, blue stadium theme, Framer Motion for tab transitions + count-ups. Reduced-motion honoured throughout.

**Tech Stack:** React 19, TypeScript strict, React Router v7, TanStack Query v5, Zustand (existing), Tailwind v4, Framer Motion, `lucide-react`, `flag-icons`, Puppeteer (already in devDeps).

**Repo note:** No test runner is configured. Verification is `pnpm tsc -b --noEmit` + `pnpm build` + manual browser checks per task. Each task ends in a commit.

---

## File Structure

**Create:**

- `src/utils/slug.ts` — `toSlug(name)` + `findTeamBySlug(teams, slug)`.
- `src/data/types/player.ts` — `Position`, `Player`.
- `src/data/api/squads.ts` — `squadsApi` reading `/data/squads.json`.
- `src/data/queries/useSquad.ts` — query hook by team code.
- `src/data/queries/useTeamProfile.ts` — composite hook.
- `src/pages/Layout.tsx` — navbar + main + footer shell (shared by routes).
- `src/pages/HomePage.tsx` — current `App.tsx` body extracted.
- `src/pages/TeamPage/index.tsx` — page shell + tab orchestrator.
- `src/pages/TeamPage/TeamHero.tsx`
- `src/pages/TeamPage/TeamTabs.tsx`
- `src/pages/TeamPage/tabs/OverviewTab.tsx`
- `src/pages/TeamPage/tabs/SquadTab.tsx`
- `src/pages/TeamPage/tabs/StatsTab.tsx`
- `src/pages/TeamPage/tabs/MatchesTab.tsx`
- `src/pages/TeamPage/tabs/JourneyTab.tsx`
- `src/pages/TeamPage/tabs/StarPlayersTab.tsx`
- `src/pages/TeamPage/components/FlagWave.tsx`
- `src/pages/TeamPage/components/StatCard.tsx`
- `src/pages/TeamPage/components/RecentForm.tsx`
- `src/pages/TeamPage/components/PlayerCard.tsx`
- `src/pages/TeamPage/components/StatBar.tsx`
- `src/pages/TeamPage/components/CircleProgress.tsx`
- `src/pages/TeamPage/components/MatchTimeline.tsx`
- `src/pages/TeamPage/data/starPlayers.ts`
- `src/pages/TeamPage/data/achievements.ts`
- `scripts/scrape-squads.mjs`
- `public/data/squads.json` (output)

**Modify:**

- `src/App.tsx` — becomes a barrel that re-exports `HomePage` for back-compat with `routes.tsx`.
- `src/app/routes.tsx` — wrap routes with `<Layout>`, add `/team/:slug`.
- `src/components/sections/TeamCarouselCard.tsx` — wrap in `<Link>` to team page.
- `src/components/sections/GroupCard.tsx` — wrap team rows in `<Link>`.
- `src/data/types/index.ts` — re-export `Player`, `Position`.
- `package.json` — add `"scrape:squads": "node scripts/scrape-squads.mjs"`.

---

## Task 1: Slug utilities

**Files:**
- Create: `src/utils/slug.ts`

- [ ] **Step 1: Write the module**

```ts
// src/utils/slug.ts
import type { Team } from '@/data/types';

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function findTeamBySlug(
  teams: readonly Team[] | undefined,
  slug: string,
): Team | undefined {
  if (!teams) return undefined;
  const target = slug.toLowerCase();
  return teams.find((t) => toSlug(t.name) === target);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/slug.ts
git commit -m "utils: toSlug + findTeamBySlug helpers"
```

---

## Task 2: Player type

**Files:**
- Create: `src/data/types/player.ts`
- Modify: `src/data/types/index.ts`

- [ ] **Step 1: Create the type**

```ts
// src/data/types/player.ts
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
};
```

- [ ] **Step 2: Re-export from the barrel**

Read `src/data/types/index.ts`, then append:

```ts
export type { Player, Position } from './player';
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/types/player.ts src/data/types/index.ts
git commit -m "types: add Player + Position"
```

---

## Task 3: Squads adapter + hook

**Files:**
- Create: `src/data/api/squads.ts`
- Create: `src/data/queries/useSquad.ts`

- [ ] **Step 1: Adapter**

```ts
// src/data/api/squads.ts
import type { Player } from '@/data/types';

export type SquadsPayload = {
  scrapedAt: string;
  teams: Record<string, { teamCode: string; players: Player[] }>;
};

const SOURCE = '/data/squads.json';

export const squadsApi = {
  all: async (_: void, signal: AbortSignal): Promise<SquadsPayload> => {
    const res = await fetch(SOURCE, { signal });
    if (!res.ok) throw new Error(`squads.json ${res.status}`);
    return res.json() as Promise<SquadsPayload>;
  },
};
```

- [ ] **Step 2: Hook**

```ts
// src/data/queries/useSquad.ts
import { useQuery } from '@tanstack/react-query';
import { squadsApi, type SquadsPayload } from '@/data/api/squads';
import type { Player } from '@/data/types';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function useSquad(teamCode?: string) {
  const q = useQuery<SquadsPayload, Error>({
    queryKey: ['squads'],
    queryFn: ({ signal }) => squadsApi.all(undefined, signal!),
    staleTime: TTL_MS,
  });
  const players: Player[] =
    teamCode && q.data?.teams[teamCode]?.players
      ? q.data.teams[teamCode]!.players
      : [];
  return { ...q, players };
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/api/squads.ts src/data/queries/useSquad.ts
git commit -m "data: squads adapter + useSquad hook (reads /data/squads.json)"
```

---

## Task 4: Wikipedia squad scraper

**Files:**
- Create: `scripts/scrape-squads.mjs`
- Modify: `package.json`
- Create (output): `public/data/squads.json`

- [ ] **Step 1: Create the script**

```js
// scripts/scrape-squads.mjs
#!/usr/bin/env node
// Scrape WC 2026 squads from Wikipedia → public/data/squads.json
// Usage: pnpm run scrape:squads
import puppeteer from 'puppeteer';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, '..', 'public', 'data', 'squads.json');
const URL = 'https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads';
const WC_TEAMS_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.teams.json';
const NAV_TIMEOUT = 60_000;

const POS_MAP = { GK: 'GK', DF: 'DF', MF: 'MF', FW: 'FW' };

const norm = (s) => (s || '').toLowerCase().trim();

async function fetchWcTeamCodes() {
  const res = await fetch(WC_TEAMS_URL);
  if (!res.ok) throw new Error(`WC teams ${res.status}`);
  const teams = await res.json();
  // name → FIFA 3-letter code
  const map = new Map();
  for (const t of teams) {
    if (!t.name || !t.fifa_code) continue;
    map.set(norm(t.name), t.fifa_code);
    if (t.name_normalised) map.set(norm(t.name_normalised), t.fifa_code);
  }
  return map;
}

function ageFromDob(dobIso) {
  if (!dobIso) return undefined;
  const d = new Date(dobIso);
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

async function scrape() {
  const codes = await fetchWcTeamCodes();
  console.log(`[squads] WC team count: ${codes.size}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(NAV_TIMEOUT);
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    );
    await page.goto(URL, { waitUntil: 'networkidle2' });

    const sections = await page.evaluate(() => {
      // Walk h3 headings → next table.wikitable
      const out = [];
      const headings = Array.from(document.querySelectorAll('h3, h2'));
      for (const h of headings) {
        const name = (h.textContent || '').replace(/\[edit\]/gi, '').trim();
        if (!name) continue;
        let el = h.nextElementSibling;
        let hops = 0;
        while (el && hops < 6 && !(el.matches && el.matches('table.wikitable'))) {
          el = el.nextElementSibling;
          hops++;
        }
        if (!el || !el.matches('table.wikitable')) continue;
        const rows = Array.from(el.querySelectorAll('tbody tr'));
        const players = [];
        for (const tr of rows) {
          const cells = Array.from(tr.querySelectorAll('td'));
          if (cells.length < 5) continue;
          const [noCell, posCell, nameCell, dobCell, capsCell, goalsCell, clubCell] = cells;
          const jersey = parseInt((noCell?.textContent || '').trim(), 10);
          const posRaw = (posCell?.textContent || '').trim().toUpperCase();
          const pos = posRaw.replace(/[^A-Z]/g, '').slice(-2);
          const playerName = (nameCell?.textContent || '').replace(/\s+/g, ' ').trim();
          // DOB anchored in a <span class="bday"> inside the cell
          const bday = dobCell?.querySelector('.bday')?.textContent?.trim() || '';
          const caps = parseInt((capsCell?.textContent || '').replace(/[^\d]/g, ''), 10);
          const goals = parseInt((goalsCell?.textContent || '').replace(/[^\d]/g, ''), 10);
          const club = (clubCell?.textContent || '').replace(/\s+/g, ' ').trim();
          if (!playerName || Number.isNaN(jersey)) continue;
          players.push({
            jersey,
            posRaw: pos,
            name: playerName,
            dob: bday || undefined,
            caps: Number.isNaN(caps) ? undefined : caps,
            goals: Number.isNaN(goals) ? undefined : goals,
            club,
          });
        }
        if (players.length) out.push({ name, players });
      }
      return out;
    });

    console.log(`[squads] parsed ${sections.length} squad sections`);

    const teams = {};
    let matched = 0;
    for (const s of sections) {
      const code = codes.get(norm(s.name));
      if (!code) continue;
      matched++;
      teams[code] = {
        teamCode: code,
        players: s.players.map((p) => ({
          id: `${code}-${p.jersey}`,
          teamCode: code,
          jersey: p.jersey,
          name: p.name,
          position: ['GK', 'DF', 'MF', 'FW'].includes(p.posRaw) ? p.posRaw : 'MF',
          club: p.club,
          age: ageFromDob(p.dob),
          caps: p.caps,
          goals: p.goals,
        })),
      };
    }
    console.log(`[squads] matched ${matched} teams against openfootball codes`);

    const payload = { scrapedAt: new Date().toISOString(), teams };
    await mkdir(dirname(OUTPUT), { recursive: true });
    await writeFile(OUTPUT, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`[squads] wrote ${OUTPUT}`);
  } finally {
    await browser.close();
  }
}

scrape().catch((err) => {
  console.error('[squads] failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Add the script entry**

Edit `package.json` `"scripts"` block — add `"scrape:squads"` next to `"scrape:ranking"`:

```json
"scrape:squads": "node scripts/scrape-squads.mjs"
```

- [ ] **Step 3: Run it once**

Run: `pnpm scrape:squads`
Expected: console prints "wrote …/public/data/squads.json" and the file exists with non-empty `teams` map.

If the script fails (e.g. Wikipedia layout changed, table column order different), capture the error and revisit the selector logic in Step 1. Do not paper over with empty JSON.

- [ ] **Step 4: Commit script + output**

```bash
git add scripts/scrape-squads.mjs package.json public/data/squads.json
git commit -m "data: WC 2026 squads scraper + initial scrape (wikipedia → squads.json)"
```

---

## Task 5: Composite `useTeamProfile`

**Files:**
- Create: `src/data/queries/useTeamProfile.ts`

- [ ] **Step 1: Write the hook**

```ts
// src/data/queries/useTeamProfile.ts
import { useMemo } from 'react';
import { useTeams } from './useTeams';
import { useAllMatches } from './useAllMatches';
import { useGroupStandings } from './useGroupStandings';
import { useBracket } from './useBracket';
import { useSquad } from './useSquad';
import { findTeamBySlug } from '@/utils/slug';
import type { Match, Team, Group, BracketNode, Player } from '@/data/types';

export type TeamProfile = {
  team?: Team;
  matches: Match[];
  group?: Group;
  bracketNodes: BracketNode[];
  squad: Player[];
  isLoading: boolean;
  notFound: boolean;
};

export function useTeamProfile(slug: string): TeamProfile {
  const teams = useTeams();
  const matches = useAllMatches();
  const groups = useGroupStandings();
  const bracket = useBracket();

  const team = findTeamBySlug(teams.data, slug);
  const squad = useSquad(team?.id);

  const teamMatches = useMemo<Match[]>(() => {
    if (!team || !matches.data) return [];
    return matches.data.filter(
      (m) => m.home.teamId === team.name || m.away.teamId === team.name,
    );
  }, [matches.data, team]);

  const group = useMemo<Group | undefined>(() => {
    if (!team || !groups.data) return undefined;
    return groups.data.find((g) =>
      g.standings.some((s) => s.team.id === team.id || s.team.name === team.name),
    );
  }, [groups.data, team]);

  const teamBracket = useMemo<BracketNode[]>(() => {
    if (!team || !bracket.data) return [];
    return bracket.data.filter(
      (n) => n.home.teamId === team.name || n.away.teamId === team.name,
    );
  }, [bracket.data, team]);

  const isLoading =
    teams.isLoading || matches.isLoading || groups.isLoading || bracket.isLoading;
  const notFound = !teams.isLoading && !!teams.data && !team;

  return {
    team,
    matches: teamMatches,
    group,
    bracketNodes: teamBracket,
    squad: squad.players,
    isLoading,
    notFound,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/queries/useTeamProfile.ts
git commit -m "data: useTeamProfile composite hook"
```

---

## Task 6: Extract `Layout` + `HomePage`, refactor routes

**Files:**
- Create: `src/pages/Layout.tsx`
- Create: `src/pages/HomePage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/app/routes.tsx`

- [ ] **Step 1: Create `Layout.tsx`**

```tsx
// src/pages/Layout.tsx
import type { ReactNode } from 'react';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { PitchNavbar } from '@/components/navbar/PitchNavbar';
import { Footer } from '@/components/ui/Footer';
import { HeadTags } from '@/components/seo/HeadTags';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <HeadTags />
      <SkipToContent />
      <PitchNavbar />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Create `HomePage.tsx`**

```tsx
// src/pages/HomePage.tsx
import { HeroGrid } from '@/components/hero/HeroGrid';
import { TodayMatchesSection } from '@/components/sections/TodayMatchesSection';
import { TournamentProgress } from '@/components/sections/TournamentProgress';
import { GroupStandings } from '@/components/sections/GroupStandings';
import { FeaturedTeams } from '@/components/sections/FeaturedTeams';
import { LiveMatchCenter } from '@/components/sections/LiveMatchCenter';
import { RoadToFinal } from '@/components/sections/RoadToFinal';
import { FinalCountdown } from '@/components/sections/FinalCountdown';

export function HomePage() {
  return (
    <>
      <HeroGrid />
      <TodayMatchesSection />
      <TournamentProgress />
      <GroupStandings />
      <FeaturedTeams />
      <LiveMatchCenter />
      <RoadToFinal />
      <FinalCountdown />
    </>
  );
}
```

- [ ] **Step 3: Replace `App.tsx` with a thin barrel**

```tsx
// src/App.tsx
import { HomePage } from '@/pages/HomePage';
import { Layout } from '@/pages/Layout';

export default function App() {
  return (
    <Layout>
      <HomePage />
    </Layout>
  );
}
```

- [ ] **Step 4: Update routes — keep `/` for App; do not add team route yet (will be added in Task 7)**

```tsx
// src/app/routes.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from '@/App';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}
```

(No diff here — included only to confirm the file stays as-is for this task.)

- [ ] **Step 5: Type-check + build**

Run: `npx tsc -b --noEmit`
Run: `npx vite build`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Layout.tsx src/pages/HomePage.tsx src/App.tsx
git commit -m "refactor: extract Layout + HomePage so routes can share chrome"
```

---

## Task 7: Federation palette + Achievements + StarPlayers data

**Files:**
- Create: `src/pages/TeamPage/data/achievements.ts`
- Create: `src/pages/TeamPage/data/starPlayers.ts`

- [ ] **Step 1: Achievements map**

```ts
// src/pages/TeamPage/data/achievements.ts
export const ACHIEVEMENTS: Record<string, string[]> = {
  BRA: ['5-time FIFA World Cup champions (1958, 1962, 1970, 1994, 2002)'],
  GER: ['4-time FIFA World Cup champions (1954, 1974, 1990, 2014)'],
  ITA: ['4-time FIFA World Cup champions (1934, 1938, 1982, 2006)'],
  ARG: ['3-time FIFA World Cup champions (1978, 1986, 2022)'],
  FRA: ['2-time FIFA World Cup champions (1998, 2018)'],
  URU: ['2-time FIFA World Cup champions (1930, 1950)'],
  ENG: ['FIFA World Cup champions 1966'],
  ESP: ['FIFA World Cup champions 2010'],
};
```

- [ ] **Step 2: Star players map**

```ts
// src/pages/TeamPage/data/starPlayers.ts
// Hand-curated 1–3 marquee players per team. Lookup by jersey number.
// If a team's squad scrape changes jerseys, update this map.
export const STAR_PLAYER_JERSEYS: Record<string, number[]> = {
  BRA: [10, 9, 20],
  ARG: [10, 9, 22],
  FRA: [10, 19, 7],
  ENG: [9, 10, 8],
  POR: [7, 9, 8],
  GER: [13, 10, 7],
  ESP: [9, 10, 7],
  NED: [10, 4, 11],
};
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc -b --noEmit`

```bash
git add src/pages/TeamPage/data/achievements.ts src/pages/TeamPage/data/starPlayers.ts
git commit -m "team-page: hand-curated achievements + star-player jersey maps"
```

---

## Task 8: Reusable components — `FlagWave`, `StatCard`

**Files:**
- Create: `src/pages/TeamPage/components/FlagWave.tsx`
- Create: `src/pages/TeamPage/components/StatCard.tsx`

- [ ] **Step 1: FlagWave**

```tsx
// src/pages/TeamPage/components/FlagWave.tsx
import { Flag } from '@/components/ui/Flag';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function FlagWave({ countryCode, label }: { countryCode: string; label: string }) {
  const reduced = useReducedMotion();
  return (
    <div
      className="relative inline-block rounded-md overflow-hidden shadow-card"
      style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))' }}
    >
      <div
        className={reduced ? '' : 'animate-[flag-wave_4s_ease-in-out_infinite]'}
        style={{ transformOrigin: 'left center' }}
      >
        <Flag countryCode={countryCode} size="xl" ariaLabel={label} />
      </div>
      <style>{`
        @keyframes flag-wave {
          0%, 100% { transform: skewX(-2deg) scaleY(1); }
          50%      { transform: skewX(2deg)  scaleY(0.98); }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: StatCard**

```tsx
// src/pages/TeamPage/components/StatCard.tsx
import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | string;
  suffix?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -20% 0px' });
  const reduced = useReducedMotion();
  const isNumber = typeof value === 'number';
  const [display, setDisplay] = useState<number | string>(reduced || !isNumber ? value : 0);

  useEffect(() => {
    if (!isNumber || reduced) {
      setDisplay(value);
      return;
    }
    if (!inView) return;
    const start = performance.now();
    const dur = 800;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - (1 - p) * (1 - p);
      setDisplay(Math.round(eased * (value as number)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, isNumber, reduced, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.4 }}
      className="rounded-2xl p-5 bg-bg-elev1/40 border border-white/8 backdrop-blur-md"
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-text-dim">{label}</div>
      <div className="mt-1 font-display text-3xl text-text">
        {display}
        {suffix}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 3: Type-check + commit**

```bash
git add src/pages/TeamPage/components/FlagWave.tsx src/pages/TeamPage/components/StatCard.tsx
git commit -m "team-page: FlagWave (skewX keyframe) + StatCard (count-up + viewport reveal)"
```

---

## Task 9: Reusable components — `RecentForm`, `StatBar`, `CircleProgress`, `MatchTimeline`, `PlayerCard`

**Files:**
- Create: `src/pages/TeamPage/components/RecentForm.tsx`
- Create: `src/pages/TeamPage/components/StatBar.tsx`
- Create: `src/pages/TeamPage/components/CircleProgress.tsx`
- Create: `src/pages/TeamPage/components/MatchTimeline.tsx`
- Create: `src/pages/TeamPage/components/PlayerCard.tsx`

- [ ] **Step 1: RecentForm**

```tsx
// src/pages/TeamPage/components/RecentForm.tsx
import type { Match } from '@/data/types';
import { Flag } from '@/components/ui/Flag';

export type FormResult = 'W' | 'D' | 'L';

const COLOR: Record<FormResult, string> = {
  W: 'bg-success text-bg-deep',
  D: 'bg-gold text-bg-deep',
  L: 'bg-loss text-text',
};

export function formFromMatch(m: Match, teamName: string): FormResult | null {
  if (m.status !== 'finished' || m.home.score === undefined || m.away.score === undefined) {
    return null;
  }
  const isHome = m.home.teamId === teamName;
  const me = isHome ? m.home.score : m.away.score;
  const them = isHome ? m.away.score : m.home.score;
  if (me > them) return 'W';
  if (me < them) return 'L';
  return 'D';
}

export function RecentForm({ matches, teamName }: { matches: Match[]; teamName: string }) {
  const items = matches
    .filter((m) => m.status === 'finished')
    .slice(-5)
    .map((m) => {
      const r = formFromMatch(m, teamName);
      const opponent = m.home.teamId === teamName ? m.away : m.home;
      return { r, opponent, id: m.id };
    })
    .filter((x): x is { r: FormResult; opponent: Match['home']; id: string } => x.r !== null);

  if (!items.length) return <div className="text-text-dim text-sm">No recent matches.</div>;

  return (
    <ul className="flex items-end gap-3">
      {items.map(({ r, opponent, id }) => (
        <li key={id} className="flex flex-col items-center gap-1">
          <span
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${COLOR[r]}`}
            aria-label={`${r} vs ${opponent.name}`}
          >
            {r}
          </span>
          <Flag countryCode={opponent.countryCode} size="sm" />
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: StatBar**

```tsx
// src/pages/TeamPage/components/StatBar.tsx
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function StatBar({
  label,
  value,
  max,
  tone = 'gold',
}: {
  label: string;
  value: number;
  max: number;
  tone?: 'gold' | 'live' | 'success';
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduced = useReducedMotion();
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const fill =
    tone === 'live' ? 'bg-live' : tone === 'success' ? 'bg-success' : 'bg-gold';

  return (
    <div ref={ref}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-text-dim">{label}</span>
        <span className="font-semibold text-text">{value}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-bg-elev2 overflow-hidden">
        <motion.div
          className={`h-full ${fill}`}
          initial={{ width: 0 }}
          animate={inView || reduced ? { width: `${pct * 100}%` } : { width: 0 }}
          transition={{ duration: reduced ? 0 : 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: CircleProgress**

```tsx
// src/pages/TeamPage/components/CircleProgress.tsx
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function CircleProgress({
  label,
  value, // 0..1
  display,
}: {
  label: string;
  value: number;
  display: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));

  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#142340" strokeWidth="8" />
          <motion.circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#FFD700"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={
              inView || reduced
                ? { strokeDashoffset: c * (1 - pct) }
                : { strokeDashoffset: c }
            }
            transition={{ duration: reduced ? 0 : 0.9, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-display text-xl">
          {display}
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-text-dim">{label}</div>
    </div>
  );
}
```

- [ ] **Step 4: MatchTimeline**

```tsx
// src/pages/TeamPage/components/MatchTimeline.tsx
import { useState } from 'react';
import { Flag } from '@/components/ui/Flag';
import { Pill } from '@/components/ui/Pill';
import type { Match } from '@/data/types';
import { formatDate } from '@/utils/formatDate';

export function MatchTimeline({ matches, teamName }: { matches: Match[]; teamName: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const items = matches.filter((m) => m.status === 'finished').slice(-5);
  if (!items.length) return <div className="text-text-dim text-sm">No previous matches.</div>;

  return (
    <ol className="relative pl-3 border-l border-white/10 space-y-4">
      {items.map((m) => {
        const opp = m.home.teamId === teamName ? m.away : m.home;
        const isOpen = openId === m.id;
        return (
          <li key={m.id} className="relative">
            <span className="absolute -left-[7px] top-2 w-3 h-3 rounded-full bg-gold" />
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : m.id)}
              className="w-full text-left rounded-xl bg-bg-elev1/40 border border-white/8 backdrop-blur-md p-3 flex items-center gap-3 hover:bg-bg-elev1/60 transition-colors"
            >
              <Flag countryCode={opp.countryCode} size="md" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-text truncate">vs {opp.name}</div>
                <div className="text-[11px] text-text-dim">{formatDate(m.kickoff)}</div>
              </div>
              <div className="font-display text-xl text-text">
                {m.home.score}-{m.away.score}
              </div>
            </button>
            {isOpen && (
              <div className="mt-2 rounded-xl bg-bg-elev2/40 border border-white/8 p-3 text-xs text-text-dim space-y-1">
                <div>Stage: {m.stage}</div>
                {m.group && <div>Group: {m.group}</div>}
                <div>Venue: {m.stadium.name}</div>
                <div className="pt-1"><Pill variant="final">FT</Pill></div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 5: PlayerCard**

```tsx
// src/pages/TeamPage/components/PlayerCard.tsx
import type { Player } from '@/data/types';

const POS_COLOR = {
  GK: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
  DF: 'bg-blue-500/20 text-blue-200 border-blue-400/40',
  MF: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  FW: 'bg-orange-500/20 text-orange-200 border-orange-400/40',
} as const;

export function PlayerCard({ player }: { player: Player }) {
  const posClass = POS_COLOR[player.position];
  return (
    <article className="group relative rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md transition-transform duration-fast hover:scale-[1.02] hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${posClass}`}>
          {player.position}
        </span>
        <span className="font-display text-2xl text-gold leading-none">#{player.jersey}</span>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-text truncate" title={player.name}>
        {player.name}
      </h3>
      <p className="text-[11px] text-text-dim truncate" title={player.club}>
        {player.club || 'Club unknown'}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
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

- [ ] **Step 6: Type-check + commit**

```bash
git add src/pages/TeamPage/components/RecentForm.tsx src/pages/TeamPage/components/StatBar.tsx src/pages/TeamPage/components/CircleProgress.tsx src/pages/TeamPage/components/MatchTimeline.tsx src/pages/TeamPage/components/PlayerCard.tsx
git commit -m "team-page: RecentForm, StatBar, CircleProgress, MatchTimeline, PlayerCard"
```

---

## Task 10: `TeamHero`

**Files:**
- Create: `src/pages/TeamPage/TeamHero.tsx`

- [ ] **Step 1: Implementation**

```tsx
// src/pages/TeamPage/TeamHero.tsx
import type { Team, Match, Group } from '@/data/types';
import { FlagWave } from './components/FlagWave';
import { StatCard } from './components/StatCard';
import { formFromMatch } from './components/RecentForm';

const FED_COLOR: Record<Team['federation'], { bg: string; border: string; text: string }> = {
  UEFA:     { bg: 'rgba(59,130,246,0.2)',  border: 'rgba(59,130,246,0.6)',  text: '#BFDBFE' },
  CONMEBOL: { bg: 'rgba(251,191,36,0.2)',  border: 'rgba(251,191,36,0.6)',  text: '#FEF3C7' },
  AFC:      { bg: 'rgba(16,185,129,0.2)',  border: 'rgba(16,185,129,0.6)',  text: '#D1FAE5' },
  CAF:      { bg: 'rgba(249,115,22,0.2)',  border: 'rgba(249,115,22,0.6)',  text: '#FED7AA' },
  CONCACAF: { bg: 'rgba(168,85,247,0.2)',  border: 'rgba(168,85,247,0.6)',  text: '#E9D5FF' },
  OFC:      { bg: 'rgba(6,182,212,0.2)',   border: 'rgba(6,182,212,0.6)',   text: '#CFFAFE' },
};

type Props = {
  team: Team;
  matches: Match[];
  group?: Group;
};

export function TeamHero({ team, matches, group }: Props) {
  const fed = FED_COLOR[team.federation];

  const finished = matches.filter((m) => m.status === 'finished');
  const played = finished.length;
  let wins = 0;
  let goalsFor = 0;
  let cleanSheets = 0;
  for (const m of finished) {
    const r = formFromMatch(m, team.name);
    if (r === 'W') wins++;
    const isHome = m.home.teamId === team.name;
    const me = (isHome ? m.home.score : m.away.score) ?? 0;
    const them = (isHome ? m.away.score : m.home.score) ?? 0;
    goalsFor += me;
    if (them === 0) cleanSheets++;
  }

  let groupPosition = '—';
  if (group) {
    const idx = group.standings.findIndex(
      (s) => s.team.id === team.id || s.team.name === team.name,
    );
    if (idx >= 0) {
      const ord = ['1st', '2nd', '3rd', '4th'][idx] ?? `${idx + 1}th`;
      groupPosition = `${ord} of ${group.standings.length}`;
    }
  }

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 30% at 50% 0%, rgba(255,215,0,0.08), transparent 70%),' +
            'linear-gradient(180deg, #0A1428 0%, #0F1A2E 60%, #0B1E45 100%)',
        }}
      />
      <div className="relative max-w-container mx-auto px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center">
          <FlagWave countryCode={team.countryCode} label={team.name} />
          <div>
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] border"
              style={{ background: fed.bg, borderColor: fed.border, color: fed.text }}
            >
              {team.federation}
            </span>
            <h1 className="mt-3 font-display text-5xl md:text-hero text-text leading-none">
              {team.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] bg-gold text-bg-deep">
                FIFA World Cup 2026
              </span>
              {team.group && (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] bg-bg-elev2 text-text-dim">
                  Group {team.group}
                </span>
              )}
            </div>
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-text-dim">FIFA Rank</div>
              <div className="font-display text-4xl text-gold">
                {team.fifaRank ? `#${team.fifaRank}` : '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <StatCard label="Matches Played" value={played} />
          <StatCard label="Wins" value={wins} />
          <StatCard label="Goals Scored" value={goalsFor} />
          <StatCard label="Clean Sheets" value={cleanSheets} />
          <StatCard label="Group Position" value={groupPosition} />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
git add src/pages/TeamPage/TeamHero.tsx
git commit -m "team-page: TeamHero with flag wave, federation chip, 5 stat cards"
```

---

## Task 11: `TeamTabs`

**Files:**
- Create: `src/pages/TeamPage/TeamTabs.tsx`

- [ ] **Step 1: Implementation**

```tsx
// src/pages/TeamPage/TeamTabs.tsx
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

export type TabKey =
  | 'overview'
  | 'squad'
  | 'stats'
  | 'matches'
  | 'journey'
  | 'stars';

export const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'squad', label: 'Squad' },
  { key: 'stats', label: 'Statistics' },
  { key: 'matches', label: 'Matches' },
  { key: 'journey', label: 'Tournament Journey' },
  { key: 'stars', label: 'Star Players' },
];

export function TeamTabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Team profile sections"
      className="sticky top-[88px] lg:top-[140px] z-20 -mx-6 px-6 lg:-mx-8 lg:px-8 bg-bg/80 backdrop-blur-md border-b border-white/8"
    >
      <div className="max-w-container mx-auto flex gap-1 overflow-x-auto no-scrollbar py-2">
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${t.key}`}
              id={`tab-${t.key}`}
              onClick={() => onChange(t.key)}
              className={cn(
                'relative px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] whitespace-nowrap transition-colors',
                isActive ? 'text-text' : 'text-text-dim hover:text-text',
              )}
            >
              {t.label}
              {isActive && (
                <motion.span
                  layoutId="team-tab-underline"
                  className="absolute left-2 right-2 -bottom-0.5 h-0.5 bg-gold rounded-full"
                  transition={{ duration: 0.25 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
git add src/pages/TeamPage/TeamTabs.tsx
git commit -m "team-page: TeamTabs sticky animated tab bar (layoutId underline)"
```

---

## Task 12: Tab content — Overview

**Files:**
- Create: `src/pages/TeamPage/tabs/OverviewTab.tsx`

- [ ] **Step 1: Implementation**

```tsx
// src/pages/TeamPage/tabs/OverviewTab.tsx
import type { Team, Match } from '@/data/types';
import { RecentForm, formFromMatch } from '../components/RecentForm';
import { StatBar } from '../components/StatBar';
import { ACHIEVEMENTS } from '../data/achievements';

export function OverviewTab({ team, matches }: { team: Team; matches: Match[] }) {
  const finished = matches.filter((m) => m.status === 'finished');
  let w = 0;
  let d = 0;
  let l = 0;
  let gf = 0;
  let ga = 0;
  for (const m of finished) {
    const r = formFromMatch(m, team.name);
    if (r === 'W') w++;
    else if (r === 'D') d++;
    else if (r === 'L') l++;
    const isHome = m.home.teamId === team.name;
    gf += (isHome ? m.home.score : m.away.score) ?? 0;
    ga += (isHome ? m.away.score : m.home.score) ?? 0;
  }
  const playedMax = Math.max(1, w + d + l);
  const achievements = ACHIEVEMENTS[team.id] ?? [];

  return (
    <div className="space-y-8">
      <p className="text-text-dim max-w-2xl">
        {team.name} represent {team.federation} at the FIFA World Cup 2026.
        {team.fifaRank ? ` They sit at FIFA rank #${team.fifaRank}.` : ''}
        {team.group ? ` They are placed in Group ${team.group}.` : ''}
      </p>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Qualification</h2>
        <p className="text-text">Qualified via {team.federation} qualifiers.</p>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Tournament performance</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 max-w-xl">
          <StatBar label="Wins" value={w} max={playedMax} tone="success" />
          <StatBar label="Draws" value={d} max={playedMax} tone="gold" />
          <StatBar label="Losses" value={l} max={playedMax} tone="live" />
          <StatBar label="Goals for" value={gf} max={Math.max(1, gf + ga)} tone="gold" />
          <StatBar label="Goals against" value={ga} max={Math.max(1, gf + ga)} tone="live" />
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Recent form</h2>
        <RecentForm matches={matches} teamName={team.name} />
      </section>

      {achievements.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Key achievements</h2>
          <ul className="list-disc list-inside text-text space-y-1">
            {achievements.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
git add src/pages/TeamPage/tabs/OverviewTab.tsx
git commit -m "team-page: OverviewTab — summary, qualification, performance, form, achievements"
```

---

## Task 13: Tab content — Squad

**Files:**
- Create: `src/pages/TeamPage/tabs/SquadTab.tsx`

- [ ] **Step 1: Implementation**

```tsx
// src/pages/TeamPage/tabs/SquadTab.tsx
import { useMemo, useState } from 'react';
import type { Player, Position } from '@/data/types';
import { PlayerCard } from '../components/PlayerCard';

const POS_FILTERS: Array<'ALL' | Position> = ['ALL', 'GK', 'DF', 'MF', 'FW'];

export function SquadTab({ squad }: { squad: Player[] }) {
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
            <PlayerCard key={p.id} player={p} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
git add src/pages/TeamPage/tabs/SquadTab.tsx
git commit -m "team-page: SquadTab with search + position filter"
```

---

## Task 14: Tab content — Statistics

**Files:**
- Create: `src/pages/TeamPage/tabs/StatsTab.tsx`

- [ ] **Step 1: Implementation**

```tsx
// src/pages/TeamPage/tabs/StatsTab.tsx
import type { Team, Match, Group } from '@/data/types';
import { CircleProgress } from '../components/CircleProgress';
import { StatBar } from '../components/StatBar';
import { formFromMatch } from '../components/RecentForm';

function pct(n: number, d: number): string {
  if (d <= 0) return '0%';
  return `${Math.round((n / d) * 100)}%`;
}

export function StatsTab({
  team,
  matches,
  group,
}: {
  team: Team;
  matches: Match[];
  group?: Group;
}) {
  const finished = matches.filter((m) => m.status === 'finished');
  const last10 = finished.slice(-10);
  let w = 0;
  let drw = 0;
  let l = 0;
  let cleanSheets = 0;
  for (const m of finished) {
    const r = formFromMatch(m, team.name);
    if (r === 'W') w++;
    else if (r === 'D') drw++;
    else if (r === 'L') l++;
    const isHome = m.home.teamId === team.name;
    const them = (isHome ? m.away.score : m.home.score) ?? 0;
    if (them === 0) cleanSheets++;
  }
  const total = w + drw + l;
  const cleanRate = total > 0 ? cleanSheets / total : 0;
  const avgFor =
    total > 0
      ? finished.reduce((acc, m) => {
          const isHome = m.home.teamId === team.name;
          return acc + ((isHome ? m.home.score : m.away.score) ?? 0);
        }, 0) / total
      : 0;

  const groupAvg =
    group && group.standings.length
      ? group.standings.reduce((acc, s) => acc + s.gf, 0) /
        group.standings.reduce((acc, s) => acc + Math.max(1, s.played), 0)
      : 0;
  const cmpMax = Math.max(avgFor, groupAvg, 0.01);

  return (
    <div className="space-y-10">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CircleProgress label="Win %" value={total ? w / total : 0} display={pct(w, total)} />
        <CircleProgress label="Draw %" value={total ? drw / total : 0} display={pct(drw, total)} />
        <CircleProgress label="Loss %" value={total ? l / total : 0} display={pct(l, total)} />
        <CircleProgress label="Clean sheet %" value={cleanRate} display={pct(cleanSheets, total)} />
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Goals scored (last {last10.length})</h2>
        <div className="space-y-2 max-w-xl">
          {last10.map((m, i) => {
            const opp = m.home.teamId === team.name ? m.away : m.home;
            const isHome = m.home.teamId === team.name;
            const me = (isHome ? m.home.score : m.away.score) ?? 0;
            return (
              <StatBar
                key={m.id + i}
                label={`vs ${opp.name}`}
                value={me}
                max={Math.max(5, me)}
                tone="success"
              />
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Goals conceded (last {last10.length})</h2>
        <div className="space-y-2 max-w-xl">
          {last10.map((m, i) => {
            const opp = m.home.teamId === team.name ? m.away : m.home;
            const isHome = m.home.teamId === team.name;
            const them = (isHome ? m.away.score : m.home.score) ?? 0;
            return (
              <StatBar
                key={m.id + i + '-ga'}
                label={`vs ${opp.name}`}
                value={them}
                max={Math.max(5, them)}
                tone="live"
              />
            );
          })}
        </div>
      </section>

      {group && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">vs Group average (goals per match)</h2>
          <div className="space-y-2 max-w-xl">
            <StatBar label={team.name} value={Number(avgFor.toFixed(2))} max={cmpMax} tone="gold" />
            <StatBar label={`Group ${group.letter} avg`} value={Number(groupAvg.toFixed(2))} max={cmpMax} />
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
git add src/pages/TeamPage/tabs/StatsTab.tsx
git commit -m "team-page: StatsTab with rings, bars, group comparison"
```

---

## Task 15: Tab content — Matches

**Files:**
- Create: `src/pages/TeamPage/tabs/MatchesTab.tsx`

- [ ] **Step 1: Implementation**

```tsx
// src/pages/TeamPage/tabs/MatchesTab.tsx
import type { Team, Match } from '@/data/types';
import { MatchTimeline } from '../components/MatchTimeline';
import { Flag } from '@/components/ui/Flag';
import { formatDate } from '@/utils/formatDate';

export function MatchesTab({ team, matches }: { team: Team; matches: Match[] }) {
  const upcoming = matches.filter((m) => m.status === 'scheduled');

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Last 5</h2>
        <MatchTimeline matches={matches} teamName={team.name} />
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="text-text-dim">No upcoming fixtures.</div>
        ) : (
          <ul className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
            {upcoming.map((m) => {
              const opp = m.home.teamId === team.name ? m.away : m.home;
              return (
                <li
                  key={m.id}
                  className="shrink-0 w-64 rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md"
                >
                  <div className="flex items-center gap-2">
                    <Flag countryCode={opp.countryCode} size="md" />
                    <div>
                      <div className="text-sm font-semibold text-text truncate">vs {opp.name}</div>
                      <div className="text-[11px] text-text-dim">{formatDate(m.kickoff)}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-text-dim">{m.stadium.name}</div>
                  <div className="text-[11px] text-text-dim">{m.stage}</div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
git add src/pages/TeamPage/tabs/MatchesTab.tsx
git commit -m "team-page: MatchesTab with last 5 timeline + upcoming carousel"
```

---

## Task 16: Tab content — Tournament Journey

**Files:**
- Create: `src/pages/TeamPage/tabs/JourneyTab.tsx`

- [ ] **Step 1: Implementation**

```tsx
// src/pages/TeamPage/tabs/JourneyTab.tsx
import type { Team, Match, BracketNode, Group } from '@/data/types';
import { formFromMatch } from '../components/RecentForm';

const KO_ORDER: Array<{ label: string; round: BracketNode['round'] }> = [
  { label: 'Round of 32', round: 'R32' },
  { label: 'Round of 16', round: 'R16' },
  { label: 'Quarter-final', round: 'QF' },
  { label: 'Semi-final', round: 'SF' },
  { label: 'Final', round: 'F' },
];

export function JourneyTab({
  team,
  matches,
  group,
  bracketNodes,
}: {
  team: Team;
  matches: Match[];
  group?: Group;
  bracketNodes: BracketNode[];
}) {
  const groupMatches = matches.filter((m) => m.group);
  let gf = 0;
  let ga = 0;
  let groupOutcome: 'qualified' | 'eliminated' | 'pending' = 'pending';
  if (groupMatches.length && groupMatches.every((m) => m.status === 'finished')) {
    for (const m of groupMatches) {
      const isHome = m.home.teamId === team.name;
      gf += (isHome ? m.home.score : m.away.score) ?? 0;
      ga += (isHome ? m.away.score : m.home.score) ?? 0;
    }
    const standing = group?.standings.findIndex(
      (s) => s.team.id === team.id || s.team.name === team.name,
    );
    groupOutcome = standing !== undefined && standing >= 0 && standing < 2 ? 'qualified' : 'eliminated';
  }

  const rows = KO_ORDER.map(({ label, round }) => {
    const node = bracketNodes.find((n) => n.round === round);
    if (!node) return { label, round, status: 'pending' as const };
    const isHome = node.home.teamId === team.name;
    const opp = isHome ? node.away : node.home;
    const matchForNode = matches.find((m) => m.id === node.matchId);
    let status: 'won' | 'lost' | 'pending' = 'pending';
    let scoreLine: string | undefined;
    if (matchForNode && matchForNode.status === 'finished') {
      const r = formFromMatch(matchForNode, team.name);
      status = r === 'W' ? 'won' : 'lost';
      scoreLine = `${matchForNode.home.score}-${matchForNode.away.score}`;
    }
    return { label, round, status, opp: opp.name, scoreLine };
  });

  const dotColor = (status: 'won' | 'lost' | 'pending' | 'qualified' | 'eliminated') => {
    if (status === 'won' || status === 'qualified') return 'bg-success';
    if (status === 'lost' || status === 'eliminated') return 'bg-loss';
    return 'bg-text-muted';
  };

  return (
    <ol className="relative pl-6 border-l border-white/10 space-y-6">
      <li className="relative">
        <span className={`absolute -left-[10px] top-1 w-4 h-4 rounded-full ${dotColor(groupOutcome)}`} />
        <div className="text-sm font-semibold text-text">Group Stage{group ? ` — Group ${group.letter}` : ''}</div>
        <div className="text-xs text-text-dim mt-1">
          {groupOutcome === 'pending'
            ? 'In progress'
            : `${groupOutcome === 'qualified' ? 'Qualified' : 'Eliminated'} · GF ${gf} · GA ${ga}`}
        </div>
      </li>
      {rows.map((r) => (
        <li key={r.round} className="relative">
          <span className={`absolute -left-[10px] top-1 w-4 h-4 rounded-full ${dotColor(r.status)}`} />
          <div className="text-sm font-semibold text-text">{r.label}</div>
          <div className="text-xs text-text-dim mt-1">
            {r.status === 'pending'
              ? 'Not played'
              : `vs ${'opp' in r ? r.opp : ''}${r.scoreLine ? ` · ${r.scoreLine}` : ''}`}
          </div>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
git add src/pages/TeamPage/tabs/JourneyTab.tsx
git commit -m "team-page: JourneyTab vertical timeline (group + knockout stages)"
```

---

## Task 17: Tab content — Star Players

**Files:**
- Create: `src/pages/TeamPage/tabs/StarPlayersTab.tsx`

- [ ] **Step 1: Implementation**

```tsx
// src/pages/TeamPage/tabs/StarPlayersTab.tsx
import type { Team, Player } from '@/data/types';
import { STAR_PLAYER_JERSEYS } from '../data/starPlayers';

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
          <div
            className="aspect-[3/4] w-full rounded-xl mb-4 flex items-center justify-center font-display text-7xl text-bg-deep relative overflow-hidden"
            style={{
              background:
                'linear-gradient(160deg, #FFD700 0%, #D4A017 60%, #8a6708 100%)',
            }}
            aria-hidden
          >
            <span className="relative z-10">{p.jersey}</span>
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.4), transparent 60%)',
              }}
            />
          </div>
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

- [ ] **Step 2: Type-check + commit**

```bash
git add src/pages/TeamPage/tabs/StarPlayersTab.tsx
git commit -m "team-page: StarPlayersTab with gold portrait placeholder + stat grid"
```

---

## Task 18: `TeamPage` shell + tab routing via URL hash

**Files:**
- Create: `src/pages/TeamPage/index.tsx`

- [ ] **Step 1: Implementation**

```tsx
// src/pages/TeamPage/index.tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTeamProfile } from '@/data/queries/useTeamProfile';
import { TeamHero } from './TeamHero';
import { TeamTabs, type TabKey, TABS } from './TeamTabs';
import { OverviewTab } from './tabs/OverviewTab';
import { SquadTab } from './tabs/SquadTab';
import { StatsTab } from './tabs/StatsTab';
import { MatchesTab } from './tabs/MatchesTab';
import { JourneyTab } from './tabs/JourneyTab';
import { StarPlayersTab } from './tabs/StarPlayersTab';
import { Skeleton } from '@/components/ui/Skeleton';

function parseHash(): TabKey {
  if (typeof window === 'undefined') return 'overview';
  const h = window.location.hash.replace('#', '') as TabKey;
  return TABS.some((t) => t.key === h) ? h : 'overview';
}

export default function TeamPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const profile = useTeamProfile(slug);
  const [tab, setTab] = useState<TabKey>(() => parseHash());

  useEffect(() => {
    const onHash = () => setTab(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const onChangeTab = (k: TabKey) => {
    setTab(k);
    window.history.replaceState(null, '', `#${k}`);
  };

  if (profile.isLoading) {
    return (
      <div className="max-w-container mx-auto px-6 lg:px-8 py-12 space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-10" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (profile.notFound || !profile.team) {
    return (
      <div className="max-w-container mx-auto px-6 lg:px-8 py-24 text-center space-y-4">
        <h1 className="font-display text-3xl text-text">Team not found</h1>
        <p className="text-text-dim">No World Cup team matches “{slug}”.</p>
        <Link to="/" className="inline-block mt-4 px-4 py-2 rounded-full bg-gold text-bg-deep font-semibold">
          Back home
        </Link>
      </div>
    );
  }

  const { team, matches, group, bracketNodes, squad } = profile;

  return (
    <>
      <TeamHero team={team} matches={matches} group={group} />
      <TeamTabs active={tab} onChange={onChangeTab} />
      <div className="max-w-container mx-auto px-6 lg:px-8 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            id={`panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'overview' && <OverviewTab team={team} matches={matches} />}
            {tab === 'squad' && <SquadTab squad={squad} />}
            {tab === 'stats' && <StatsTab team={team} matches={matches} group={group} />}
            {tab === 'matches' && <MatchesTab team={team} matches={matches} />}
            {tab === 'journey' && (
              <JourneyTab
                team={team}
                matches={matches}
                group={group}
                bracketNodes={bracketNodes}
              />
            )}
            {tab === 'stars' && <StarPlayersTab team={team} squad={squad} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
git add src/pages/TeamPage/index.tsx
git commit -m "team-page: page shell with hash-driven tab routing + skeleton/notFound states"
```

---

## Task 19: Mount route + Layout wrapper

**Files:**
- Modify: `src/app/routes.tsx`

- [ ] **Step 1: Wire the new route**

```tsx
// src/app/routes.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from '@/App';
import TeamPage from '@/pages/TeamPage';
import { Layout } from '@/pages/Layout';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route
          path="/team/:slug"
          element={
            <Layout>
              <TeamPage />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Type-check + build**

Run: `npx tsc -b --noEmit`
Run: `npx vite build`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/routes.tsx
git commit -m "routes: add /team/:slug behind shared Layout"
```

---

## Task 20: Link team cards on home to the new page

**Files:**
- Modify: `src/components/sections/TeamCarouselCard.tsx`
- Modify: `src/components/sections/GroupCard.tsx`

- [ ] **Step 1: Read both files**

Run: open `src/components/sections/TeamCarouselCard.tsx` and `src/components/sections/GroupCard.tsx`. Identify the outermost clickable team element and the team-name source.

- [ ] **Step 2: Wrap team rows in `<Link>`**

For `TeamCarouselCard.tsx`, replace the outer container with a `<Link>` from `react-router-dom`:

```tsx
import { Link } from 'react-router-dom';
import { toSlug } from '@/utils/slug';

// Inside the component (replace the outer wrapper):
return (
  <Link
    to={`/team/${toSlug(team.name)}`}
    className="block shrink-0 rounded-2xl …existing classes…"
  >
    {/* …existing card contents… */}
  </Link>
);
```

For `GroupCard.tsx`, do the same around each team row inside the standings table. If the row is a `<tr>`, wrap the team-name `<td>` content (not the `<tr>` itself — Link inside `<tr>` is invalid markup) and make it `inline-flex` so the layout is unchanged.

- [ ] **Step 3: Type-check + build**

Run: `npx tsc -b --noEmit`
Run: `npx vite build`
Expected: both pass.

- [ ] **Step 4: Manual smoke — `pnpm dev`**

- Open the landing page.
- Click a team in the Featured Teams carousel → navigates to `/team/<slug>`, profile page renders.
- Click a team name in a Group standings card → same.
- Back button returns home.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/TeamCarouselCard.tsx src/components/sections/GroupCard.tsx
git commit -m "home: link team carousel cards + group rows to /team/:slug"
```

---

## Task 21: Manual end-to-end verification

**Files:** none — runtime checks only.

- [ ] **Step 1: Start dev server**

Run: `pnpm dev` and open the URL in a browser.

- [ ] **Step 2: Direct URL load**

Navigate to `/team/brazil`. Expected:
- Hero renders with Brazil flag (subtle wave), team name, CONMEBOL chip (yellow tint), FIFA 2026 badge, group chip, FIFA rank big number.
- 5 stat cards count up from 0 to their values on viewport enter.

- [ ] **Step 3: Tabs**

- Click each of the 6 tabs. Underline animates between tabs.
- URL hash updates to `#squad`, `#stats`, etc.
- Reload `/team/brazil#squad` → page lands on Squad tab.

- [ ] **Step 4: Squad tab**

- Search filters by name + club.
- Position chips filter (All / GK / DF / MF / FW).
- Hover on a card → scale + caps line appears.

- [ ] **Step 5: Stats tab**

- Four circular rings animate.
- Per-match bars draw left-to-right on viewport enter.
- Comparison strip shows team vs group avg.

- [ ] **Step 6: Matches tab**

- Last 5 timeline renders. Click a node expands details inline.
- Upcoming carousel drag-scrolls horizontally on touch / drag.

- [ ] **Step 7: Journey tab**

- Group Stage row coloured by qualified/eliminated/pending.
- Knockout rows show only those the team participated in.

- [ ] **Step 8: Star Players tab**

- For Brazil/Argentina/etc. with `STAR_PLAYER_JERSEYS` entries, 1–3 portrait cards render with jersey number as the visual.
- For uncurated teams: "No star players curated …" message.

- [ ] **Step 9: Unknown slug**

Navigate to `/team/xyz`. Expected: "Team not found" message + Back home button.

- [ ] **Step 10: Reduced motion**

Toggle OS reduced motion preference → flag is still, no count-up, no underline tween, fades are instant.

- [ ] **Step 11: Mobile**

Resize to ≤640 px. Expected: hero stacks, stat grid 2 cols, tab bar horizontal-scrolls, all interactions still work.

- [ ] **Step 12: No regressions on home**

- Landing page still renders correctly.
- Team carousel + group standings now link out.

- [ ] **Step 13: Squad missing**

Rename `public/data/squads.json` → `squads.json.bak` temporarily, hard-reload `/team/brazil`. Expected: Squad tab shows the scraper-hint; other tabs still work. Restore the file before continuing.

If any step fails, file the fix as its own task — do not pile fixes into Task 21.

---

## Self-review checklist (run before handing off)

- [ ] Spec coverage: each section of `docs/superpowers/specs/2026-06-04-country-profile-page-design.md` has a task above (routing → Task 1/19, types → Task 2, scraper → Task 4, hero → Task 10, tabs → Task 11, six tab contents → Tasks 12–17, page shell → Task 18, route mount → Task 19, link-up → Task 20, verification → Task 21).
- [ ] No placeholders: no "TBD", no orphan types, no "add error handling later".
- [ ] Type consistency: `Player`, `Position`, `TabKey`, `useTeamProfile` shape, `SquadsPayload`, `formFromMatch` signature all referenced consistently across tasks.
- [ ] File paths: every `Files` block lists exact paths.
- [ ] Each task ends with a commit.
