# Match Details Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `/match/:slug` page with six tabs (Overview, H2H, Recent Form, Top Scorers, Squad Comparison, Previous Meetings) powered by `openfootball/worldcup.json` (2026 fixtures) plus a one-time scrape of the `jfjelstul/worldcup` CSV database (every historical men's WC, 1930–2022) trimmed to ~2 MB.

**Architecture:** A Node scraper consolidates jfjelstul CSVs into one `public/data/match-history.json`. A composite `useMatchProfile(slug)` hook joins the current-WC fixture with historical H2H, top-scorer aggregations, recent form, and the existing `useSquad` data. The page mounts behind the existing `Layout`, reuses the `TeamTabs` underline pattern, and the `MatchTimeline` + carousel cards on the team page become `<Link>`s to the new route.

**Tech Stack:** React 19, TypeScript strict, React Router v7, TanStack Query v5, Tailwind v4, Framer Motion, existing `FlagRipple` + `Countdown` + `Skeleton` + `Section` primitives, Node 22 + built-in `fetch` for the scraper.

**Repo note:** No test runner is configured. Verification = `npx tsc -b --noEmit` + `npx vite build` + manual browser checks. Each task ends in a commit. Use the Bash tool only — never PowerShell on this Windows machine.

---

## File Structure

**Create:**

- `src/utils/matchSlug.ts`
- `src/data/types/matchHistory.ts`
- `src/data/api/matchHistory.ts`
- `src/data/queries/useMatchHistory.ts`
- `src/data/queries/useMatchProfile.ts`
- `scripts/scrape-match-history.mjs`
- `public/data/match-history.json` (output)
- `src/pages/MatchPage/index.tsx`
- `src/pages/MatchPage/MatchHero.tsx`
- `src/pages/MatchPage/MatchTabs.tsx`
- `src/pages/MatchPage/tabs/MatchOverviewTab.tsx`
- `src/pages/MatchPage/tabs/HeadToHeadTab.tsx`
- `src/pages/MatchPage/tabs/RecentFormTab.tsx`
- `src/pages/MatchPage/tabs/TopScorersTab.tsx`
- `src/pages/MatchPage/tabs/SquadCompareTab.tsx`
- `src/pages/MatchPage/tabs/PreviousMeetingsTab.tsx`
- `src/pages/MatchPage/components/H2HSummary.tsx`
- `src/pages/MatchPage/components/FormStrip.tsx`
- `src/pages/MatchPage/components/EventTimeline.tsx`
- `src/pages/MatchPage/components/ScorerCard.tsx`
- `src/pages/MatchPage/components/SquadColumn.tsx`

**Modify:**

- `src/data/types/index.ts` — re-export new match-history types.
- `src/app/routes.tsx` — add `/match/:slug` route.
- `src/pages/TeamPage/components/MatchTimeline.tsx` — rows become `<Link>` to match page.
- `src/pages/TeamPage/tabs/MatchesTab.tsx` — upcoming carousel cards become `<Link>` to match page.
- `package.json` — add `"scrape:matches": "node scripts/scrape-match-history.mjs"`.

---

## Task 1: `matchSlug` utilities

**Files:**
- Create: `src/utils/matchSlug.ts`

- [ ] **Step 1: Write the module**

```ts
// src/utils/matchSlug.ts
import type { Match } from '@/data/types';
import { toSlug } from './slug';

export function toMatchSlug(match: Match): string {
  const date = match.kickoff.slice(0, 10); // YYYY-MM-DD
  return `${toSlug(match.home.name)}-vs-${toSlug(match.away.name)}-${date}`;
}

export function findMatchBySlug(
  matches: readonly Match[] | undefined,
  slug: string,
): Match | undefined {
  if (!matches) return undefined;
  const target = slug.toLowerCase();
  return matches.find((m) => toMatchSlug(m) === target);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/utils/matchSlug.ts
git commit -m "utils: toMatchSlug + findMatchBySlug helpers"
```

---

## Task 2: `matchHistory` types

**Files:**
- Create: `src/data/types/matchHistory.ts`
- Modify: `src/data/types/index.ts`

- [ ] **Step 1: Create the types**

```ts
// src/data/types/matchHistory.ts
export type HistoricalEventType =
  | 'goal'
  | 'own-goal'
  | 'penalty'
  | 'yellow'
  | 'red'
  | 'sub';

export type HistoricalEvent = {
  minute: number;
  type: HistoricalEventType;
  teamCode: string;
  player: string;
  detail?: string;
};

export type HistoricalMatch = {
  id: string;
  tournament: string;
  date: string;
  stage: string;
  home: { code: string; name: string; score: number };
  away: { code: string; name: string; score: number };
  stadium?: string;
  attendance?: number;
  referee?: string;
  events: HistoricalEvent[];
};

export type MatchHistoryPayload = {
  scrapedAt: string;
  matches: HistoricalMatch[];
};
```

- [ ] **Step 2: Re-export from barrel**

Read `src/data/types/index.ts`, append at the end:

```ts
export type {
  HistoricalEvent,
  HistoricalEventType,
  HistoricalMatch,
  MatchHistoryPayload,
} from './matchHistory';
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/data/types/matchHistory.ts src/data/types/index.ts
git commit -m "types: HistoricalMatch + HistoricalEvent + MatchHistoryPayload"
```

---

## Task 3: jfjelstul scraper

**Files:**
- Create: `scripts/scrape-match-history.mjs`
- Modify: `package.json`
- Create (output): `public/data/match-history.json`

- [ ] **Step 1: Write the scraper**

