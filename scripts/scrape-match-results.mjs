#!/usr/bin/env node
// Scrape BBC Sport match results → public/data/match-results.json
// Usage: pnpm run scrape:results
// Runs daily at 23:30 UTC via GitHub Actions during WC2026 (Jun 11 - Jul 19, 2026)

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, '..', 'public', 'data', 'match-results.json');

const WC_START = new Date('2026-06-11');
const WC_END = new Date('2026-07-19');

// Generate date range for WC2026
function getDateRange(start, end) {
  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10)); // YYYY-MM-DD
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Check if we're within WC window
function isWithinWCWindow() {
  const now = new Date();
  return now >= WC_START && now <= WC_END;
}

// Convert team name to 3-letter code (best effort)
function normalizeTeamCode(name) {
  const mapping = {
    'Argentina': 'ARG', 'Brazil': 'BRA', 'Germany': 'GER', 'Spain': 'ESP',
    'France': 'FRA', 'England': 'ENG', 'Portugal': 'POR', 'Netherlands': 'NED',
    'Italy': 'ITA', 'Belgium': 'BEL', 'Uruguay': 'URY', 'Croatia': 'CRO',
    'Mexico': 'MEX', 'USA': 'USA', 'Japan': 'JPN', 'South Korea': 'KOR',
    'Switzerland': 'SUI', 'Denmark': 'DEN', 'Sweden': 'SWE', 'Poland': 'POL',
    'Colombia': 'COL', 'Chile': 'CHI', 'Serbia': 'SRB', 'Morocco': 'MAR',
    'Egypt': 'EGY', 'Ghana': 'GHA', 'Senegal': 'SEN', 'Nigeria': 'NGA',
    'Cameroon': 'CMR', 'South Africa': 'RSA', 'Australia': 'AUS', 'Iran': 'IRN',
    'Saudi Arabia': 'KSA', 'Tunisia': 'TUN', 'Algeria': 'ALG', 'Ecuador': 'ECU',
    'Paraguay': 'PAR', 'Peru': 'PER', 'Venezuela': 'VEN', 'Costa Rica': 'CRC',
    'Canada': 'CAN', 'Honduras': 'HON', 'Jamaica': 'JAM', 'Panama': 'PAN',
    'Qatar': 'QAT', 'Iraq': 'IRQ', 'UAE': 'UAE', 'China': 'CHN',
    'Wales': 'WAL', 'Scotland': 'SCO', 'Northern Ireland': 'NIR', 'Republic of Ireland': 'IRL',
    'Austria': 'AUT', 'Czech Republic': 'CZE', 'Hungary': 'HUN', 'Romania': 'ROU',
    'Greece': 'GRE', 'Turkey': 'TUR', 'Ukraine': 'UKR', 'Russia': 'RUS',
    'Norway': 'NOR', 'Finland': 'FIN', 'Iceland': 'ISL', 'Albania': 'ALB',
    'Bosnia and Herzegovina': 'BIH', 'North Macedonia': 'MKD', 'Slovenia': 'SVN',
    'Slovakia': 'SVK', 'Bulgaria': 'BUL', 'Israel': 'ISR', 'New Zealand': 'NZL',
  };
  return mapping[name] || name.slice(0, 3).toUpperCase();
}

// Generate matchId from teams and date (format: home-vs-away-YYYY-MM-DD)
function generateMatchId(homeTeam, awayTeam, date) {
  const homeSlug = homeTeam.toLowerCase().replace(/\s+/g, '-');
  const awaySlug = awayTeam.toLowerCase().replace(/\s+/g, '-');
  return `${homeSlug}-vs-${awaySlug}-${date}`;
}

