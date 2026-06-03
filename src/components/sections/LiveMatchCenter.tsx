import { Section } from './Section';
import { MatchCard } from '@/components/ui/MatchCard';
import { useLiveMatches, useMatchEvents } from '@/data/queries';
import { Skeleton } from '@/components/ui/Skeleton';
import { FallbackBanner } from '@/components/ui/FallbackBanner';
import { EventTimeline } from './EventTimeline';
import { StatBars } from './StatBars';

export function LiveMatchCenter() {
  const { data, isLoading, isFallback, refetch } = useLiveMatches();
  const liveMatch = data?.[0];
  const { data: events } = useMatchEvents(liveMatch?.id);

  return (
    <Section id="live" stage="live" eyebrow="Live" title="Live Match Center">
      {isFallback && <FallbackBanner onRetry={refetch} />}
      {isLoading && <Skeleton className="h-72" />}
      {!isLoading && !liveMatch && (
        <div className="text-center py-12 text-text-dim">
          No live matches right now. Check back at the next kickoff.
        </div>
      )}
      {!isLoading && liveMatch && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <MatchCard variant="live" match={liveMatch} />
            <StatBars />
          </div>
          <div className="rounded-xl bg-bg-elev1 border border-white/5 p-4 max-h-96 overflow-y-auto">
            <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">Timeline</div>
            <EventTimeline events={events ?? []} />
          </div>
        </div>
      )}
    </Section>
  );
}