```js
// scripts/scrape-match-history.mjs
#!/usr/bin/env node
// Scrape jfjelstul/worldcup CSVs → public/data/match-history.json (trimmed).
// Usage: pnpm run scrape:matches
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, '..', 'public', 'data', 'match-history.json');
const BASE =
  'https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-csv';

const FILES = {
  matches: `${BASE}/matches.csv`,
  goals: `${BASE}/goals.csv`,
  bookings: `${BASE}/bookings.csv`,
  substitutions: `${BASE}/substitutions.csv`,
  tournaments: `${BASE}/tournaments.csv`,
  teams: `${BASE}/teams.csv`,
};

// Minimal RFC-4180 CSV parser (jfjelstul CSVs are clean, no embedded newlines).
function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const splitRow = (line) => {
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQ = false;
        } else {
          cur += ch;
        }
      } else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else if (ch === '"') {
        inQ = true;
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = splitRow(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitRow(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? '';
    });
    return row;
  });
}

async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return parseCsv(await res.text());
}

function isMensWc(tournamentName) {
  return /FIFA World Cup/i.test(tournamentName) && !/Women/i.test(tournamentName);
}

function trimReferee(name) {
  return name && name !== 'NA' ? name : undefined;
}

function trimAttendance(s) {
  if (!s || s === 'NA') return undefined;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? undefined : n;
}

function classifyEvent(row) {
  // From bookings.csv: yellow/red flag columns.
  if (row.yellow_card === '1') return 'yellow';
  if (row.red_card === '1' || row.second_yellow_card === '1') return 'red';
  return undefined;
}

async function scrape() {
  console.log('[matches] fetching CSVs…');
  const [tournaments, teams, matches, goals, bookings, subs] = await Promise.all([
    fetchCsv(FILES.tournaments),
    fetchCsv(FILES.teams),
    fetchCsv(FILES.matches),
    fetchCsv(FILES.goals),
    fetchCsv(FILES.bookings),
    fetchCsv(FILES.substitutions),
  ]);

  // tournaments: tournament_id → tournament_name
  const tourneyName = new Map(
    tournaments.map((t) => [t.tournament_id, t.tournament_name]),
  );
  // teams: team_id → { code, name }
  const teamInfo = new Map(
    teams.map((t) => [
      t.team_id,
      { code: t.team_code || t.team_id, name: t.team_name || t.team_code },
    ]),
  );

  const wcMatchIds = new Set();
  for (const m of matches) {
    if (!isMensWc(tourneyName.get(m.tournament_id) ?? '')) continue;
    wcMatchIds.add(m.match_id);
  }

  // Index events by match_id.
  const goalsBy = new Map();
  for (const g of goals) {
    if (!wcMatchIds.has(g.match_id)) continue;
    const arr = goalsBy.get(g.match_id) ?? [];
    arr.push(g);
    goalsBy.set(g.match_id, arr);
  }
  const bookingsBy = new Map();
  for (const b of bookings) {
    if (!wcMatchIds.has(b.match_id)) continue;
    const arr = bookingsBy.get(b.match_id) ?? [];
    arr.push(b);
    bookingsBy.set(b.match_id, arr);
  }
  const subsBy = new Map();
  for (const s of subs) {
    if (!wcMatchIds.has(s.match_id)) continue;
    const arr = subsBy.get(s.match_id) ?? [];
    arr.push(s);
    subsBy.set(s.match_id, arr);
  }

  const out = [];
  for (const m of matches) {
    const tournament = tourneyName.get(m.tournament_id);
    if (!tournament || !isMensWc(tournament)) continue;

    const home = teamInfo.get(m.home_team_id) ?? {
      code: m.home_team_code ?? 'UNK',
      name: m.home_team_name ?? 'Unknown',
    };
    const away = teamInfo.get(m.away_team_id) ?? {
      code: m.away_team_code ?? 'UNK',
      name: m.away_team_name ?? 'Unknown',
    };

    const events = [];
    for (const g of goalsBy.get(m.match_id) ?? []) {
      const minute = parseInt(g.minute_regulation || g.minute_label || '0', 10);
      const type =
        g.penalty === '1' ? 'penalty' : g.own_goal === '1' ? 'own-goal' : 'goal';
      const teamCode = teamInfo.get(g.team_id)?.code ?? g.team_id;
      events.push({
        minute,
        type,
        teamCode,
        player: g.player_name ?? g.given_name + ' ' + g.family_name,
      });
    }
    for (const b of bookingsBy.get(m.match_id) ?? []) {
      const type = classifyEvent(b);
      if (!type) continue;
      const minute = parseInt(b.minute_regulation || b.minute_label || '0', 10);
      const teamCode = teamInfo.get(b.team_id)?.code ?? b.team_id;
      events.push({
        minute,
        type,
        teamCode,
        player: b.player_name ?? b.given_name + ' ' + b.family_name,
      });
    }
    for (const s of subsBy.get(m.match_id) ?? []) {
      const minute = parseInt(s.minute_regulation || s.minute_label || '0', 10);
      const teamCode = teamInfo.get(s.team_id)?.code ?? s.team_id;
      const playerIn = s.player_name ?? s.given_name + ' ' + s.family_name;
      events.push({
        minute,
        type: 'sub',
        teamCode,
        player: playerIn,
        detail: s.coming_off_player_name
          ? `for ${s.coming_off_player_name}`
          : undefined,
      });
    }
    events.sort((a, b) => a.minute - b.minute);

    out.push({
      id: m.match_id,
      tournament,
      date: m.match_date,
      stage: m.stage_name || 'Group stage',
      home: { code: home.code, name: home.name, score: parseInt(m.home_team_score, 10) || 0 },
      away: { code: away.code, name: away.name, score: parseInt(m.away_team_score, 10) || 0 },
      stadium: m.stadium_name || undefined,
      attendance: trimAttendance(m.attendance),
      referee: trimReferee(m.referee_name),
      events,
    });
  }

  console.log(`[matches] kept ${out.length} historical matches`);

  const payload = {
    scrapedAt: new Date().toISOString(),
    matches: out,
  };
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(payload), 'utf8'); // unindented to stay close to 2 MB
  console.log(`[matches] wrote ${OUTPUT}`);
}

scrape().catch((err) => {
  console.error('[matches] failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm script**

Read `package.json`. Append to the `"scripts"` block, right after the existing `"scrape:squads"` line:

```json
"scrape:matches": "node scripts/scrape-match-history.mjs"
```

- [ ] **Step 3: Run the scraper**

Run: `node scripts/scrape-match-history.mjs`
Expected: console prints "kept N historical matches" with N ≥ 800, and a `public/data/match-history.json` file exists.

If the script fails with HTTP 404, the jfjelstul repo path may have moved — try the alternate `data-raw` directory (`https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-raw/`). Update `BASE` accordingly and re-run.

If the script succeeds but the JSON is > 4 MB, that's still acceptable — note it as a concern.

- [ ] **Step 4: Commit**

```bash
git add scripts/scrape-match-history.mjs package.json public/data/match-history.json
git commit -m "data: jfjelstul WC history scraper + initial scrape (matches + events)"
```

---

## Task 4: `matchHistory` adapter + hook

**Files:**
- Create: `src/data/api/matchHistory.ts`
- Create: `src/data/queries/useMatchHistory.ts`

- [ ] **Step 1: Adapter**

```ts
// src/data/api/matchHistory.ts
import type { MatchHistoryPayload } from '@/data/types';

const SOURCE = '/data/match-history.json';

