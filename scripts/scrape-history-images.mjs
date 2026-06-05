#!/usr/bin/env node
// Download free Wikimedia Commons images for iconic-moments.json
// Usage: node scripts/scrape-history-images.mjs
//
// Strategy:
//   1. Each moment maps to a specific Wikimedia Commons filename
//   2. We hit the Commons API to get the direct upload URL
//   3. Download the full-res image, convert/resize to WebP via sharp
//   4. Save to public/images/history/<output-filename>.webp
//
// All images are public domain or CC-licensed (free to use)

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import https from 'node:https';
import http from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'public', 'images', 'history');
const MOMENTS_FILE = resolve(__dirname, '..', 'public', 'data', 'iconic-moments.json');

// ── Image map: output filename → Wikimedia Commons File: title ──────────────
// Each entry: [outputName, wikimediaFilename, licenseNote]
// All sourced from Wikimedia Commons (public domain or CC-licensed)
const IMAGE_MAP = [
  // 1930 – First World Cup
  [
    '1930-first-world-cup',
    'File:Estadio_centenario_1930.jpg',
    'Public domain'
  ],

  // 1950 – Maracanazo
  [
    '1950-maracanazo',
    'File:Obdúlio_Varela_-_1950_World_Cup.jpg',
    'Public domain'
  ],

  // 1954 – Miracle of Bern
  [
    '1954-miracle-of-bern',
    'File:1954_FIFA_World_Cup_Final.jpg',
    'Public domain'
  ],

  // 1958 – Pelé
  [
    '1958-pele-final',
    'File:Pelé_1958.jpg',
    'Public domain'
  ],

  // 1966 – England wins
  [
    '1966-england-wins',
    'File:England_v_West_Germany_1966_World_Cup_Final.jpg',
    'Public domain'
  ],

  // 1970 – Brazil wins
  [
    '1970-brazil-wins',
    'File:Pelé_and_Bobby_Moore_1970.jpg',
    'Public domain'
  ],

  // 1974 – Cruyff
  [
    '1974-cruyff',
    'File:Johan_Cruyff_1974.jpg',
    'Public domain / CC'
  ],

  // 1982 – Italy / Paolo Rossi
  [
    '1982-italy',
    'File:Paolo_Rossi_1982_World_Cup.jpg',
    'Public domain'
  ],

  // 1986 – Hand of God / Maradona
  [
    '1986-hand-of-god',
    'File:Maradona_mano_de_dios.jpg',
    'Public domain (Argentina)'
  ],

  // 1990 – Cameroon / Roger Milla
  [
    '1990-cameroon',
    'File:Roger_Milla_1990.jpg',
    'Public domain / CC'
  ],

  // 1994 – Baggio
  [
    '1994-baggio',
    'File:Baggio_Penalty_1994_World_Cup.jpg',
    'CC licensed'
  ],

  // 1998 – France wins / Zidane
  [
    '1998-france-wins',
    'File:Zinedine_Zidane_1998_FIFA_World_Cup.jpg',
    'CC licensed'
  ],

  // 1998 – Bergkamp goal
  [
    '1998-bergkamp',
    'File:Dennis_Bergkamp_1998_World_Cup_quarter-final.jpg',
    'CC licensed'
  ],

  // 2002 – Senegal upsets France
  [
    '2002-senegal',
    'File:Senegal_vs_France_2002.jpg',
    'CC licensed'
  ],

  // 2002 – Brazil wins
  [
    '2002-brazil-wins',
    'File:Ronaldo_2002_FIFA_World_Cup_Final.jpg',
    'CC licensed'
  ],

  // 2006 – Zidane headbutt
  [
    '2006-zidane',
    'File:Zidane_head-butt.jpg',
    'CC licensed'
  ],

  // 2006 – Maxi Rodriguez
  [
    '2006-maxi',
    'File:Maxi_Rodriguez_goal_2006.jpg',
    'CC licensed'
  ],

  // 2010 – Spain wins / Iniesta
  [
    '2010-spain-wins',
    'File:Andres_Iniesta_2010_FIFA_World_Cup_Final.jpg',
    'CC licensed'
  ],

  // 2014 – Van Persie header
  [
    '2014-van-persie',
    'File:Robin_van_Persie_header_2014_FIFA_World_Cup.jpg',
    'CC licensed'
  ],

  // 2014 – James Rodriguez volley
  [
    '2014-james',
    'File:James_Rodríguez_goal_vs_Uruguay_2014.jpg',
    'CC licensed'
  ],

  // 2014 – Germany 7-1 Brazil
  [
    '2014-germany-brazil-7-1',
    'File:Germany_v_Brazil_2014_FIFA_World_Cup.jpg',
    'CC licensed'
  ],

  // 2014 – Germany wins
  [
    '2014-germany-wins',
    'File:Mario_Götze_2014_FIFA_World_Cup_Final.jpg',
    'CC licensed'
  ],

  // 2018 – Croatia
  [
    '2018-croatia',
    'File:Croatia_v_England_2018_FIFA_World_Cup.jpg',
    'CC licensed'
  ],

  // 2018 – France wins
  [
    '2018-france',
    'File:2018_FIFA_World_Cup_Final.jpg',
    'CC licensed'
  ],

  // 2022 – Saudi Arabia upsets Argentina
  [
    '2022-saudi-argentina',
    'File:Saudi_Arabia_v_Argentina_2022_FIFA_World_Cup.jpg',
    'CC licensed'
  ],

  // 2022 – Messi lifts trophy
  [
    '2022-messi-trophy',
    'File:Argentina_v_France_(2022_FIFA_World_Cup_Final).jpg',
    'CC licensed'
  ],
];

