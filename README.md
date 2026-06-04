# Matchday — FIFA World Cup 2026 Companion

Premium single-page companion experience for the 2026 World Cup. Pitch-themed navbar, persistent Three.js football guide, seven scroll-driven sections, three live data sources with fixture fallback.

## Setup

Requirements: Node 18+, pnpm 8+.

```bash
pnpm install
cp .env.example .env.local
# openfootball needs no key; BDL key is optional (fixtures used on failure)
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
| `VITE_OPENFOOTBALL_URL` | openfootball/worldcup.json source URL (default points at the 2026 file) |
| `VITE_BDL_KEY` | BallDontLie FIFA key (free tier: teams + stadiums only) |
| `VITE_BDL_BASE_URL` | BallDontLie base URL (defaults to `api.balldontlie.io/fifa/worldcup/v1`) |
| `VITE_USE_FIXTURES` | `true` forces fixture data even when keys present |

If a request fails, the UI falls back to local fixture data with a banner indicating sample data is shown.

## Architecture

See `docs/superpowers/specs/2026-06-03-matchday/` for full planning docs and `docs/superpowers/plans/2026-06-03-matchday.md` for the phase-by-phase implementation plan.

## Data sources

- openfootball/worldcup.json (`raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`) — full 2026 schedule, groups, knockout rounds, final. Public domain JSON, no key required, served via GitHub CDN with `Access-Control-Allow-Origin: *`. Today/upcoming/live/standings/bracket are all derived client-side from a single cached fetch.
- BallDontLie FIFA World Cup (`api.balldontlie.io/fifa/worldcup/v1`) — teams and stadiums (free tier).
- Local fixtures — fallback for sections without live coverage (e.g. match events) and whenever the network call fails.

## License

Not affiliated with FIFA. Educational / personal use only.