export const matchHistoryApi = {
  all: async (_: void, signal: AbortSignal): Promise<MatchHistoryPayload> => {
    const res = await fetch(SOURCE, { signal });
    if (!res.ok) throw new Error(`match-history.json ${res.status}`);
    return res.json() as Promise<MatchHistoryPayload>;
  },
};
```

- [ ] **Step 2: Hook**

```ts
// src/data/queries/useMatchHistory.ts
import { useQuery } from '@tanstack/react-query';
import { matchHistoryApi } from '@/data/api/matchHistory';
import type { MatchHistoryPayload } from '@/data/types';

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — bundled data

export function useMatchHistory() {
  return useQuery<MatchHistoryPayload, Error>({
    queryKey: ['match-history'],
    queryFn: ({ signal }) => matchHistoryApi.all(undefined, signal!),
    staleTime: TTL_MS,
  });
}
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc -b --noEmit`

```bash
git add src/data/api/matchHistory.ts src/data/queries/useMatchHistory.ts
git commit -m "data: matchHistory adapter + useMatchHistory hook"
```

---

## Task 5: Composite `useMatchProfile`

**Files:**
- Create: `src/data/queries/useMatchProfile.ts`

- [ ] **Step 1: Write the hook**

```ts
// src/data/queries/useMatchProfile.ts
import { useMemo } from 'react';
import { useAllMatches } from './useAllMatches';
import { useMatchHistory } from './useMatchHistory';
import { useSquad } from './useSquad';
import { useTeams } from './useTeams';
import { findMatchBySlug } from '@/utils/matchSlug';
import type {
  Match,
  HistoricalMatch,
  HistoricalEvent,
  Player,
} from '@/data/types';

export type Scorer = {
  name: string;
  goals: number;
  lastTournament: string;
};

export type MatchProfile = {
  match?: Match;
  h2h: HistoricalMatch[];
  squadHome: Player[];
  squadAway: Player[];
  recentHome: Array<Match | HistoricalMatch>;
  recentAway: Array<Match | HistoricalMatch>;
  topScorersHome: Scorer[];
  topScorersAway: Scorer[];
  isLoading: boolean;
  notFound: boolean;
};

function aggregateScorers(
  history: HistoricalMatch[],
  teamCode: string,
  topN: number,
): Scorer[] {
  const byPlayer = new Map<string, { goals: number; tournaments: string[] }>();
  for (const m of history) {
    for (const e of m.events) {
      if (e.teamCode !== teamCode) continue;
      if (e.type !== 'goal' && e.type !== 'penalty') continue;
      const entry = byPlayer.get(e.player) ?? { goals: 0, tournaments: [] };
      entry.goals++;
      if (!entry.tournaments.includes(m.tournament)) {
        entry.tournaments.push(m.tournament);
      }
      byPlayer.set(e.player, entry);
    }
  }
  return Array.from(byPlayer.entries())
    .map(([name, { goals, tournaments }]) => ({
      name,
      goals,
      lastTournament: tournaments.sort().reverse()[0] ?? '',
    }))
    .sort((a, b) => b.goals - a.goals)
    .slice(0, topN);
}

function recentForTeam(
  current: Match[],
  history: HistoricalMatch[],
  teamName: string,
  teamCode: string,
  limit: number,
): Array<Match | HistoricalMatch> {
  const fromCurrent = current
    .filter(
      (m) =>
        m.status === 'finished' &&
        (m.home.teamId === teamName || m.away.teamId === teamName),
    )
    .slice(-limit);
  if (fromCurrent.length >= limit) return fromCurrent.slice(-limit);

  const need = limit - fromCurrent.length;
  const fromHistory = history
    .filter((h) => h.home.code === teamCode || h.away.code === teamCode)
    .slice(-need);
  return [...fromHistory, ...fromCurrent];
}

