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

// Flag colors per ISO code — copied from src/utils/flagColors.ts so the build-time
// scraper doesn't need a TS→JS bridge.
const FLAG_COLORS = {
  // UEFA
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
  // CONMEBOL
  br:        ['#FEDF00', '#009C3B', '#002776'],
  uy:        ['#7B9FE5', '#FFFFFF', '#FCD116'],
  co:        ['#FCD116', '#003893', '#CE1126'],
  ec:        ['#FFD100', '#0072CE', '#EF3340'],
  py:        ['#D52B1E', '#FFFFFF', '#0038A8'],
  // AFC
  jp:        ['#FFFFFF', '#BC002D'],
  kr:        ['#FFFFFF', '#CD2E3A', '#0047A0'],
  ir:        ['#239F40', '#FFFFFF', '#DA0000'],
  iq:        ['#CE1126', '#FFFFFF', '#000000'],
  sa:        ['#006C35', '#FFFFFF'],
  qa:        ['#8D1B3D', '#FFFFFF'],
  au:        ['#012169', '#FFFFFF', '#E4002B'],
  uz:        ['#0099B5', '#FFFFFF', '#1EB53A'],
  jo:        ['#000000', '#FFFFFF', '#007A3D', '#CE1126'],
  // CAF
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
  // CONCACAF
  us:        ['#3C3B6E', '#FFFFFF', '#B22234'],
  mx:        ['#006847', '#FFFFFF', '#CE1126'],
  ca:        ['#FF0000', '#FFFFFF'],
  ht:        ['#00209F', '#D21034'],
  pa:        ['#005AA7', '#FFFFFF', '#D21034'],
  cw:        ['#012169', '#FFD100', '#FFFFFF'],
  // OFC
  nz:        ['#012169', '#FFFFFF', '#C8102E'],
};
function flagColorsFor(iso) {
  return FLAG_COLORS[iso] ?? ['#1a1a1a', '#3a3a3a'];
}

function slug(s) {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return { generatedAt: new Date().toISOString(), players: {} };
  return JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
}

async function resolveOne(player, existing) {
  const id = player.id;
  if (!flags.force && existing.players[id]) return existing.players[id];

  const meta = countryMeta(player.teamCode);
  if (!meta) {
    console.warn(`[skip] no country meta for ${player.teamCode}`);
    return null;
  }

  // Strip parenthetical suffixes like "(captain)" / "(vice-captain)" before
  // Wikidata lookup — SPARQL rdfs:label does exact match, and the squad scrape
  // includes captain markers that no Wikidata entity has in its label.
  const cleanName = player.name.replace(/\s*\([^)]*\)\s*$/, '').trim();

  let chosen = null;
  try {
    const qid = await findPlayerQid(cleanName, meta.qid);
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

  const fileSlug = `${meta.iso}-${player.jersey}-${slug(cleanName)}`;

  if (chosen) {
    try {
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
    } catch (err) {
      console.warn(`[download-fail] ${id} ${chosen.filename}: ${err.message}`);
      // Fall through to fallback SVG
    }
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
      const entry = await resolveOne(player, existing);
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
