import type { Team, Match, Group } from '@/data/types';
import { FlagWave } from './components/FlagWave';
import { StatCard } from './components/StatCard';
import { formFromMatch } from './components/RecentForm';

const FED_COLOR: Record<Team['federation'], { bg: string; border: string; text: string }> = {
  UEFA:     { bg: 'rgba(59,130,246,0.2)',  border: 'rgba(59,130,246,0.6)',  text: '#BFDBFE' },
  CONMEBOL: { bg: 'rgba(251,191,36,0.2)',  border: 'rgba(251,191,36,0.6)',  text: '#FEF3C7' },
  AFC:      { bg: 'rgba(16,185,129,0.2)',  border: 'rgba(16,185,129,0.6)',  text: '#D1FAE5' },
  CAF:      { bg: 'rgba(249,115,22,0.2)',  border: 'rgba(249,115,22,0.6)',  text: '#FED7AA' },
  CONCACAF: { bg: 'rgba(168,85,247,0.2)',  border: 'rgba(168,85,247,0.6)',  text: '#E9D5FF' },
  OFC:      { bg: 'rgba(6,182,212,0.2)',   border: 'rgba(6,182,212,0.6)',   text: '#CFFAFE' },
};

type Props = {
  team: Team;
  matches: Match[];
  group?: Group;
};

export function TeamHero({ team, matches, group }: Props) {
  const fed = FED_COLOR[team.federation];

  const finished = matches.filter((m) => m.status === 'finished');
  const played = finished.length;
  let wins = 0;
  let goalsFor = 0;
  let cleanSheets = 0;
  for (const m of finished) {
    const r = formFromMatch(m, team.name);
    if (r === 'W') wins++;
    const isHome = m.home.teamId === team.name;
    const me = (isHome ? m.home.score : m.away.score) ?? 0;
    const them = (isHome ? m.away.score : m.home.score) ?? 0;
    goalsFor += me;
    if (them === 0) cleanSheets++;
  }

  let groupPosition = '—';
  if (group) {
    const idx = group.standings.findIndex(
      (s) => s.team.id === team.id || s.team.name === team.name,
    );
    if (idx >= 0) {
      const ord = ['1st', '2nd', '3rd', '4th'][idx] ?? `${idx + 1}th`;
      groupPosition = `${ord} of ${group.standings.length}`;
    }
  }

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 30% at 50% 0%, rgba(255,215,0,0.08), transparent 70%),' +
            'linear-gradient(180deg, #0A1428 0%, #0F1A2E 60%, #0B1E45 100%)',
        }}
      />
      <div className="relative max-w-container mx-auto px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center">
          <FlagWave countryCode={team.countryCode} label={team.name} />
          <div>
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] border"
              style={{ background: fed.bg, borderColor: fed.border, color: fed.text }}
            >
              {team.federation}
            </span>
            <h1 className="mt-3 font-display text-5xl md:text-hero text-text leading-none">
              {team.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] bg-gold text-bg-deep">
                FIFA World Cup 2026
              </span>
              {team.group && (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] bg-bg-elev2 text-text-dim">
                  Group {team.group}
                </span>
              )}
            </div>
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-text-dim">FIFA Rank</div>
              <div className="font-display text-4xl text-gold">
                {team.fifaRank ? `#${team.fifaRank}` : '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <StatCard label="Matches Played" value={played} />
          <StatCard label="Wins" value={wins} />
          <StatCard label="Goals Scored" value={goalsFor} />
          <StatCard label="Clean Sheets" value={cleanSheets} />
          <StatCard label="Group Position" value={groupPosition} />
        </div>
      </div>
    </section>
  );
}
