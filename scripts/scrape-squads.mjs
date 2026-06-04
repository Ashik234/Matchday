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

const norm = (s) => (s || '').toLowerCase().trim();

async function fetchWcTeamCodes() {
  const res = await fetch(WC_TEAMS_URL);
  if (!res.ok) throw new Error(`WC teams ${res.status}`);
  const teams = await res.json();
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
      const out = [];
      const headings = Array.from(document.querySelectorAll('h3, h2'));
      for (const h of headings) {
        const name = (h.textContent || '').replace(/\[edit\]/gi, '').trim();
        if (!name) continue;
        // Modern Wikipedia wraps headings in <div class="mw-heading">; the
        // wikitable is a sibling of THAT div, not of the h3 itself.
        const startEl = h.closest('.mw-heading') || h;
        let el = startEl.nextElementSibling;
        let hops = 0;
        while (el && hops < 8 && !(el.matches && el.matches('table.wikitable'))) {
          el = el.nextElementSibling;
          hops++;
        }
        if (!el || !el.matches('table.wikitable')) continue;
        const rows = Array.from(el.querySelectorAll('tbody tr'));
        const players = [];
        for (const tr of rows) {
          // Row layout: td(No) td(Pos) th(Name) td(DoB) td(Caps) td(Goals) td(Club)
          const tds = Array.from(tr.querySelectorAll('td'));
          const nameTh = tr.querySelector('th[scope="row"]');
          if (tds.length < 6 || !nameTh) continue;
          const [noCell, posCell, dobCell, capsCell, goalsCell, clubCell] = tds;
          const jersey = parseInt((noCell?.textContent || '').trim(), 10);
          const posRaw = (posCell?.textContent || '').trim().toUpperCase();
          const pos = posRaw.replace(/[^A-Z]/g, '').slice(-2);
          const playerName = (nameTh?.textContent || '').replace(/\s+/g, ' ').trim();
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
