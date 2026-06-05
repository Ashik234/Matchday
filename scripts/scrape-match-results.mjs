#!/usr/bin/env node
// Scrape final-result data for WC2026 matches that finished today (or in a
// configurable look-back window) from BBC Sport, and write a manifest at
// public/data/match-results.json keyed by toMatchSlug() so the React UI can
// hydrate <MatchHero> + the home "FT" badges.
//
// Sources:
//  - openfootball/worldcup JSON → canonical fixture list (team names + dates)
//  - BBC daily scoreboard       → final scores + goalscorers
//
// Self-gates outside the WC2026 window (2026-06-11 .. 2026-07-19). Outside
// that range the script exits in <1sec with `[skip] outside WC window`.
//
// Usage:
//   node scripts/scrape-match-results.mjs
//   node scripts/scrape-match-results.mjs --date 2026-06-11
//   node scripts/scrape-match-results.mjs --lookback 3   (today + 3 prior days)

import puppeteer from 'puppeteer';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUTPUT = resolve(ROOT, 'public', 'data', 'match-results.json');

const OF_MATCHES =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
const BBC_BASE = 'https://www.bbc.com/sport/football/world-cup/scores-fixtures';

const WC_START = '2026-06-11';
const WC_END = '2026-07-19';
const NAV_TIMEOUT = 60_000;

// ─── CLI ─────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
function argvValue(name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
}

const overrideDate = argvValue('--date');
const lookback = Number(argvValue('--lookback') ?? '1');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateStr, deltaDays) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function withinWindow(dateStr) {
  return dateStr >= WC_START && dateStr <= WC_END;
}

function toSlug(s) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function toMatchId(home, away, dateIso) {
  return `${toSlug(home)}-vs-${toSlug(away)}-${dateIso.slice(0, 10)}`;
}

// Some name drift between openfootball and BBC.
const NAME_ALIASES = {
  'Bosnia & Herzegovina': ['Bosnia and Herzegovina', 'Bosnia-Herzegovina'],
  'Korea Republic': ['South Korea'],
  'IR Iran': ['Iran'],
  'United States': ['USA'],
  "Côte d'Ivoire": ['Ivory Coast'],
  'Cape Verde Islands': ['Cape Verde', 'Cabo Verde'],
  'Türkiye': ['Turkey'],
};

function normalizeName(name) {
  const lower = name.toLowerCase().trim();
  for (const [canonical, alts] of Object.entries(NAME_ALIASES)) {
    if (canonical.toLowerCase() === lower) return canonical;
    if (alts.some((a) => a.toLowerCase() === lower)) return canonical;
  }
  return name.trim();
}

// ─── Fixture lookup ──────────────────────────────────────────────────────────

async function fetchFixtures() {
  const res = await fetch(OF_MATCHES);
  if (!res.ok) throw new Error(`openfootball ${res.status}`);
  const json = await res.json();
  const out = new Map(); // matchId → { home, away, kickoff }
  for (const m of json.matches ?? []) {
    if (!m.team1 || !m.team2 || !m.date) continue;
    const kickoff = m.time ? `${m.date}T${m.time}:00Z` : `${m.date}T00:00:00Z`;
    const id = toMatchId(m.team1, m.team2, m.date);
    out.set(id, { home: m.team1, away: m.team2, kickoff, date: m.date });
  }
  return out;
}

// ─── BBC scrape ─────────────────────────────────────────────────────────────

