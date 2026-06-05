#!/usr/bin/env node
// Download + convert historical World Cup images to WebP.
// Uses Wikimedia Commons Special:FilePath — no API, no hashes needed.
// The URL redirects automatically to the real file.
// All images are public domain or CC-licensed (free to use).
//
// Usage: node scripts/download-history-images.mjs

import { writeFile, mkdir, unlink, rm } from 'node:fs/promises';
import { existsSync }                    from 'node:fs';
import { dirname, resolve }              from 'node:path';
import { fileURLToPath }                 from 'node:url';
import { createWriteStream }             from 'node:fs';
import { pipeline }                      from 'node:stream/promises';
import https                             from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = resolve(__dirname, '..', 'public', 'images', 'history');
const TMP_DIR   = resolve(OUT_DIR, '_tmp');

// ── Image list ──────────────────────────────────────────────────────────────
// [outputName, commonsFilename]
// All from Wikimedia Commons — public domain or CC-licensed.
// Uses Special:FilePath so no hash prefix needed.
const IMAGES = [
  ['1930-first-world-cup',
    'Uruguay_national_football_team_1930.jpg'],

  ['1950-maracanazo',
    'Gol_ghiggia_vs_brasil.jpg'],

  ['1954-miracle-of-bern',
    'Stade_de_Suisse,_Wankdorf_with_1954_World_Cup_memorial.jpg'],

  ['1958-pele-final',
    'Pele_v_sweden_1958.jpg'],

  ['1966-england-wins',
    'England_v_West_Germany_1966_World_Cup_Final_2.jpg'],

  ['1970-brazil-wins',
    'Pele_and_Bobby_Moore_1970.jpg'],

  ['1974-cruyff',
    'Johan_Cruijff_(1974).jpg'],

  ['1982-italy',
    'Paolo_Rossi_1982_Italy_squad.jpg'],

  ['1986-hand-of-god',
    'Maradona_mano_de_dios.jpg'],

  ['1990-cameroon',
    'FIFAWorldCup1990.jpg'],

  ['1994-baggio',
    'Roberto_Baggio_1994_World_Cup_penalty.jpg'],

  ['1998-france-wins',
    'Zinedine_Zidane_1998.jpg'],

  ['1998-bergkamp',
    'Dennis_Bergkamp_1998.jpg'],

  ['2002-senegal',
    'Senegal_v_France_2002_FIFA_World_Cup.jpg'],

  ['2002-brazil-wins',
    'Ronaldo_2002_World_Cup_Final.jpg'],

  ['2006-zidane',
    'Zidane_head-butt.jpg'],

  ['2006-maxi',
    'Maxi_Rodriguez_2006_FIFA_World_Cup.jpg'],

  ['2010-spain-wins',
    'Andres_Iniesta_2010_FIFA_World_Cup.jpg'],

  ['2014-van-persie',
    'Robin_van_Persie_2014_FIFA_World_Cup_header.jpg'],

  ['2014-james',
    'James_Rodriguez_2014_FIFA_World_Cup_goal.jpg'],

  ['2014-germany-brazil-7-1',
    'Germany_v_Brazil,_2014_FIFA_World_Cup_07.jpg'],

  ['2014-germany-wins',
    'Germany_v_Argentina,_2014_FIFA_World_Cup_Final_01.jpg'],

  ['2018-croatia',
    'Croatia_vs_England_2018_FIFA_World_Cup_semifinal_01.jpg'],

  ['2018-france',
    '2018_FIFA_World_Cup_Final.jpg'],

  ['2022-saudi-arabia',
    'Qatar_2022_-_Grupo_C_-_Argentina_x_Arabia_Saudita_(03).jpg'],

  ['2022-messi-trophy',
    'Argentina_campeon_de_la_Copa_Mundial_2022.jpg'],
];

// Wikimedia Special:FilePath — always redirects to actual file, no hash needed
function wikimediaUrl(filename) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
}

// ── Download helper (follows redirects) ─────────────────────────────────────

function downloadUrl(url, dest, hops = 0) {
  return new Promise((res, rej) => {
    if (hops > 8) return rej(new Error('Too many redirects'));
    const file = createWriteStream(dest);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MatchdayBot/1.0; educational)',
        'Accept': 'image/*,*/*',
      },
    }, (response) => {
      const { statusCode, headers } = response;

      // Follow redirects
      if (statusCode >= 301 && statusCode <= 308 && headers.location) {
        file.close(() => {
          const next = headers.location.startsWith('http')
            ? headers.location
            : new URL(headers.location, url).href;
          downloadUrl(next, dest, hops + 1).then(res).catch(rej);
        });
        response.resume();
        return;
      }

      if (statusCode !== 200) {
        file.close(() => rej(new Error(`HTTP ${statusCode}`)));
        response.resume();
        return;
      }

      pipeline(response, file).then(res).catch(rej);
    }).on('error', err => { file.close(); rej(err); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(TMP_DIR, { recursive: true });

  // Load sharp for real WebP conversion
  let sharp = null;
  try {
    sharp = (await import('sharp')).default;
    console.log('[images] sharp ready — output: 1920×1080 WebP q82\n');
  } catch {
    console.log('[images] sharp not found — run: npm install --save-dev sharp\n');
    process.exit(1);
  }

  let ok = 0, skipped = 0, failed = 0;
  const fails = [];

  for (const [name, filename] of IMAGES) {
    const destPath = resolve(OUT_DIR, `${name}.webp`);

    if (existsSync(destPath)) {
      console.log(`  skip   ${name}.webp`);
      skipped++;
      continue;
    }

    const url = wikimediaUrl(filename);
    const tmpPath = resolve(TMP_DIR, `${name}.orig`);

    console.log(`  fetch  ${name}`);
    console.log(`         ${filename}`);

    let success = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await downloadUrl(url, tmpPath);

        // Convert to WebP 1920×1080
        await sharp(tmpPath)
          .resize(1920, 1080, { fit: 'cover', position: 'attention' })
          .webp({ quality: 82 })
          .toFile(destPath);

        try { await unlink(tmpPath); } catch {}
        console.log(`         ✓ saved as WebP 1920×1080\n`);
        ok++;
        success = true;
        break;
      } catch (err) {
        if (attempt < 3) {
          const wait = attempt * 6000;
          console.warn(`         ! attempt ${attempt} failed: ${err.message} — retry in ${wait/1000}s`);
          await sleep(wait);
        } else {
          console.warn(`         ✗ FAILED: ${err.message}\n`);
        }
      }
    }

    if (!success) { failed++; fails.push(name); }

    await sleep(3000); // 3s gap — polite to Wikimedia
  }

  try { await rm(TMP_DIR, { recursive: true, force: true }); } catch {}

  console.log('══════════════════════════════');
  console.log(`✓  Downloaded : ${ok}`);
  console.log(`→  Skipped    : ${skipped} (already exist)`);
  if (failed > 0) {
    console.log(`✗  Failed     : ${failed}`);
    console.log(`   ${fails.join(', ')}`);
    console.log('\n   These will show the year-typography fallback in the UI.');
  } else {
    console.log('\nAll images downloaded successfully!');
  }
}

run().catch(err => { console.error('[fatal]', err); process.exit(1); });
