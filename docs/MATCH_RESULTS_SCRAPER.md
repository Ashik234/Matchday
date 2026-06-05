# Match Results Scraper

Post-match result scraping system for FIFA World Cup 2026.

## Overview

- **Source**: BBC Sport scores/fixtures pages
- **Cadence**: Daily at 23:30 UTC via GitHub Actions
- **Active Period**: June 11 - July 19, 2026 (WC2026 window)
- **Output**: `public/data/match-results.json`

## How It Works

1. **Scraper** (`scripts/scrape-match-results.mjs`):
   - Uses Puppeteer to fetch BBC Sport daily scoreboards
   - Scrapes today + yesterday (safety buffer)
   - Parses final scores, match status (FT/AET/PEN), and goalscorers
   - Merges with existing results (preserves historical data)
   - Self-gates: exits gracefully if run outside WC window

2. **Workflow** (`.github/workflows/refresh-match-results.yml`):
   - Cron: `30 23 * * *` (daily 23:30 UTC)
   - Manual trigger: `workflow_dispatch` available
   - Commits as `Ashik234` if changes detected
   - Skips commit if results unchanged (prevents empty Vercel rebuilds)

3. **Data Schema** (`src/data/types/matchResult.ts`):
   ```typescript
   type MatchResult = {
     matchId: string;           // slug format: "team1-vs-team2-YYYY-MM-DD"
     status: 'FT' | 'AET' | 'PEN';
     homeScore: number;
     awayScore: number;
     homePenScore?: number;     // only for PEN matches
     awayPenScore?: number;
     scorers: Scorer[];
     finishedAt: string;        // ISO timestamp
   };
   
   type Scorer = {
     player: string;
     minute: number;
     team: 'home' | 'away';
     ownGoal?: boolean;
     penalty?: boolean;
   };
   ```

## Testing

### ✅ Pipeline Tested (June 5, 2026)

The scraper pipeline has been tested and verified:

**Test Results:**
- ✅ JSON generation works correctly
- ✅ Match ID format: `home-vs-away-YYYY-MM-DD` 
- ✅ Scorer parsing (regular goals, penalties, own goals)
- ✅ Minute parsing (including stoppage time like 45+2)
- ✅ Penalty shootout data structure (homePenScore/awayPenScore)
- ✅ Data merging (preserves existing results)
- ✅ React Query hook loads data without errors
- ✅ TypeScript types validated

**BBC Scraper Status:**
- ⚠️ BBC's archived World Cup pages don't match live structure
- The scraper includes fallback URL attempts and diagnostic logging
- **Action Required**: Once WC2026 pages go live (June 2026), verify BBC's HTML selectors
- Scraper will need selector adjustment if BBC changes their markup

### Local Test (During Tournament)

Once the tournament starts and BBC's WC2026 pages are live:

1. **Verify BBC's HTML structure**:
   ```javascript
   // In scripts/scrape-match-results.mjs, check the DEBUG output
   // The scraper includes diagnostic logging to help identify correct selectors
   ```

2. **Run the scraper**:
   ```bash
   pnpm run scrape:results
   ```

3. **Check output**:
   ```bash
   cat public/data/match-results.json
   ```

### Manual Workflow Trigger

During the tournament, you can manually trigger the workflow from GitHub Actions:

1. Go to **Actions** → **Refresh Match Results**
2. Click **Run workflow**
3. Results will be committed if changes detected

## Cost Estimate

- **Runs**: 1/day × 39 tournament days = 39 runs
- **Duration**: ~3 minutes/run (Puppeteer + scrape)
- **Total**: ~117 minutes/month GitHub Actions
- **Quota**: Well under free tier (2,000 min/month)

## Failure Handling

- **BBC HTML changes**: Scraper logs warnings but exits 0 (won't break CI)
- **No matches found**: Exits gracefully, no commit
- **Network timeout**: Workflow fails, can be re-run manually
- **Mitigation**: Manual `workflow_dispatch` available for quick fixes

## Future UI Integration (Not Yet Implemented)

Once verified, hook up to UI:

1. **Match Hero** (`/match/:slug`): Show final score + scorers instead of countdown
2. **Home Cards**: Display "FT 2-1" badge on completed matches
3. **Match Details**: Add scorer summary block in Overview tab

## Notes

- Match IDs use slug format: `home-vs-away-YYYY-MM-DD`
- Results are **merged** (old data preserved, new data added/updated)
- Scraper is idempotent: re-running for the same day updates results
- `[skip ci]` in commit message prevents infinite workflow loops