export function useMatchProfile(slug: string): MatchProfile {
  const matches = useAllMatches();
  const history = useMatchHistory();
  const teams = useTeams();

  const match = findMatchBySlug(matches.data, slug);

  // Resolve FIFA team codes from team names so we can join with history.
  const homeTeam = teams.data?.find((t) => t.name === match?.home.name);
  const awayTeam = teams.data?.find((t) => t.name === match?.away.name);

  const squadHome = useSquad(homeTeam?.id);
  const squadAway = useSquad(awayTeam?.id);

  const h2h = useMemo<HistoricalMatch[]>(() => {
    if (!match || !history.data || !homeTeam || !awayTeam) return [];
    const a = homeTeam.id;
    const b = awayTeam.id;
    return history.data.matches.filter(
      (m) =>
        (m.home.code === a && m.away.code === b) ||
        (m.home.code === b && m.away.code === a),
    );
  }, [match, history.data, homeTeam, awayTeam]);

  const recentHome = useMemo(
    () =>
      match && homeTeam
        ? recentForTeam(
            matches.data ?? [],
            history.data?.matches ?? [],
            match.home.name,
            homeTeam.id,
            5,
          )
        : [],
    [match, matches.data, history.data, homeTeam],
  );
  const recentAway = useMemo(
    () =>
      match && awayTeam
        ? recentForTeam(
            matches.data ?? [],
            history.data?.matches ?? [],
            match.away.name,
            awayTeam.id,
            5,
          )
        : [],
    [match, matches.data, history.data, awayTeam],
  );

  const topScorersHome = useMemo(
    () =>
      homeTeam && history.data
        ? aggregateScorers(history.data.matches, homeTeam.id, 5)
        : [],
    [homeTeam, history.data],
  );
  const topScorersAway = useMemo(
    () =>
      awayTeam && history.data
        ? aggregateScorers(history.data.matches, awayTeam.id, 5)
        : [],
    [awayTeam, history.data],
  );

  const isLoading =
    matches.isLoading || teams.isLoading || history.isLoading;
  const notFound = !matches.isLoading && !!matches.data && !match;

  return {
    match,
    h2h,
    squadHome: squadHome.players,
    squadAway: squadAway.players,
    recentHome,
    recentAway,
    topScorersHome,
    topScorersAway,
    isLoading,
    notFound,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/data/queries/useMatchProfile.ts
git commit -m "data: useMatchProfile composite hook (joins current + historical data)"
```

---

## Task 6: Reusable components

**Files:**
- Create: `src/pages/MatchPage/components/H2HSummary.tsx`
- Create: `src/pages/MatchPage/components/FormStrip.tsx`
- Create: `src/pages/MatchPage/components/EventTimeline.tsx`
- Create: `src/pages/MatchPage/components/ScorerCard.tsx`
- Create: `src/pages/MatchPage/components/SquadColumn.tsx`

- [ ] **Step 1: `H2HSummary.tsx`**

```tsx
// src/pages/MatchPage/components/H2HSummary.tsx
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function H2HSummary({
  homeName,
  awayName,
  wHome,
  draws,
  wAway,
}: {
  homeName: string;
  awayName: string;
  wHome: number;
  draws: number;
  wAway: number;
}) {
  const total = Math.max(1, wHome + draws + wAway);
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const pct = (n: number) => `${(n / total) * 100}%`;

  return (
    <div ref={ref} className="grid grid-cols-3 gap-4">
      <Row label={`${homeName} wins`} value={wHome} pct={pct(wHome)} tone="success" inView={inView} reduced={reduced} />
      <Row label="Draws" value={draws} pct={pct(draws)} tone="gold" inView={inView} reduced={reduced} />
      <Row label={`${awayName} wins`} value={wAway} pct={pct(wAway)} tone="loss" inView={inView} reduced={reduced} />
    </div>
  );
}

function Row({
  label,
  value,
  pct,
  tone,
  inView,
  reduced,
}: {
  label: string;
  value: number;
  pct: string;
  tone: 'success' | 'gold' | 'loss';
  inView: boolean;
  reduced: boolean;
}) {
  const fill = tone === 'success' ? 'bg-success' : tone === 'loss' ? 'bg-loss' : 'bg-gold';
  return (
    <div className="rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md">
      <div className="text-[10px] uppercase tracking-[0.18em] text-text-dim mb-2">{label}</div>
      <div className="font-display text-3xl text-text">{value}</div>
      <div className="mt-3 h-1.5 rounded-full bg-bg-elev2 overflow-hidden">
        <motion.div
          className={`h-full ${fill}`}
          initial={{ width: 0 }}
          animate={inView || reduced ? { width: pct } : { width: 0 }}
          transition={{ duration: reduced ? 0 : 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `FormStrip.tsx`**

```tsx
// src/pages/MatchPage/components/FormStrip.tsx
import { Flag } from '@/components/ui/Flag';
import type { Match, HistoricalMatch } from '@/data/types';

type Result = 'W' | 'D' | 'L';
const COLOR: Record<Result, string> = {
  W: 'bg-success text-bg-deep',
  D: 'bg-gold text-bg-deep',
  L: 'bg-loss text-text',
};

function resultFor(item: Match | HistoricalMatch, teamName: string, teamCode: string): { r: Result | null; oppName: string; oppCode: string; score: string } {
  if ('status' in item) {
    if (item.status !== 'finished' || item.home.score === undefined || item.away.score === undefined) {
      return { r: null, oppName: '', oppCode: '', score: '' };
    }
    const isHome = item.home.teamId === teamName;
    const me = isHome ? item.home.score : item.away.score;
    const them = isHome ? item.away.score : item.home.score;
    const r: Result = me > them ? 'W' : me < them ? 'L' : 'D';
    return {
      r,
      oppName: isHome ? item.away.name : item.home.name,
      oppCode: isHome ? item.away.countryCode : item.home.countryCode,
      score: `${item.home.score}-${item.away.score}`,
    };
  }
  const isHome = item.home.code === teamCode;
  const me = isHome ? item.home.score : item.away.score;
  const them = isHome ? item.away.score : item.home.score;
  const r: Result = me > them ? 'W' : me < them ? 'L' : 'D';
  return {
    r,
    oppName: isHome ? item.away.name : item.home.name,
    oppCode: (isHome ? item.away.code : item.home.code).toLowerCase(),
    score: `${item.home.score}-${item.away.score}`,
  };
}

export function FormStrip({
  items,
  teamName,
  teamCode,
}: {
  items: Array<Match | HistoricalMatch>;
  teamName: string;
  teamCode: string;
}) {
  if (!items.length) return <div className="text-text-dim text-sm">No matches on record.</div>;
  return (
    <ul className="flex items-end gap-3">
      {items.map((m, i) => {
        const { r, oppName, oppCode, score } = resultFor(m, teamName, teamCode);
        if (!r) return null;
        return (
          <li key={i} className="flex flex-col items-center gap-1">
            <span
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${COLOR[r]}`}
              aria-label={`${r} vs ${oppName} ${score}`}
            >
              {r}
            </span>
            {oppCode && <Flag countryCode={oppCode} size="sm" />}
            <span className="text-[10px] text-text-dim">{score}</span>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 3: `EventTimeline.tsx`**

```tsx
// src/pages/MatchPage/components/EventTimeline.tsx
import type { HistoricalEvent } from '@/data/types';

const ICON: Record<HistoricalEvent['type'], string> = {
  goal: '⚽',
  'own-goal': '⚽',
  penalty: '⚽',
  yellow: '🟨',
  red: '🟥',
  sub: '🔄',
};

export function EventTimeline({ events }: { events: HistoricalEvent[] }) {
  if (!events.length) return <div className="text-text-dim text-sm">No events on record.</div>;
  return (
    <ol className="relative pl-3 border-l border-white/10 space-y-2">
      {events.map((e, i) => (
        <li key={i} className="relative text-xs">
          <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-gold" />
          <span className="font-mono text-text-dim mr-2">{e.minute}'</span>
          <span className="mr-1">{ICON[e.type]}</span>
          <span className="text-text">{e.player}</span>
          {e.detail && <span className="text-text-dim"> · {e.detail}</span>}
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 4: `ScorerCard.tsx`**

```tsx
// src/pages/MatchPage/components/ScorerCard.tsx
import type { Scorer } from '@/data/queries/useMatchProfile';

export function ScorerCard({
  scorer,
  isActive,
}: {
  scorer: Scorer;
  isActive: boolean;
}) {
  return (
    <article className="rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md flex items-center gap-3">
      <div className="font-display text-3xl text-gold w-12 text-center">
        {scorer.goals}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-text truncate">{scorer.name}</h3>
        <p className="text-[11px] text-text-dim truncate">{scorer.lastTournament}</p>
      </div>
      {isActive && (
        <span className="text-[10px] uppercase tracking-[0.15em] bg-success/20 text-success px-2 py-0.5 rounded-full">
          Active 2026
        </span>
      )}
    </article>
  );
}
```

- [ ] **Step 5: `SquadColumn.tsx`**

```tsx
// src/pages/MatchPage/components/SquadColumn.tsx
import type { Player } from '@/data/types';

const POS_ORDER = ['GK', 'DF', 'MF', 'FW'] as const;

export function SquadColumn({ name, squad }: { name: string; squad: Player[] }) {
  if (!squad.length) {
    return (
      <div className="text-text-dim text-sm">No squad data for {name}.</div>
    );
  }
  const avgAge =
    squad.filter((p) => p.age !== undefined).reduce((s, p) => s + (p.age ?? 0), 0) /
    Math.max(1, squad.filter((p) => p.age !== undefined).length);
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

- [ ] **Step 6: Type-check + commit**

Run: `npx tsc -b --noEmit`

```bash
git add src/pages/MatchPage/components/H2HSummary.tsx src/pages/MatchPage/components/FormStrip.tsx src/pages/MatchPage/components/EventTimeline.tsx src/pages/MatchPage/components/ScorerCard.tsx src/pages/MatchPage/components/SquadColumn.tsx
git commit -m "match-page: H2HSummary + FormStrip + EventTimeline + ScorerCard + SquadColumn"
```

---

## Task 7: `MatchHero`

**Files:**
- Create: `src/pages/MatchPage/MatchHero.tsx`

- [ ] **Step 1: Implementation**

```tsx
// src/pages/MatchPage/MatchHero.tsx
import { FlagRipple } from '@/components/ui/FlagRipple';
import { Countdown } from '@/components/ui/Countdown';
import { Pill } from '@/components/ui/Pill';
import type { Match } from '@/data/types';

export function MatchHero({
  match,
  homeRank,
  awayRank,
}: {
  match: Match;
  homeRank?: number;
  awayRank?: number;
}) {
  const kickoff = new Date(match.kickoff);
  const dateStr = kickoff.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

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
      <div className="relative max-w-container mx-auto px-6 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="flex flex-col items-center text-center gap-3">
            <FlagRipple countryCode={match.home.countryCode} size="xl" ariaLabel={match.home.name} />
            <div className="font-display text-2xl md:text-3xl text-text">{match.home.name}</div>
            {homeRank && (
              <div className="text-[10px] uppercase tracking-[0.18em] text-gold">FIFA #{homeRank}</div>
            )}
          </div>

          <div className="flex flex-col items-center text-center gap-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-text-dim">{match.stage}</div>
            <div className="font-display text-3xl md:text-display text-text">
              {match.home.score ?? '·'} <span className="text-text-dim">vs</span> {match.away.score ?? '·'}
            </div>
            <div className="text-xs text-text-dim">{dateStr}</div>
            <div className="text-[11px] text-text-dim">{match.stadium.name}</div>
            {match.status === 'scheduled' && <Countdown target={match.kickoff} />}
            {match.status === 'live' && <Pill variant="live">LIVE · {match.minute}'</Pill>}
            {match.status === 'finished' && <Pill variant="final">FT</Pill>}
          </div>

          <div className="flex flex-col items-center text-center gap-3">
            <FlagRipple countryCode={match.away.countryCode} size="xl" ariaLabel={match.away.name} />
            <div className="font-display text-2xl md:text-3xl text-text">{match.away.name}</div>
            {awayRank && (
              <div className="text-[10px] uppercase tracking-[0.18em] text-gold">FIFA #{awayRank}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc -b --noEmit
git add src/pages/MatchPage/MatchHero.tsx
git commit -m "match-page: MatchHero with flag ripple, score line, kickoff status"
```

---

## Task 8: `MatchTabs`

**Files:**
- Create: `src/pages/MatchPage/MatchTabs.tsx`

- [ ] **Step 1: Implementation**

```tsx
// src/pages/MatchPage/MatchTabs.tsx
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

export type MatchTabKey =
  | 'overview'
  | 'h2h'
  | 'form'
  | 'scorers'
  | 'squad'
  | 'history';

export const MATCH_TABS: { key: MatchTabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'h2h', label: 'Head-to-Head' },
  { key: 'form', label: 'Recent Form' },
  { key: 'scorers', label: 'Top Scorers' },
  { key: 'squad', label: 'Squad' },
  { key: 'history', label: 'Previous Meetings' },
];

export function MatchTabs({
  active,
  onChange,
}: {
  active: MatchTabKey;
  onChange: (k: MatchTabKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Match sections"
      className="sticky top-[88px] lg:top-[140px] z-20 -mx-6 px-6 lg:-mx-8 lg:px-8 bg-bg/80 backdrop-blur-md border-b border-white/8"
    >
      <div className="max-w-container mx-auto flex gap-1 overflow-x-auto no-scrollbar py-2">
        {MATCH_TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`match-panel-${t.key}`}
              id={`match-tab-${t.key}`}
              onClick={() => onChange(t.key)}
              className={cn(
                'relative px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] whitespace-nowrap transition-colors',
                isActive ? 'text-text' : 'text-text-dim hover:text-text',
              )}
            >
              {t.label}
              {isActive && (
                <motion.span
                  layoutId="match-tab-underline"
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
npx tsc -b --noEmit
git add src/pages/MatchPage/MatchTabs.tsx
git commit -m "match-page: MatchTabs sticky animated tab bar"
```

---

## Task 9: `MatchOverviewTab` + `HeadToHeadTab` + `RecentFormTab`

**Files:**
- Create: `src/pages/MatchPage/tabs/MatchOverviewTab.tsx`
- Create: `src/pages/MatchPage/tabs/HeadToHeadTab.tsx`
- Create: `src/pages/MatchPage/tabs/RecentFormTab.tsx`

- [ ] **Step 1: `MatchOverviewTab.tsx`**

```tsx
// src/pages/MatchPage/tabs/MatchOverviewTab.tsx
import type { Match, Team } from '@/data/types';
import { formFromMatch } from '@/pages/TeamPage/components/RecentForm';

export function MatchOverviewTab({
  match,
  homeTeam,
  awayTeam,
  homeFinished,
  awayFinished,
}: {
  match: Match;
  homeTeam?: Team;
  awayTeam?: Team;
  homeFinished: Match[];
  awayFinished: Match[];
}) {
  const kickoff = new Date(match.kickoff);
  const kickoffStr = kickoff.toLocaleString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const stat = (fin: Match[], name: string) => {
    let w = 0;
    let d = 0;
    let l = 0;
    let gf = 0;
    let ga = 0;
    for (const m of fin) {
      const r = formFromMatch(m, name);
      if (r === 'W') w++;
      else if (r === 'D') d++;
      else if (r === 'L') l++;
      const isHome = m.home.teamId === name;
      gf += (isHome ? m.home.score : m.away.score) ?? 0;
      ga += (isHome ? m.away.score : m.home.score) ?? 0;
    }
    return { w, d, l, gf, ga };
  };
  const sh = stat(homeFinished, match.home.name);
  const sa = stat(awayFinished, match.away.name);

  return (
    <div className="space-y-8">
      <section className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md">
          <div className="text-text-dim text-xs uppercase tracking-[0.18em] mb-1">Competition</div>
          <div>FIFA World Cup 2026</div>
        </div>
        <div className="rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md">
          <div className="text-text-dim text-xs uppercase tracking-[0.18em] mb-1">Stage</div>
          <div>{match.stage}{match.group ? ` · Group ${match.group}` : ''}</div>
        </div>
        <div className="rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md">
          <div className="text-text-dim text-xs uppercase tracking-[0.18em] mb-1">Venue</div>
          <div>{match.stadium.name}</div>
        </div>
        <div className="rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md">
          <div className="text-text-dim text-xs uppercase tracking-[0.18em] mb-1">Kickoff</div>
          <div>{kickoffStr}</div>
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Form so far</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <TeamLine
            label={match.home.name}
            rank={homeTeam?.fifaRank}
            w={sh.w}
            d={sh.d}
            l={sh.l}
            gf={sh.gf}
            ga={sh.ga}
          />
          <TeamLine
            label={match.away.name}
            rank={awayTeam?.fifaRank}
            w={sa.w}
            d={sa.d}
            l={sa.l}
            gf={sa.gf}
            ga={sa.ga}
          />
        </div>
      </section>
    </div>
  );
}

function TeamLine({
  label,
  rank,
  w,
  d,
  l,
  gf,
  ga,
}: {
  label: string;
  rank?: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
}) {
  return (
    <div className="rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-display text-lg text-text">{label}</span>
        {rank && <span className="text-xs text-gold">FIFA #{rank}</span>}
      </div>
      <div className="text-sm text-text-dim">
        {w}W · {d}D · {l}L · GF {gf} · GA {ga}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `HeadToHeadTab.tsx`**

```tsx
// src/pages/MatchPage/tabs/HeadToHeadTab.tsx
import type { HistoricalMatch } from '@/data/types';
import { H2HSummary } from '../components/H2HSummary';

export function HeadToHeadTab({
  homeName,
  awayName,
  homeCode,
  h2h,
}: {
  homeName: string;
  awayName: string;
  homeCode: string;
  h2h: HistoricalMatch[];
}) {
  if (!h2h.length) {
    return <div className="text-text-dim">No previous meetings on record.</div>;
  }
  let wHome = 0;
  let draws = 0;
  let wAway = 0;
  let gfHome = 0;
  let gfAway = 0;
  for (const m of h2h) {
    const homeIsHome = m.home.code === homeCode;
    const meScore = homeIsHome ? m.home.score : m.away.score;
    const themScore = homeIsHome ? m.away.score : m.home.score;
    gfHome += meScore;
    gfAway += themScore;
    if (meScore > themScore) wHome++;
    else if (meScore < themScore) wAway++;
    else draws++;
  }

  return (
    <div className="space-y-6">
      <H2HSummary
        homeName={homeName}
        awayName={awayName}
        wHome={wHome}
        draws={draws}
        wAway={wAway}
      />
      <p className="text-text-dim text-sm">
        Total goals: <span className="text-text">{homeName} {gfHome} · {awayName} {gfAway}</span> over {h2h.length} meeting{h2h.length === 1 ? '' : 's'}.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: `RecentFormTab.tsx`**

```tsx
// src/pages/MatchPage/tabs/RecentFormTab.tsx
import type { Match, HistoricalMatch } from '@/data/types';
import { FormStrip } from '../components/FormStrip';

export function RecentFormTab({
  homeName,
  awayName,
  homeCode,
  awayCode,
  recentHome,
  recentAway,
}: {
  homeName: string;
  awayName: string;
  homeCode: string;
  awayCode: string;
  recentHome: Array<Match | HistoricalMatch>;
  recentAway: Array<Match | HistoricalMatch>;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">{homeName}</h2>
        <FormStrip items={recentHome} teamName={homeName} teamCode={homeCode} />
      </section>
      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">{awayName}</h2>
        <FormStrip items={recentAway} teamName={awayName} teamCode={awayCode} />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Type-check + commit**

```bash
npx tsc -b --noEmit
git add src/pages/MatchPage/tabs/MatchOverviewTab.tsx src/pages/MatchPage/tabs/HeadToHeadTab.tsx src/pages/MatchPage/tabs/RecentFormTab.tsx
git commit -m "match-page: OverviewTab + HeadToHeadTab + RecentFormTab"
```

---

## Task 10: `TopScorersTab` + `SquadCompareTab` + `PreviousMeetingsTab`

**Files:**
- Create: `src/pages/MatchPage/tabs/TopScorersTab.tsx`
- Create: `src/pages/MatchPage/tabs/SquadCompareTab.tsx`
- Create: `src/pages/MatchPage/tabs/PreviousMeetingsTab.tsx`

- [ ] **Step 1: `TopScorersTab.tsx`**

```tsx
// src/pages/MatchPage/tabs/TopScorersTab.tsx
import type { Player } from '@/data/types';
import type { Scorer } from '@/data/queries/useMatchProfile';
import { ScorerCard } from '../components/ScorerCard';

function lastName(name: string) {
  return name.split(' ').slice(-1)[0]?.toLowerCase() ?? '';
}

function isActive(scorerName: string, squad: Player[]): boolean {
  const target = lastName(scorerName);
  return squad.some((p) => lastName(p.name) === target);
}

export function TopScorersTab({
  homeName,
  awayName,
  scorersHome,
  scorersAway,
  squadHome,
  squadAway,
}: {
  homeName: string;
  awayName: string;
  scorersHome: Scorer[];
  scorersAway: Scorer[];
  squadHome: Player[];
  squadAway: Player[];
}) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">{homeName}</h2>
        {scorersHome.length === 0 ? (
          <div className="text-text-dim text-sm">No goals on record.</div>
        ) : (
          <div className="space-y-2">
            {scorersHome.map((s) => (
              <ScorerCard key={s.name} scorer={s} isActive={isActive(s.name, squadHome)} />
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">{awayName}</h2>
        {scorersAway.length === 0 ? (
          <div className="text-text-dim text-sm">No goals on record.</div>
        ) : (
          <div className="space-y-2">
            {scorersAway.map((s) => (
              <ScorerCard key={s.name} scorer={s} isActive={isActive(s.name, squadAway)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: `SquadCompareTab.tsx`**

```tsx
// src/pages/MatchPage/tabs/SquadCompareTab.tsx
import type { Player } from '@/data/types';
import { SquadColumn } from '../components/SquadColumn';

export function SquadCompareTab({
  homeName,
  awayName,
  squadHome,
  squadAway,
}: {
  homeName: string;
  awayName: string;
  squadHome: Player[];
  squadAway: Player[];
}) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <SquadColumn name={homeName} squad={squadHome} />
      <SquadColumn name={awayName} squad={squadAway} />
    </div>
  );
}
```

- [ ] **Step 3: `PreviousMeetingsTab.tsx`**

```tsx
// src/pages/MatchPage/tabs/PreviousMeetingsTab.tsx
import { useState } from 'react';
import type { HistoricalMatch } from '@/data/types';
import { EventTimeline } from '../components/EventTimeline';

export function PreviousMeetingsTab({ h2h }: { h2h: HistoricalMatch[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (!h2h.length) {
    return <div className="text-text-dim">No previous meetings on record.</div>;
  }
  const sorted = h2h.slice().sort((a, b) => b.date.localeCompare(a.date));
  return (
    <ol className="space-y-3">
      {sorted.map((m) => {
        const isOpen = openId === m.id;
        return (
          <li key={m.id} className="rounded-2xl bg-bg-elev1/40 border border-white/8 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : m.id)}
              className="w-full text-left p-4 flex items-center gap-4"
            >
              <span className="text-[11px] text-text-dim w-24 shrink-0">{m.date}</span>
              <span className="text-xs text-text-dim flex-1 truncate">{m.tournament} · {m.stage}</span>
              <span className="font-display text-lg text-text">
                {m.home.score}-{m.away.score}
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-2 text-xs text-text-dim">
                <div>Venue: {m.stadium ?? 'Unknown'}{m.attendance ? ` · ${m.attendance.toLocaleString()} att.` : ''}</div>
                {m.referee && <div>Referee: {m.referee}</div>}
                <div className="pt-2"><EventTimeline events={m.events} /></div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 4: Type-check + commit**

```bash
npx tsc -b --noEmit
git add src/pages/MatchPage/tabs/TopScorersTab.tsx src/pages/MatchPage/tabs/SquadCompareTab.tsx src/pages/MatchPage/tabs/PreviousMeetingsTab.tsx
git commit -m "match-page: TopScorersTab + SquadCompareTab + PreviousMeetingsTab"
```

---

## Task 11: `MatchPage` shell

**Files:**
- Create: `src/pages/MatchPage/index.tsx`

- [ ] **Step 1: Implementation**

```tsx
// src/pages/MatchPage/index.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/Skeleton';
import { useMatchProfile } from '@/data/queries/useMatchProfile';
import { useTeams } from '@/data/queries';
import { MatchHero } from './MatchHero';
import { MatchTabs, MATCH_TABS, type MatchTabKey } from './MatchTabs';
import { MatchOverviewTab } from './tabs/MatchOverviewTab';
import { HeadToHeadTab } from './tabs/HeadToHeadTab';
import { RecentFormTab } from './tabs/RecentFormTab';
import { TopScorersTab } from './tabs/TopScorersTab';
import { SquadCompareTab } from './tabs/SquadCompareTab';
import { PreviousMeetingsTab } from './tabs/PreviousMeetingsTab';

function parseHash(): MatchTabKey {
  if (typeof window === 'undefined') return 'overview';
  const h = window.location.hash.replace('#', '') as MatchTabKey;
  return MATCH_TABS.some((t) => t.key === h) ? h : 'overview';
}

export default function MatchPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const profile = useMatchProfile(slug);
  const teams = useTeams();
  const [tab, setTab] = useState<MatchTabKey>(() => parseHash());

  useEffect(() => {
    const onHash = () => setTab(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const onChangeTab = (k: MatchTabKey) => {
    setTab(k);
    window.history.replaceState(null, '', `#${k}`);
  };

  const homeTeam = teams.data?.find((t) => t.name === profile.match?.home.name);
  const awayTeam = teams.data?.find((t) => t.name === profile.match?.away.name);

  const homeFinished = useMemo(
    () =>
      profile.recentHome.filter(
        (m): m is import('@/data/types').Match => 'status' in m && m.status === 'finished',
      ),
    [profile.recentHome],
  );
  const awayFinished = useMemo(
    () =>
      profile.recentAway.filter(
        (m): m is import('@/data/types').Match => 'status' in m && m.status === 'finished',
      ),
    [profile.recentAway],
  );

  if (profile.isLoading) {
    return (
      <div className="max-w-container mx-auto px-6 lg:px-8 py-12 space-y-6">
        <Skeleton className="h-56" />
        <Skeleton className="h-10" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (profile.notFound || !profile.match) {
    return (
      <div className="max-w-container mx-auto px-6 lg:px-8 py-24 text-center space-y-4">
        <h1 className="font-display text-3xl text-text">Match not found</h1>
        <p className="text-text-dim">No fixture matches "{slug}".</p>
        <Link to="/" className="inline-block mt-4 px-4 py-2 rounded-full bg-gold text-bg-deep font-semibold">
          Back home
        </Link>
      </div>
    );
  }

  const { match, h2h, squadHome, squadAway, recentHome, recentAway, topScorersHome, topScorersAway } = profile;
  const homeCode = homeTeam?.id ?? match.home.countryCode.toUpperCase();
  const awayCode = awayTeam?.id ?? match.away.countryCode.toUpperCase();

  return (
    <>
      <MatchHero match={match} homeRank={homeTeam?.fifaRank} awayRank={awayTeam?.fifaRank} />
      <MatchTabs active={tab} onChange={onChangeTab} />
      <div className="max-w-container mx-auto px-6 lg:px-8 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            id={`match-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`match-tab-${tab}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'overview' && (
              <MatchOverviewTab
                match={match}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                homeFinished={homeFinished}
                awayFinished={awayFinished}
              />
            )}
            {tab === 'h2h' && (
              <HeadToHeadTab
                homeName={match.home.name}
                awayName={match.away.name}
                homeCode={homeCode}
                h2h={h2h}
              />
            )}
            {tab === 'form' && (
              <RecentFormTab
                homeName={match.home.name}
                awayName={match.away.name}
                homeCode={homeCode}
                awayCode={awayCode}
                recentHome={recentHome}
                recentAway={recentAway}
              />
            )}
            {tab === 'scorers' && (
              <TopScorersTab
                homeName={match.home.name}
                awayName={match.away.name}
                scorersHome={topScorersHome}
                scorersAway={topScorersAway}
                squadHome={squadHome}
                squadAway={squadAway}
              />
            )}
            {tab === 'squad' && (
              <SquadCompareTab
                homeName={match.home.name}
                awayName={match.away.name}
                squadHome={squadHome}
                squadAway={squadAway}
              />
            )}
            {tab === 'history' && <PreviousMeetingsTab h2h={h2h} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc -b --noEmit
git add src/pages/MatchPage/index.tsx
git commit -m "match-page: page shell with hash-driven tabs + skeleton/notFound states"
```

---

## Task 12: Mount route + link match cards

**Files:**
- Modify: `src/app/routes.tsx`
- Modify: `src/pages/TeamPage/components/MatchTimeline.tsx`
- Modify: `src/pages/TeamPage/tabs/MatchesTab.tsx`

- [ ] **Step 1: Mount the route**

```tsx
// src/app/routes.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from '@/App';
import TeamPage from '@/pages/TeamPage';
import MatchPage from '@/pages/MatchPage';
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
        <Route
          path="/match/:slug"
          element={
            <Layout>
              <MatchPage />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Wrap `MatchTimeline` rows in `<Link>`**

Replace entire file:

```tsx
// src/pages/TeamPage/components/MatchTimeline.tsx
import { Link } from 'react-router-dom';
import { Flag } from '@/components/ui/Flag';
import type { Match } from '@/data/types';
import { formatDate } from '@/utils/formatDate';
import { toMatchSlug } from '@/utils/matchSlug';

export function MatchTimeline({ matches, teamName }: { matches: Match[]; teamName: string }) {
  const items = matches.filter((m) => m.status === 'finished').slice(-5);
  if (!items.length) return <div className="text-text-dim text-sm">No previous matches.</div>;

  return (
    <ol className="relative pl-3 border-l border-white/10 space-y-4">
      {items.map((m) => {
        const opp = m.home.teamId === teamName ? m.away : m.home;
        return (
          <li key={m.id} className="relative">
            <span className="absolute -left-[7px] top-2 w-3 h-3 rounded-full bg-gold" />
            <Link
              to={`/match/${toMatchSlug(m)}`}
              className="block rounded-xl bg-bg-elev1/40 border border-white/8 backdrop-blur-md p-3 flex items-center gap-3 hover:bg-bg-elev1/60 transition-colors"
            >
              <Flag countryCode={opp.countryCode} size="md" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-text truncate">vs {opp.name}</div>
                <div className="text-[11px] text-text-dim">{formatDate(m.kickoff)}</div>
              </div>
              <div className="font-display text-xl text-text">
                {m.home.score}-{m.away.score}
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 3: Wrap upcoming carousel cards in `MatchesTab` in `<Link>`**

Replace entire file:

```tsx
// src/pages/TeamPage/tabs/MatchesTab.tsx
import { Link } from 'react-router-dom';
import type { Team, Match } from '@/data/types';
import { MatchTimeline } from '../components/MatchTimeline';
import { Flag } from '@/components/ui/Flag';
import { formatDate } from '@/utils/formatDate';
import { toMatchSlug } from '@/utils/matchSlug';

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
                <li key={m.id} className="shrink-0">
                  <Link
                    to={`/match/${toMatchSlug(m)}`}
                    className="block w-64 rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md hover:bg-bg-elev1/60 transition-colors"
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
                  </Link>
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

- [ ] **Step 4: Type-check + build**

Run: `npx tsc -b --noEmit`
Run: `npx vite build`
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/routes.tsx src/pages/TeamPage/components/MatchTimeline.tsx src/pages/TeamPage/tabs/MatchesTab.tsx
git commit -m "match-page: mount /match/:slug route + link team-page match cards to it"
```

---

## Task 13: Manual verification

**Files:** none.

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`

- [ ] **Step 2: Click-through from team page**

Open `/team/brazil`. Click a finished match in the Matches tab timeline.
Expected: navigates to `/match/brazil-vs-…-YYYY-MM-DD`, hero renders
with both flags, score, stage, kickoff.

- [ ] **Step 3: Six tabs render**

Click each tab. Underline animates between tabs. URL hash updates.

- [ ] **Step 4: H2H tab**

For a team with prior meetings (e.g. Brazil ↔ Argentina), totals
render. For a team without (e.g. Canada ↔ Haiti), "No previous
meetings on record." text appears.

- [ ] **Step 5: Top Scorers tab**

Brazil-side lists Pelé, Vavá, Jairzinho-era names; "Active 2026"
badge attaches to any current Brazil squad member whose name ends
with a scorer's surname.

- [ ] **Step 6: Previous Meetings tab**

Click any historical row. It expands to show stadium, attendance,
referee, and an event timeline (goals, cards, subs).

- [ ] **Step 7: Squad Comparison tab**

Both columns populate from `squads.json` with avg age + intl goals
totals.

- [ ] **Step 8: Recent Form tab**

Pills draw on screen entry. Each pill shows opponent flag + score.

- [ ] **Step 9: Unknown slug**

`/match/xyz` → "Match not found" + back-home button.

- [ ] **Step 10: Upcoming match**

For an upcoming fixture, hero shows the `Countdown` instead of a
score; "FT" pill is replaced by "LIVE" or countdown depending on
status.

- [ ] **Step 11: Mobile**

DevTools mobile mode. Hero stacks vertically, tabs horizontal-scroll,
previous-meeting rows still expand.

- [ ] **Step 12: Empty history JSON**

Rename `public/data/match-history.json` to `.bak`, hard-reload
`/match/<any>`. Expected: Overview still works, H2H / Top Scorers /
Previous Meetings show empty-state text; no console errors. Restore
the file when done.

- [ ] **Step 13: tsc + build sanity**

Run: `npx tsc -b --noEmit` (clean)
Run: `npx vite build` (clean)

---

## Self-review checklist

- [ ] Spec coverage: every spec section maps to a task (routing → T1 + T12, history types → T2, scraper → T3, history adapter+hook → T4, composite hook → T5, components → T6, hero → T7, tabs bar → T8, six tab contents → T9 + T10, page shell → T11, route + link-up → T12, verify → T13).
- [ ] No placeholders.
- [ ] Type consistency: `Match`, `HistoricalMatch`, `Scorer`, `MatchTabKey`, `toMatchSlug` used the same way across tasks.
- [ ] Exact file paths in every Files block.
- [ ] Every task ends in a commit.
