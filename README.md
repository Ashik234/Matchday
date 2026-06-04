# Matchday — FIFA World Cup 2026 Companion

Premium single-page companion experience for the 2026 World Cup. Pitch-themed navbar, persistent Three.js football guide, seven scroll-driven sections, three live data sources with fixture fallback.

## Setup

Requirements: Node 18+, pnpm 8+.

```bash
pnpm install
cp .env.example .env.local
# fill in keys (optional — fixtures used when keys empty)
pnpm dev
```

## Scripts

- `pnpm dev` — Vite dev server
- `pnpm build` — Production build
- `pnpm preview` — Serve the production build locally
- `pnpm exec tsc --noEmit` — Type-check

## Environment

| Key | Purpose |
| --- | --- |
| `VITE_API_FOOTBALL_KEY` | API-Football key (FIFA World Cup 2026 = league=1, season=2026) |
| `VITE_BDL_KEY` | BallDontLie FIFA key (free tier: teams + stadiums only) |
| `VITE_USE_FIXTURES` | `true` forces fixture data even when keys present |

If any key is missing or the API fails, the UI falls back to local fixture data with a banner indicating sample data is shown.

## Architecture

See `docs/superpowers/specs/2026-06-03-matchday/` for full planning docs and `docs/superpowers/plans/2026-06-03-matchday.md` for the phase-by-phase implementation plan.

## Data sources

- API-Football (`v3.football.api-sports.io`) — fixtures, standings, bracket, venues, head-to-head (FIFA World Cup 2026: `league=1, season=2026`)
- BallDontLie FIFA World Cup (`api.balldontlie.io/fifa/worldcup/v1`) — teams and stadiums (free tier)
- Local fixtures — fallback for sections without live coverage (e.g. match events)

## License

Not affiliated with FIFA. Educational / personal use only.
