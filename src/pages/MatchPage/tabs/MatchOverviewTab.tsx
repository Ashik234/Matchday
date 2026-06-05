import type { Match, Team } from '@/data/types';
import { formFromMatch } from '@/pages/TeamPage/components/RecentForm';
import { useMatchResult } from '@/data/queries/useMatchResults';
import { toMatchSlug } from '@/utils/matchSlug';

export function MatchOverviewTab({
  match,
  homeTeam,
  awayTeam,
  homeFinished,
  awayFinished,
}: {
  match: Match;
  homeTeam?: Team;
  awayTeam?: Team;
  homeFinished: Match[];
  awayFinished: Match[];
}) {
  const kickoff = new Date(match.kickoff);
  const kickoffStr = kickoff.toLocaleString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const stat = (fin: Match[], name: string) => {
    let w = 0;
    let d = 0;
    let l = 0;
    let gf = 0;
    let ga = 0;
    for (const m of fin) {
      const r = formFromMatch(m, name);
      if (r === 'W') w++;
      else if (r === 'D') d++;
      else if (r === 'L') l++;
      const isHome = m.home.teamId === name;
      gf += (isHome ? m.home.score : m.away.score) ?? 0;
      ga += (isHome ? m.away.score : m.home.score) ?? 0;
    }
    return { w, d, l, gf, ga };
  };
  const sh = stat(homeFinished, match.home.name);
  const sa = stat(awayFinished, match.away.name);
  const result = useMatchResult(toMatchSlug(match));
  const homeScorers = result?.scorers.filter((s) => s.team === 'home') ?? [];
  const awayScorers = result?.scorers.filter((s) => s.team === 'away') ?? [];

  return (
    <div className="space-y-8">
      {result && (
        <section className="rounded-2xl p-5 bg-bg-elev1/40 border border-white/8 backdrop-blur-md">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.18em] text-gold">
              {result.status === 'PEN' ? 'Penalties' : result.status === 'AET' ? 'After Extra Time' : 'Full Time'}
            </span>
            <span className="font-display text-3xl text-text">
              {result.homeScore} - {result.awayScore}
              {result.status === 'PEN' && (
                <span className="text-text-dim text-base ml-2">
                  ({result.homePenScore}-{result.awayPenScore})
                </span>
              )}
            </span>
          </div>
          {(homeScorers.length + awayScorers.length) > 0 && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <ScorerList side={match.home.name} scorers={homeScorers} align="left" />
              <ScorerList side={match.away.name} scorers={awayScorers} align="right" />
            </div>
          )}
        </section>
      )}

      <section className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md">
          <div className="text-text-dim text-xs uppercase tracking-[0.18em] mb-1">Competition</div>
          <div>FIFA World Cup 2026</div>
        </div>
        <div className="rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md">
          <div className="text-text-dim text-xs uppercase tracking-[0.18em] mb-1">Stage</div>
          <div>{match.stage}{match.group ? ` · Group ${match.group}` : ''}</div>
        </div>
        <div className="rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md">
          <div className="text-text-dim text-xs uppercase tracking-[0.18em] mb-1">Venue</div>
          <div>{match.stadium.name}</div>
        </div>
        <div className="rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md">
          <div className="text-text-dim text-xs uppercase tracking-[0.18em] mb-1">Kickoff</div>
          <div>{kickoffStr}</div>
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Form so far</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <TeamLine
            label={match.home.name}
            rank={homeTeam?.fifaRank}
            w={sh.w}
            d={sh.d}
            l={sh.l}
            gf={sh.gf}
            ga={sh.ga}
          />
          <TeamLine
            label={match.away.name}
            rank={awayTeam?.fifaRank}
            w={sa.w}
            d={sa.d}
            l={sa.l}
            gf={sa.gf}
            ga={sa.ga}
          />
        </div>
      </section>
    </div>
  );
}

function ScorerList({
  side,
  scorers,
  align,
}: {
  side: string;
  scorers: import('@/data/types').Scorer[];
  align: 'left' | 'right';
}) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-text-dim mb-1">{side}</div>
      <ul className="space-y-1">
        {scorers.map((s, i) => (
          <li key={i} className="text-text">
            <span className="font-mono text-gold mr-2">
              {s.minute}{s.stoppage ? `+${s.stoppage}` : ''}'
            </span>
            {s.player}
            {s.penalty && <span className="text-text-dim text-xs ml-1">(pen)</span>}
            {s.ownGoal && <span className="text-text-dim text-xs ml-1">(og)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeamLine({
  label,
  rank,
  w,
  d,
  l,
  gf,
  ga,
}: {
  label: string;
  rank?: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
}) {
  return (
    <div className="rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-display text-lg text-text">{label}</span>
        {rank && <span className="text-xs text-gold">FIFA #{rank}</span>}
      </div>
      <div className="text-sm text-text-dim">
        {w}W · {d}D · {l}L · GF {gf} · GA {ga}
      </div>
    </div>
  );
}
