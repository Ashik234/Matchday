#!/usr/bin/env node
// Scrape current FIFA men's world ranking from inside.fifa.com.
// Writes JSON to public/data/fifa-ranking.json so the browser can fetch it
// without CORS issues (served from same origin as the app).
//
// Usage: pnpm run scrape:ranking
// Re-run periodically — FIFA updates monthly.

import puppeteer from 'puppeteer';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, '..', 'public', 'data', 'fifa-ranking.json');
const URL = 'https://inside.fifa.com/fifa-world-ranking/men';
const NAV_TIMEOUT = 60_000;

async function scrape() {
  console.log(`[scrape] launching browser…`);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    );
    page.setDefaultNavigationTimeout(NAV_TIMEOUT);

    console.log(`[scrape] navigating to ${URL}`);
    await page.goto(URL, { waitUntil: 'networkidle2' });

    // Click "Show full rankings" if present so all 211 teams load
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, a')).find((b) =>
        /show full rankings|show all|view all/i.test(b.textContent || ''),
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    await page.waitForSelector('table', { timeout: NAV_TIMEOUT });

    const data = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table'));
      const target = tables.find((t) => {
        const headers = Array.from(t.querySelectorAll('th')).map((th) =>
          (th.textContent || '').trim().toLowerCase(),
        );
        return headers.some((h) => /rank/.test(h)) && headers.some((h) => /points/.test(h));
      });
      if (!target) return { rows: [], headers: [] };

      const headers = Array.from(target.querySelectorAll('thead th, th')).map((th) =>
        (th.textContent || '').trim(),
      );

      // Capture each td as both its full text AND innerHTML so we can split
      // concatenated "rank + previousRank" cells later.
      const rows = Array.from(target.querySelectorAll('tbody tr')).map((tr) =>
        Array.from(tr.querySelectorAll('td')).map((td) => ({
          text: (td.textContent || '').trim(),
          // First direct-child text node usually holds just the rank
          firstChildText:
            Array.from(td.childNodes)
              .filter((n) => n.nodeType === Node.TEXT_NODE || n.tagName === 'SPAN')
              .map((n) => (n.textContent || '').trim())
              .filter(Boolean)[0] ?? '',
        })),
      );

      return { headers, rows };
    });

    if (!data.rows.length) {
      throw new Error('No ranking rows found — selector or page layout may have changed.');
    }


    const lower = data.headers.map((h) => h.toLowerCase());
    const rankIdx = lower.findIndex((h) => /rank/.test(h));
    const teamIdx = lower.findIndex((h) => /team|country|nation/.test(h));
    const pointsIdx = lower.findIndex((h) => /points|pts/.test(h));

    // FIFA's table is ordered by rank, so row index = rank. The rank cell's
    // text contains rank + previous-rank sprite concatenated which is
    // unreliable to parse. Trust the ordering instead.
    const ranking = data.rows
      .map((cells, rowIndex) => {
        const teamCell = teamIdx >= 0 ? cells[teamIdx] : cells[1];
        const pointsCell = pointsIdx >= 0 ? cells[pointsIdx] : cells[cells.length - 1];

        const rank = rowIndex + 1;
        const pointsMatch = (pointsCell?.text || '').match(/\d+(\.\d+)?/);
        const points = pointsMatch ? parseFloat(pointsMatch[0]) : NaN;
        const name = (teamCell?.text || '').replace(/\s+/g, ' ').trim();

        return { rank, name, points };
      })
      .filter((r) => r.name);

    console.log(`[scrape] parsed ${ranking.length} teams`);

    const payload = {
      scrapedAt: new Date().toISOString(),
      source: URL,
      ranking,
    };

    await mkdir(dirname(OUTPUT), { recursive: true });
    await writeFile(OUTPUT, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`[scrape] wrote ${OUTPUT}`);
  } finally {
    await browser.close();
  }
}

scrape().catch((err) => {
  console.error('[scrape] failed:', err);
  process.exit(1);
});
