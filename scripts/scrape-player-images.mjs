#!/usr/bin/env node
// Generate SVG portraits for every WC squad player.
// - Curated stars (~50) get hand-picked motifs from scripts/data/player-motifs.json.
// - Long tail gets deterministic motif derived from name+jersey hash.
// Outputs:
//   public/images/players/<iso>-<jersey>-<slug>.svg
//   public/data/player-images.json   (manifest mapping Player.id → image entry)
//
// Usage:
//   node scripts/scrape-player-images.mjs                 (full rebuild)
//   node scripts/scrape-player-images.mjs --team ARG
//   node scripts/scrape-player-images.mjs --player BRA-10

import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPortraitSvg } from './lib/motif-svg.mjs';
import { countryMeta } from './lib/country-meta.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SQUADS_PATH = resolve(ROOT, 'public', 'data', 'squads.json');
const MOTIFS_PATH = resolve(__dirname, 'data', 'player-motifs.json');
const MANIFEST_PATH = resolve(ROOT, 'public', 'data', 'player-images.json');
const IMG_DIR = resolve(ROOT, 'public', 'images', 'players');
const WC_TEAMS_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.teams.json';

const argv = process.argv.slice(2);
const flags = {
  team: argvValue('--team'),
  player: argvValue('--player'),
  clean: argv.includes('--clean'),
};
function argvValue(name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
}

// Flag colors per ISO code — copied from src/utils/flagColors.ts because the
// build-time script can't import TS directly.
const FLAG_COLORS = {
  fr:        ['#0055A4', '#FFFFFF', '#EF4135'],
  es:        ['#AA151B', '#F1BF00'],
  ar:        ['#74ACDF', '#FFFFFF', '#F6B40E'],
  'gb-eng':  ['#FFFFFF', '#CE1124'],
  pt:        ['#006600', '#FF0000', '#FFD700'],
  de:        ['#000000', '#DD0000', '#FFCE00'],
  nl:        ['#AE1C28', '#FFFFFF', '#21468B'],
  be:        ['#000000', '#FAE042', '#ED2939'],
  hr:        ['#FF0000', '#FFFFFF', '#0F1F4F'],
  ch:        ['#FF0000', '#FFFFFF'],
  cz:        ['#FFFFFF', '#D7141A', '#11457E'],
  at:        ['#ED2939', '#FFFFFF'],
  no:        ['#EF2B2D', '#FFFFFF', '#002868'],
  se:        ['#006AA7', '#FECC00'],
  ba:        ['#002F6C', '#FFCC00', '#FFFFFF'],
  pl:        ['#FFFFFF', '#DC143C'],
  tr:        ['#E30A17', '#FFFFFF'],
  'gb-sct':  ['#005EB8', '#FFFFFF'],
  it:        ['#008C45', '#FFFFFF', '#CD212A'],
  br:        ['#FEDF00', '#009C3B', '#002776'],
  uy:        ['#7B9FE5', '#FFFFFF', '#FCD116'],
  co:        ['#FCD116', '#003893', '#CE1126'],
  ec:        ['#FFD100', '#0072CE', '#EF3340'],
  py:        ['#D52B1E', '#FFFFFF', '#0038A8'],
  jp:        ['#FFFFFF', '#BC002D'],
  kr:        ['#FFFFFF', '#CD2E3A', '#0047A0'],
  ir:        ['#239F40', '#FFFFFF', '#DA0000'],
  iq:        ['#CE1126', '#FFFFFF', '#000000'],
  sa:        ['#006C35', '#FFFFFF'],
  qa:        ['#8D1B3D', '#FFFFFF'],
  au:        ['#012169', '#FFFFFF', '#E4002B'],
  uz:        ['#0099B5', '#FFFFFF', '#1EB53A'],
  jo:        ['#000000', '#FFFFFF', '#007A3D', '#CE1126'],
  ma:        ['#C1272D', '#006233'],
  eg:        ['#CE1126', '#FFFFFF', '#000000'],
  sn:        ['#00853F', '#FDEF42', '#E31B23'],
  za:        ['#007A4D', '#FCB514', '#000000', '#DE3831', '#002395'],
  tn:        ['#E70013', '#FFFFFF'],
  gh:        ['#CE1126', '#FCD116', '#006B3F', '#000000'],
  ci:        ['#F77F00', '#FFFFFF', '#009E60'],
  dz:        ['#006233', '#FFFFFF', '#D21034'],
  cv:        ['#003893', '#FFFFFF', '#CF2027', '#F7D116'],
  cd:        ['#007FFF', '#F7D618', '#CE1126'],
  us:        ['#3C3B6E', '#FFFFFF', '#B22234'],
  mx:        ['#006847', '#FFFFFF', '#CE1126'],
  ca:        ['#FF0000', '#FFFFFF'],
  ht:        ['#00209F', '#D21034'],
  pa:        ['#005AA7', '#FFFFFF', '#D21034'],
  cw:        ['#012169', '#FFD100', '#FFFFFF'],
  nz:        ['#012169', '#FFFFFF', '#C8102E'],
};