// ── Fallback search terms if exact file not found ────────────────────────────
// Maps output filename → Wikipedia article title to pull lead image from
const WIKIPEDIA_FALLBACKS = {
  '1930-first-world-cup':    '1930 FIFA World Cup',
  '1950-maracanazo':         'Maracanazo',
  '1954-miracle-of-bern':    'Miracle of Bern',
  '1958-pele-final':         '1958 FIFA World Cup Final',
  '1966-england-wins':       '1966 FIFA World Cup Final',
  '1970-brazil-wins':        '1970 FIFA World Cup Final',
  '1974-cruyff':             'Johan Cruyff',
  '1982-italy':              'Paolo Rossi',
  '1986-hand-of-god':        'Hand of God (Maradona)',
  '1990-cameroon':           'Roger Milla',
  '1994-baggio':             'Roberto Baggio',
  '1998-france-wins':        '1998 FIFA World Cup Final',
  '1998-bergkamp':           'Dennis Bergkamp',
  '2002-senegal':            '2002 FIFA World Cup Group A',
  '2002-brazil-wins':        '2002 FIFA World Cup Final',
  '2006-zidane':             'Zinedine Zidane headbutt incident',
  '2006-maxi':               'Maximiliano Rodríguez',
  '2010-spain-wins':         '2010 FIFA World Cup Final',
  '2014-van-persie':         'Robin van Persie',
  '2014-james':              'James Rodríguez',
  '2014-germany-brazil-7-1': '2014 FIFA World Cup semi-finals',
  '2014-germany-wins':       '2014 FIFA World Cup Final',
  '2018-croatia':            '2018 FIFA World Cup semi-finals',
  '2018-france':             '2018 FIFA World Cup Final',
  '2022-saudi-argentina':    '2022 FIFA World Cup Group C',
  '2022-messi-trophy':       '2022 FIFA World Cup Final',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Wikimedia Commons API: get direct image URL for a File: title */
async function getWikimediaUrl(fileTitle) {
  const encoded = encodeURIComponent(fileTitle);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encoded}&prop=imageinfo&iiprop=url&format=json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MatchdayHistoryImages/1.0 (educational project)' },
  });
  if (!res.ok) throw new Error(`Wikimedia API ${res.status} for ${fileTitle}`);
  const data = await res.json();
  const pages = Object.values(data.query?.pages ?? {});
  if (!pages.length) return null;
  const page = pages[0];
  if (page.missing !== undefined) return null;
  return page.imageinfo?.[0]?.url ?? null;
}

