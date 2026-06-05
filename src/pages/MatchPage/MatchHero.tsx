import { Flag } from '@/components/ui/Flag';
import { Countdown } from '@/components/ui/Countdown';
import { Pill } from '@/components/ui/Pill';
import { useMatchResult } from '@/data/queries/useMatchResults';
import { toMatchSlug } from '@/utils/matchSlug';
import type { Match } from '@/data/types';

export function MatchHero({
  match,
  homeRank,
  awayRank,
}: {
  match: Match;
  homeRank?: number;
  awayRank?: number;
}) {
  const result = useMatchResult(toMatchSlug(match));
  const homeScore = result?.homeScore ?? match.home.score;
  const awayScore = result?.awayScore ?? match.away.score;
  const isFinished = match.status === 'finished' || Boolean(result);
  const kickoff = new Date(match.kickoff);
  const dateStr = kickoff.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

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
      <div className="relative max-w-container mx-auto px-6 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="flex flex-col items-center text-center gap-3">
            <Flag countryCode={match.home.countryCode} size="xl" ariaLabel={match.home.name} />
            <div className="font-display text-2xl md:text-3xl text-text">{match.home.name}</div>
            {homeRank && (
              <div className="text-[10px] uppercase tracking-[0.18em] text-gold">FIFA #{homeRank}</div>
            )}
          </div>

          <div className="flex flex-col items-center text-center gap-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-text-dim">{match.stage}</div>
            <div className="font-display text-3xl md:text-display text-text">
              {homeScore ?? '·'} <span className="text-text-dim">vs</span> {awayScore ?? '·'}
            </div>
            {result?.status === 'PEN' && (
              <div className="text-xs text-text-dim font-mono">
                ({result.homePenScore} - {result.awayPenScore}) on penalties
              </div>
            )}
            <div className="text-xs text-text-dim">{dateStr}</div>
            <div className="text-[11px] text-text-dim">{match.stadium.name}</div>
            {!isFinished && match.status === 'scheduled' && <Countdown to={match.kickoff} />}
            {match.status === 'live' && !result && <Pill variant="live">LIVE · {match.minute}'</Pill>}
            {isFinished && <Pill variant="final">{result?.status ?? 'FT'}</Pill>}
          </div>

          <div className="flex flex-col items-center text-center gap-3">
            <Flag countryCode={match.away.countryCode} size="xl" ariaLabel={match.away.name} />
            <div className="font-display text-2xl md:text-3xl text-text">{match.away.name}</div>
            {awayRank && (
              <div className="text-[10px] uppercase tracking-[0.18em] text-gold">FIFA #{awayRank}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
