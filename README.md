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
| `VITE_WC2026_KEY` | World Cup 2026 API key (optional) |
| `VITE_API_FOOTBALL_KEY` | API-Football key (optional) |
| `VITE_BDL_KEY` | BallDontLie FIFA bearer token (optional) |
| `VITE_USE_FIXTURES` | `true` forces fixture data even when keys present |

If any key is missing or the API fails, the UI falls back to local fixture data with a banner indicating sample data is shown.

## Architecture

See `docs/superpowers/specs/2026-06-03-matchday/` for full planning docs and `docs/superpowers/plans/2026-06-03-matchday.md` for the phase-by-phase implementation plan.

## Data sources

- World Cup 2026 API — teams, matches, groups, standings, bracket
- API-Football (`v3.football.api-sports.io`) — head-to-head, historical
- BallDontLie FIFA — match events, player stats

## License

Not affiliated with FIFA. Educational / personal use only.