// Some FIFA squad codes differ from the COUNTRY_META keys. Map them.
const TEAM_CODE_ALIASES = {
  KSA: 'SAU',
  ALG: 'DZA',
  COD: 'DRC',
  IRQ: 'IRQ',
  SUI: 'SUI',
};

// ISO codes for squad codes not in country-meta.
const SQUAD_ISO_FALLBACK = {
  KSA: 'sa',
  ALG: 'dz',
  COD: 'cd',
  IRQ: 'iq',
  SUI: 'ch',
};

function isoForTeam(teamCode) {
  const meta = countryMeta(TEAM_CODE_ALIASES[teamCode] ?? teamCode);
  if (meta) return meta.iso;
  return SQUAD_ISO_FALLBACK[teamCode] ?? null;
}

function slug(s) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function cleanName(name) {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

async function loadMotifs() {
  if (!existsSync(MOTIFS_PATH)) return {};
  const raw = JSON.parse(await readFile(MOTIFS_PATH, 'utf8'));
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!k.startsWith('_')) out[k] = v;
  }
  // Validate motif uniqueness across curated entries.
  const seen = new Map();
  for (const [playerId, entry] of Object.entries(out)) {
    if (!entry.motif) continue;
    if (seen.has(entry.motif)) {
      throw new Error(
        `[motif-uniqueness] motif "${entry.motif}" reused: ${seen.get(entry.motif)} and ${playerId}`,
      );
    }
    seen.set(entry.motif, playerId);
  }
  return out;
}

async function fetchWcTeamCodes() {
  const res = await fetch(WC_TEAMS_URL);
  if (!res.ok) throw new Error(`worldcup.teams.json ${res.status}`);
  const teams = await res.json();
  return new Set(teams.map((t) => t.fifa_code));
}

async function cleanImgDir() {
  if (!existsSync(IMG_DIR)) return;
  const entries = await readdir(IMG_DIR);
  for (const f of entries) await rm(resolve(IMG_DIR, f));
  console.log(`[clean] removed ${entries.length} files from ${IMG_DIR}`);
}

async function renderOne(player, motifs) {
  const iso = isoForTeam(player.teamCode);
  if (!iso) {
    console.warn(`[skip] no ISO mapping for ${player.teamCode}`);
    return null;
  }
  const cn = cleanName(player.name);
  const fileSlug = `${iso}-${player.jersey}-${slug(cn)}`;
  const motifEntry = motifs[player.id] ?? null;
  const flagColors = FLAG_COLORS[iso] ?? ['#1a1a1a', '#3a3a3a'];

  const svg = renderPortraitSvg({
    name: cn,
    jersey: player.jersey,
    flagColors,
    motif: motifEntry?.motif ?? null,
    signature: motifEntry?.signature ?? null,
    accent: motifEntry?.accent ?? null,
  });

  const outPath = resolve(IMG_DIR, `${fileSlug}.svg`);
  await writeFile(outPath, svg);

  return {
    url: `/images/players/${fileSlug}.svg`,
    width: 600,
    height: 800,
    source: motifEntry ? 'motif-curated' : 'motif-default',
    hash: '',
    generatedAt: new Date().toISOString(),
    attribution: '',
  };
}

async function main() {
  await mkdir(IMG_DIR, { recursive: true });
  if (flags.clean) await cleanImgDir();

  const squads = JSON.parse(await readFile(SQUADS_PATH, 'utf8'));
  const motifs = await loadMotifs();
  const wcTeams = await fetchWcTeamCodes();
  console.log(`[wc-teams] ${wcTeams.size} teams in WC2026 roster`);

  // Drop squads not in WC2026 (defensive — squads.json should already be filtered).
  const skipped = [];
  for (const code of Object.keys(squads.teams)) {
    if (!wcTeams.has(code)) skipped.push(code);
  }
  if (skipped.length) console.log(`[skip] non-WC2026 teams in squads: ${skipped.join(', ')}`);

  const out = { generatedAt: new Date().toISOString(), players: {} };

  let curated = 0;
  let total = 0;

  for (const [code, team] of Object.entries(squads.teams)) {
    if (!wcTeams.has(code)) continue;
    if (flags.team && code !== flags.team) continue;
    for (const player of team.players) {
      if (flags.player && player.id !== flags.player) continue;
      const entry = await renderOne(player, motifs);
      if (entry) {
        out.players[player.id] = entry;
        total++;
        if (entry.source === 'motif-curated') curated++;
      }
    }
  }

  await writeFile(MANIFEST_PATH, JSON.stringify(out, null, 2));
  console.log(`[done] ${total} portraits written (${curated} curated, ${total - curated} default)`);
  console.log(`[manifest] ${MANIFEST_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
