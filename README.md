# Matchday — FIFA World Cup 2026 Companion

A polished, single-page World Cup companion built with React, TypeScript, Tailwind, and TanStack Query. From matchday buzz to historical moments, the app brings the tournament to life with live data, immersive visuals, and football-first storytelling.

> Kick off the tournament, follow the action, and relive the biggest moments — all in one place.

## ✨ What’s already included

1. Live tournament overview with hero content, match countdowns, and progress tracking
2. Today / upcoming / live match sections with match cards, score states, and status pills
3. Group standings, featured teams, and road-to-final visuals for tournament momentum
4. Match detail pages with overview, result context, head-to-head summaries, and related match information
5. Previous meetings and historical match context for rivalries and past encounters
6. Team profile pages with squads, tournament context, and football-focused presentation
7. Historical “On This Day” moments with curated imagery and timeline-style cards
8. Match history and result-sync support so completed fixtures can be reflected in the UI
9. Interactive 3D football / trophy-inspired visuals powered by React Three Fiber
10. Local fixture fallback and cached data support when live sources are unavailable

## 🧭 Project highlights

### Home experience
- Hero grid and tournament overview
- Today matches, live center, and final countdown
- Tournament progress, standings, and featured teams

### Match & team pages
- Dedicated match pages with match-focused summary views
- Team pages with squad and profile context

### Historical content
- “On This Day” section on the homepage
- Curated iconic-moment data and supporting assets

## ⚙️ Setup

Requirements: Node 18+, pnpm 8+

1. Install dependencies
   ```bash
   pnpm install
   ```
2. Create your environment file
   ```bash
   cp .env.example .env.local
   ```
3. Start the app
   ```bash
   pnpm dev
   ```

## 🧪 Useful scripts

- `pnpm dev` — start the Vite development server
- `pnpm build` — create a production build
- `pnpm preview` — preview the production build locally
- `pnpm exec tsc --noEmit` — run TypeScript checks
- `pnpm scrape:ranking` — refresh FIFA ranking data
- `pnpm scrape:squads` — refresh squad data
- `pnpm scrape:matches` — refresh match history data
- `pnpm scrape:player-images` — refresh player image data
- `pnpm scrape:results` — refresh match results data

## 🌐 Data sources

- OpenFootball World Cup data for fixtures, teams, groups, standings, and tournament structure
- Local fixture fallback data for resilience and offline-safe UI behavior
- Curated historical moment data for the “On This Day” section

## 🧰 Tech stack and data flow

### Frontend
- React + TypeScript for the app shell and page components
- Vite for fast development and production builds
- Tailwind CSS for the visual system and responsive layout
- Framer Motion for lightweight UI animation
- React Three Fiber for immersive 3D football/trophy visuals

### Data and query layer
- TanStack Query for caching, fetching, and data synchronization
- Local fixture JSON for fallback and offline-safe rendering
- Custom hooks and data adapters for match, team, standings, and historical moments

### Scraping and content pipelines
- Node.js scripts under `scripts/` for ranking, squads, match history, player images, and match results
- Public data files under `public/data/` for curated JSON used by the app
- Image and history scraping utilities for rich historical moment content

## ✨ Future improvements

A few small but effective features to add next:

### 1. Group standings mini-card
- Show a compact standings preview for the user’s favorite team on the homepage.
- Keeps the homepage more personal and useful than showing all groups at once.

### 2. “What happened yesterday?” section
- Highlight one memorable result or iconic moment from the previous day.
- Great for daily engagement with minimal complexity.

### 3. Timezone toggle
- Let users switch between local kickoff time and tournament time.
- Helpful for a global audience.

### 4. Favorite team save
- Let users save their favorite team and personalize the homepage experience.
- This can power other improvements later.

## 🏗️ Notes

- The application is designed to work with live tournament data when available and gracefully fall back to local fixture content when needed.
- Planning docs and feature specs live under `docs/` for reference.

## 📄 License

Not affiliated with FIFA. Educational / personal use only.
