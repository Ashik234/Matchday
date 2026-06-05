#!/usr/bin/env node
// Scrape jfjelstul/worldcup CSVs → public/data/match-history.json (trimmed).
// Usage: pnpm run scrape:matches
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, '..', 'public', 'data', 'match-history.json');
const BASE = 'https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-csv';

const FILES = {
  matches: `${BASE}/matches.csv`,
  goals: `${BASE}/goals.csv`,
  bookings: `${BASE}/bookings.csv`,
  substitutions: `${BASE}/substitutions.csv`,
  tournaments: `${BASE}/tournaments.csv`,
  teams: `${BASE}/teams.csv`,
};

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
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQ = false; }
        else { cur += ch; }
      } else if (ch === ',') { out.push(cur); cur = ''; }
      else if (ch === '"') { inQ = true; }
      else { cur += ch; }
    }
    out.push(cur);
    return out;
  };
  const headers = splitRow(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitRow(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
}

async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return parseCsv(await res.text());
}

function isMensWc(name) {
  return /FIFA (Men's )?World Cup/i.test(name) && !/Women/i.test(name);
}

function trimReferee(s) { return s && s !== 'NA' ? s : undefined; }
function trimAttendance(s) {
  if (!s || s === 'NA') return undefined;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? undefined : n;
}
function classifyBooking(row) {
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

  const tourneyName = new Map(tournaments.map((t) => [t.tournament_id, t.tournament_name]));
  const teamInfo = new Map(teams.map((t) => [t.team_id, { code: t.team_code || t.team_id, name: t.team_name || t.team_code }]));

  const wcMatchIds = new Set();
  for (const m of matches) {
    if (!isMensWc(tourneyName.get(m.tournament_id) ?? '')) continue;
    wcMatchIds.add(m.match_id);
  }

  const groupBy = (rows) => {
    const map = new Map();
    for (const r of rows) {
      if (!wcMatchIds.has(r.match_id)) continue;
      const arr = map.get(r.match_id) ?? [];
      arr.push(r);
      map.set(r.match_id, arr);
    }
    return map;
  };
  const goalsBy = groupBy(goals);
  const bookingsBy = groupBy(bookings);
  const subsBy = groupBy(subs);

  const out = [];
  for (const m of matches) {
    const tournament = tourneyName.get(m.tournament_id);
    if (!tournament || !isMensWc(tournament)) continue;

    const home = teamInfo.get(m.home_team_id) ?? { code: m.home_team_code ?? 'UNK', name: m.home_team_name ?? 'Unknown' };
    const away = teamInfo.get(m.away_team_id) ?? { code: m.away_team_code ?? 'UNK', name: m.away_team_name ?? 'Unknown' };

    const events = [];
    for (const g of goalsBy.get(m.match_id) ?? []) {
      const minute = parseInt(g.minute_regulation || g.minute_label || '0', 10);
      const type = g.penalty === '1' ? 'penalty' : g.own_goal === '1' ? 'own-goal' : 'goal';
      const teamCode = teamInfo.get(g.team_id)?.code ?? g.team_id;
      events.push({ minute, type, teamCode, player: g.player_name ?? `${g.given_name} ${g.family_name}` });
    }
    for (const b of bookingsBy.get(m.match_id) ?? []) {
      const type = classifyBooking(b);
      if (!type) continue;
      const minute = parseInt(b.minute_regulation || b.minute_label || '0', 10);
      const teamCode = teamInfo.get(b.team_id)?.code ?? b.team_id;
      events.push({ minute, type, teamCode, player: b.player_name ?? `${b.given_name} ${b.family_name}` });
    }
    for (const s of subsBy.get(m.match_id) ?? []) {
      const minute = parseInt(s.minute_regulation || s.minute_label || '0', 10);
      const teamCode = teamInfo.get(s.team_id)?.code ?? s.team_id;
      const playerIn = s.player_name ?? `${s.given_name} ${s.family_name}`;
      events.push({
        minute, type: 'sub', teamCode, player: playerIn,
        detail: s.coming_off_player_name ? `for ${s.coming_off_player_name}` : undefined,
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

  const payload = { scrapedAt: new Date().toISOString(), matches: out };
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(payload), 'utf8');
  console.log(`[matches] wrote ${OUTPUT}`);
}

scrape().catch((err) => {
  console.error('[matches] failed:', err);
  process.exit(1);
});