// Parse scorer from BBC format (e.g., "L. Messi 23'", "Own Goal 45+2'")
function parseScorer(text, homeTeam, awayTeam) {
  const penaltyMatch = text.match(/\(pen\)/i);
  const ownGoalMatch = text.match(/own goal/i);
  
  // Extract minute (e.g., "23'", "45+2'", "90+4'")
  const minuteMatch = text.match(/(\d+)(?:\+(\d+))?'/);
  const minute = minuteMatch ? parseInt(minuteMatch[1], 10) + (parseInt(minuteMatch[2] || '0', 10)) : 0;
  
  // Extract player name (everything before the minute)
  const playerName = text.replace(/\s*\d+(?:\+\d+)?'.*$/, '').replace(/\(pen\)/i, '').trim();
  
  return {
    player: playerName,
    minute,
    penalty: !!penaltyMatch,
    ownGoal: !!ownGoalMatch,
  };
}

async function scrapeDateResults(page, date) {
  // BBC Sport changed their World Cup archive structure
  // Try both current and archived URLs
  const urls = [
    `https://www.bbc.com/sport/football/world-cup/scores-fixtures/${date}`,
    `https://www.bbc.com/sport/football/scores-fixtures/${date}`,
  ];
  
  for (const url of urls) {
    console.log(`[${date}] trying ${url}`);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // DEBUG: Check what's actually on the page
    const pageContent = await page.evaluate(() => {
      const body = document.body.innerHTML;
      const fixtures = document.querySelectorAll('[class*="fixture"]');
      const scores = document.querySelectorAll('[class*="score"]');
      return {
        hasBody: !!body,
        bodyLength: body.length,
        fixturesFound: fixtures.length,
        scoresFound: scores.length,
        fixtureClasses: Array.from(fixtures).slice(0, 3).map(f => f.className),
      };
    });
    
    console.log(`[${date}] DEBUG:`, JSON.stringify(pageContent, null, 2));
    
    // Wait for match cards to load - try multiple selectors
    let selector = null;
    const selectors = [
      '.sp-c-fixture',
      '[class*="fixture"]',
      '.qa-match-block',
      '[data-testid*="fixture"]',
    ];
    
    for (const sel of selectors) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        selector = sel;
        console.log(`[${date}] found matches using selector: ${sel}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!selector) {
      console.log(`[${date}] no match cards found, trying next URL...`);
      continue; // Try next URL
    }
    
    // Found matches, parse them
    
    const matches = await page.evaluate((matchDate) => {
      const results = [];
      const fixtureCards = document.querySelectorAll('.sp-c-fixture');
      
      for (const card of fixtureCards) {
        // Only process finished matches (FT, AET, or PEN)
        const statusEl = card.querySelector('.sp-c-fixture__status-wrapper');
        if (!statusEl) continue;
        
        const statusText = statusEl.textContent.trim();
        if (!['FT', 'AET', 'PEN'].includes(statusText)) continue;
        
        // Extract team names
        const homeEl = card.querySelector('.sp-c-fixture__team--home .sp-c-fixture__team-name-trunc');
        const awayEl = card.querySelector('.sp-c-fixture__team--away .sp-c-fixture__team-name-trunc');
        if (!homeEl || !awayEl) continue;
        
        const homeTeam = homeEl.textContent.trim();
        const awayTeam = awayEl.textContent.trim();
        
        // Extract scores
        const homeScoreEl = card.querySelector('.sp-c-fixture__number--home');
        const awayScoreEl = card.querySelector('.sp-c-fixture__number--away');
        if (!homeScoreEl || !awayScoreEl) continue;
        
        const homeScore = parseInt(homeScoreEl.textContent.trim(), 10);
        const awayScore = parseInt(awayScoreEl.textContent.trim(), 10);
        
        // Extract penalty scores if available
        let homePenScore, awayPenScore;
        const penScoreEl = card.querySelector('.sp-c-fixture__status--pen');
        if (penScoreEl) {
          const penText = penScoreEl.textContent.trim();
          const penMatch = penText.match(/\((\d+)-(\d+)\)/);
          if (penMatch) {
            homePenScore = parseInt(penMatch[1], 10);
            awayPenScore = parseInt(penMatch[2], 10);
          }
        }
        
        // Extract scorers
        const scorers = [];
        const homeScorersEl = card.querySelectorAll('.sp-c-fixture__team--home .sp-c-fixture__goal');
        const awayScorersEl = card.querySelectorAll('.sp-c-fixture__team--away .sp-c-fixture__goal');
        
        homeScorersEl.forEach((el) => {
          scorers.push({ text: el.textContent.trim(), team: 'home' });
        });
        
        awayScorersEl.forEach((el) => {
          scorers.push({ text: el.textContent.trim(), team: 'away' });
        });
        
        results.push({
          homeTeam,
          awayTeam,
          status: statusText,
          homeScore,
          awayScore,
          homePenScore,
          awayPenScore,
          scorers,
          date: matchDate,
        });
      }
      
      return results;
    }, date);
    
    console.log(`[${date}] found ${matches.length} finished matches`);
    return matches;
    
    } catch (err) {
      console.warn(`[${date}] error with this URL:`, err.message);
      // Continue to next URL
    }
  }
  
  // No URLs worked
  console.warn(`[${date}] failed to scrape from all URLs`);
  return [];
}

async function scrape() {
  // Gate: only run during WC window
  if (!isWithinWCWindow()) {
    console.log('[results] outside WC2026 window (Jun 11 - Jul 19, 2026), exiting');
    process.exit(0);
  }
  
  console.log('[results] launching browser…');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Load existing results
    let existingResults = { scrapedAt: new Date().toISOString(), results: {} };
    try {
      const data = await readFile(OUTPUT, 'utf8');
      existingResults = JSON.parse(data);
    } catch (err) {
      console.log('[results] no existing file, starting fresh');
    }
    
    // Scrape today and yesterday (safety buffer)
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const datesToScrape = [yesterday, today];
    
    console.log(`[results] scraping dates: ${datesToScrape.join(', ')}`);
    
    for (const date of datesToScrape) {
      const matches = await scrapeDateResults(page, date);
      
      for (const match of matches) {
        const matchId = generateMatchId(match.homeTeam, match.awayTeam, match.date);
        
        // Parse scorers
        const scorers = match.scorers.map((s) => {
          const scorer = parseScorer(s.text, match.homeTeam, match.awayTeam);
          return { ...scorer, team: s.team };
        });
        
        const result = {
          matchId,
          status: match.status,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          scorers,
          finishedAt: new Date().toISOString(),
        };
        
        if (match.homePenScore !== undefined) {
          result.homePenScore = match.homePenScore;
          result.awayPenScore = match.awayPenScore;
        }
        
        existingResults.results[matchId] = result;
        console.log(`[results] ✓ ${matchId}: ${match.homeScore}-${match.awayScore} (${match.status})`);
      }
    }
    
    // Update scrapedAt timestamp
    existingResults.scrapedAt = new Date().toISOString();
    
    // Write output
    await mkdir(dirname(OUTPUT), { recursive: true });
    await writeFile(OUTPUT, JSON.stringify(existingResults, null, 2), 'utf8');
    console.log(`[results] wrote ${Object.keys(existingResults.results).length} results to ${OUTPUT}`);
    
  } finally {
    await browser.close();
  }
}

scrape().catch((err) => {
  console.error('[results] failed:', err);
  process.exit(1);
});
