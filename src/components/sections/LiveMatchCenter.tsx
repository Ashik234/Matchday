import { Section } from './Section';
import { MatchCard } from '@/components/ui/MatchCard';
import { useLiveMatches, useUpcomingMatches } from '@/data/queries';
import { Skeleton } from '@/components/ui/Skeleton';
import { FallbackBanner } from '@/components/ui/FallbackBanner';
import { Countdown } from '@/components/ui/Countdown';

export function LiveMatchCenter() {
  const { data, isLoading, isFallback, refetch } = useLiveMatches();
  const { data: upcoming } = useUpcomingMatches(1);
  const nextMatch = upcoming?.[0];

  const liveMatches = data ?? [];
  const hasLive = liveMatches.length > 0;

  return (
    <Section id="live" stage="live" eyebrow="Live" title="Live Match Center">
      {isFallback && <FallbackBanner onRetry={refetch} />}
      {isLoading && <Skeleton className="h-72" />}
      {!isLoading && !hasLive && (
        <div className="rounded-2xl bg-bg-elev1 border border-white/5 p-10 text-center">
          <div className="text-text-dim text-sm uppercase tracking-[0.3em] mb-3">No live matches right now</div>
          {nextMatch && (
            <>
              <div className="font-display text-2xl mb-2">
                {nextMatch.home.name} <span className="text-text-dim">vs</span> {nextMatch.away.name}
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-gold mb-4">{nextMatch.stage}</div>
              <Countdown
                to={nextMatch.kickoff}
                format="DD:HH:MM:SS"
                className="font-mono text-gold text-3xl md:text-4xl"
              />
              <div className="text-[10px] uppercase tracking-[0.3em] text-text-dim mt-2">
                until kickoff · {nextMatch.stadium.name}
              </div>
            </>
          )}
        </div>
      )}
      {!isLoading && hasLive && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {liveMatches.map((m) => (
            <MatchCard key={m.id} variant="live" match={m} />
          ))}
        </div>
      )}
    </Section>
  );
}