async function scrapeBbcDay(page, date) {
  const url = `${BBC_BASE}/${date}`;
  console.log(`[bbc] ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2' });
  // Wait a beat for hydration.
  await new Promise((r) => setTimeout(r, 1500));

  return page.evaluate(() => {
    // BBC uses several layout patterns; this captures the most common one
    // (data-testid attributes on the live-events/results timeline).
    const out = [];

    // Each match card lives in an article-like wrapper. Selectors below are
    // resilient to mild markup churn: anything with a "fixture" or "results"
    // testid containing a score pair.
    const cards = document.querySelectorAll(
      '[data-testid*="match"], [data-testid*="fixture"], [data-testid*="result"], li:has(span[class*="Score"])',
    );

    for (const card of cards) {
      const text = card.textContent || '';
      const teamEls = card.querySelectorAll(
        '[class*="TeamName"], [class*="team-name"], [data-testid*="team-name"]',
      );
      const scoreEls = card.querySelectorAll(
        '[class*="Score"], [class*="score"], [data-testid*="score"]',
      );
      if (teamEls.length < 2 || scoreEls.length < 2) continue;

      const home = (teamEls[0].textContent || '').trim();
      const away = (teamEls[1].textContent || '').trim();
      const homeScoreText = (scoreEls[0].textContent || '').trim();
      const awayScoreText = (scoreEls[1].textContent || '').trim();
      const homeScore = parseInt(homeScoreText, 10);
      const awayScore = parseInt(awayScoreText, 10);
      if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) continue;

      const statusEl = card.querySelector(
        '[class*="Status"], [data-testid*="status"], time',
      );
      const rawStatus = (statusEl?.textContent || '').trim().toUpperCase();
      let status = 'FT';
      if (/\bAET\b|EXTRA TIME/.test(rawStatus)) status = 'AET';
      else if (/\bPEN\b|PENALTIES/.test(rawStatus)) status = 'PEN';
      else if (/FULL[- ]?TIME|^FT$/.test(rawStatus)) status = 'FT';
      else if (!/FT|HT|AET|PEN/.test(rawStatus + ' ' + text)) {
        // Not finished — skip.
        continue;
      }

      // Goalscorers: BBC lists them in a sibling list. Capture player + minute.
      const scorerEls = card.querySelectorAll(
        '[class*="Scorer"], [class*="scorer"], [data-testid*="scorer"]',
      );
      const scorers = [];
      let teamPivot = 'home';
      for (const s of scorerEls) {
        const t = (s.textContent || '').trim();
        if (!t) continue;
        // Heuristic: BBC groups scorers under each team in order.
        // Format example: "L. Messi 23', 67' (pen)"
        const minuteMatches = t.match(/(\d{1,3})(\+\d+)?(?:\s*\(?(pen|og)\)?)?/gi) || [];
        const playerName = t.replace(/\d{1,3}(\+\d+)?(\s*\(?(pen|og)\)?)?/gi, '').trim();
        for (const mm of minuteMatches) {
          const m = mm.match(/(\d{1,3})(?:\+(\d+))?(?:\s*\(?(pen|og)\)?)?/i);
          if (!m) continue;
          scorers.push({
            player: playerName,
            minute: parseInt(m[1], 10),
            stoppage: m[2] ? parseInt(m[2], 10) : undefined,
            team: teamPivot,
            penalty: /pen/i.test(m[3] || ''),
            ownGoal: /og/i.test(m[3] || ''),
          });
        }
        // Crude: alternate team for next scorer block. Real markup may group
        // them in two columns; refine if validation shows misattribution.
        teamPivot = teamPivot === 'home' ? 'away' : 'home';
      }

      out.push({ home, away, homeScore, awayScore, status, scorers });
    }
    return out;
  });
}

// ─── Diff helper ────────────────────────────────────────────────────────────

function resultsEqual(a, b) {
  if (!a || !b) return false;
  if (a.status !== b.status) return false;
  if (a.homeScore !== b.homeScore) return false;
  if (a.awayScore !== b.awayScore) return false;
  if (a.homePenScore !== b.homePenScore) return false;
  if (a.awayPenScore !== b.awayPenScore) return false;
  if ((a.scorers?.length ?? 0) !== (b.scorers?.length ?? 0)) return false;
  return true;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const today = overrideDate ?? todayUtc();
  if (!withinWindow(today) && !overrideDate) {
    console.log(`[skip] today ${today} is outside WC window ${WC_START}..${WC_END}`);
    return;
  }

  const dates = [];
  for (let i = 0; i <= lookback; i++) {
    const d = shiftDate(today, -i);
    if (withinWindow(d) || overrideDate) dates.push(d);
  }
  console.log(`[dates] ${dates.join(', ')}`);

  const fixtures = await fetchFixtures();
  console.log(`[fixtures] ${fixtures.size} matches in openfootball roster`);

  const existing = existsSync(OUTPUT)
    ? JSON.parse(await readFile(OUTPUT, 'utf8'))
    : { scrapedAt: null, source: BBC_BASE, results: {} };
  const out = {
    scrapedAt: new Date().toISOString(),
    source: BBC_BASE,
    results: { ...existing.results },
  };

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  let newOrChanged = 0;
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    );
    page.setDefaultNavigationTimeout(NAV_TIMEOUT);

    for (const date of dates) {
      const cards = await scrapeBbcDay(page, date);
      console.log(`[bbc ${date}] parsed ${cards.length} candidate cards`);

      for (const c of cards) {
        // Match against openfootball fixture using normalized names.
        const homeN = normalizeName(c.home);
        const awayN = normalizeName(c.away);
        const id = toMatchId(homeN, awayN, date);
        if (!fixtures.has(id)) {
          // Not a WC2026 match (BBC mixes other comps occasionally).
          continue;
        }
        const result = {
          matchId: id,
          status: c.status,
          homeScore: c.homeScore,
          awayScore: c.awayScore,
          scorers: c.scorers,
          finishedAt: new Date().toISOString(),
        };
        if (!resultsEqual(out.results[id], result)) {
          out.results[id] = result;
          newOrChanged++;
          console.log(`[result] ${id} ${result.homeScore}-${result.awayScore} ${result.status}`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(out, null, 2), 'utf8');
  console.log(`[done] ${newOrChanged} new/changed results · total ${Object.keys(out.results).length}`);
}

main().catch((err) => {
  console.error('[scrape] failed:', err);
  process.exit(1);
});