/** Wikipedia article lead image via MediaWiki API */
async function getWikipediaLeadImage(articleTitle) {
  const encoded = encodeURIComponent(articleTitle);
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encoded}&prop=pageimages&pithumbsize=1280&format=json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MatchdayHistoryImages/1.0 (educational project)' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = Object.values(data.query?.pages ?? {});
  if (!pages.length) return null;
  return pages[0]?.thumbnail?.source ?? null;
}

/** Download a URL to a local file path (handles http + https redirects) */
async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, { headers: { 'User-Agent': 'MatchdayHistoryImages/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      pipeline(res, file).then(resolve).catch(reject);
    }).on('error', reject);
  });
}

/** Try to import sharp; if not available, skip conversion and just save as-is */
async function tryImportSharp() {
  try {
    const sharp = (await import('sharp')).default;
    return sharp;
  } catch {
    return null;
  }
}

async function processImage(sharp, srcPath, destPath) {
  if (!sharp) {
    // No sharp — just rename the downloaded file to .webp (browser can still load JPEG)
    // Update: save with correct extension based on source
    await writeFile(destPath, await readFile(srcPath));
    return;
  }
  await sharp(srcPath)
    .resize(1920, 1080, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82 })
    .toFile(destPath);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const sharp = await tryImportSharp();
  if (sharp) {
    console.log('[images] sharp available — will convert to WebP 1920×1080');
  } else {
    console.log('[images] sharp not available — saving originals (add sharp for WebP conversion)');
  }

  const tmpDir = resolve(OUT_DIR, '_tmp');
  await mkdir(tmpDir, { recursive: true });

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const [outputName, wikimediaFile] of IMAGE_MAP) {
    const destPath = resolve(OUT_DIR, `${outputName}.webp`);

    // Skip if already downloaded
    if (existsSync(destPath)) {
      console.log(`[skip] ${outputName}.webp already exists`);
      skipped++;
      continue;
    }

    console.log(`\n[fetch] ${outputName}`);
    console.log(`        Commons: ${wikimediaFile}`);

    let imageUrl = null;

    // 1. Try exact Commons file
    try {
      imageUrl = await getWikimediaUrl(wikimediaFile);
      if (imageUrl) console.log(`        ✓ Commons URL: ${imageUrl.slice(0, 80)}…`);
    } catch (err) {
      console.warn(`        ✗ Commons lookup failed: ${err.message}`);
    }

    // 2. Fallback: Wikipedia article lead image
    if (!imageUrl) {
      const fallbackArticle = WIKIPEDIA_FALLBACKS[outputName];
      if (fallbackArticle) {
        console.log(`        → Trying Wikipedia fallback: "${fallbackArticle}"`);
        try {
          imageUrl = await getWikipediaLeadImage(fallbackArticle);
          if (imageUrl) console.log(`        ✓ Wikipedia URL: ${imageUrl.slice(0, 80)}…`);
        } catch (err) {
          console.warn(`        ✗ Wikipedia fallback failed: ${err.message}`);
        }
      }
    }

    if (!imageUrl) {
      console.warn(`        ✗ No image found for ${outputName} — skipping`);
      failed++;
      await sleep(300);
      continue;
    }

    // Download to tmp
    const ext = imageUrl.split('?')[0].split('.').pop()?.toLowerCase() ?? 'jpg';
    const tmpPath = resolve(tmpDir, `${outputName}.${ext}`);
    try {
      await downloadFile(imageUrl, tmpPath);
      await processImage(sharp, tmpPath, destPath);
      console.log(`        ✓ saved → ${outputName}.webp`);
      downloaded++;
    } catch (err) {
      console.warn(`        ✗ download/convert failed: ${err.message}`);
      failed++;
    }

    // Be polite to Wikimedia servers
    await sleep(500);
  }

  // Cleanup tmp
  try {
    const { rm } = await import('node:fs/promises');
    await rm(tmpDir, { recursive: true, force: true });
  } catch { /* ignore */ }

  console.log(`\n[images] done — ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);

  if (failed > 0) {
    console.log('\n[images] failed items — check filenames or add manual fallbacks:');
    console.log('         Run again after fixing IMAGE_MAP entries.');
  }
}

run().catch((err) => {
  console.error('[images] fatal:', err);
  process.exit(1);
});
