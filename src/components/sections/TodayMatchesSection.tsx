import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Section } from './Section';
import { useTodayMatches, useUpcomingMatches } from '@/data/queries';
import { MatchCard } from '@/components/ui/MatchCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { FallbackBanner } from '@/components/ui/FallbackBanner';
import { Countdown } from '@/components/ui/Countdown';
import { cn } from '@/utils/cn';
import { MatchSchema } from '@/components/seo/MatchSchema';
import { toMatchSlug } from '@/utils/matchSlug';

type Filter = 'all' | 'live' | 'upcoming';

export function TodayMatchesSection() {
  const { data, isLoading, isFallback, refetch } = useTodayMatches();
  const { data: upcoming } = useUpcomingMatches(6);
  const [filter, setFilter] = useState<Filter>('all');

  const matches = useMemo(() => {
    const all = data ?? [];
    if (filter === 'live') return all.filter((m) => m.status === 'live');
    if (filter === 'upcoming') return all.filter((m) => m.status === 'scheduled');
    return all;
  }, [data, filter]);

  const isEmpty = !isLoading && matches.length === 0;
  const nextMatch = upcoming?.[0];
  const nextMatches = upcoming ?? [];

  return (
    <Section
      id="today-matches"
      stage="today-matches"
      eyebrow="Today"
      title="Today's matches"
    >
      {isFallback && <FallbackBanner onRetry={refetch} />}
      <div className="flex gap-2 mb-6">
        {(['all', 'live', 'upcoming'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 text-xs uppercase tracking-wider rounded-full border transition-colors',
              filter === f
                ? 'bg-gold text-bg-deep border-gold'
                : 'text-text-dim border-text-muted/40 hover:text-text',
            )}
          >
            {f}
          </button>
        ))}
      </div>
      {data && data.length > 0 && <MatchSchema matches={data} />}

      {isLoading && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      )}

      {!isLoading && !isEmpty && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Link to={`/match/${toMatchSlug(m)}`} className="block">
                <MatchCard variant="today" match={m} />
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {isEmpty && (
        <div className="space-y-8">
          <div className="rounded-2xl bg-bg-elev1 border border-white/5 p-8 md:p-10 text-center">
            <div className="text-text-dim text-xs uppercase tracking-[0.3em] mb-3">
              No matches today
            </div>
            {nextMatch ? (
              <>
                <div className="font-display text-2xl md:text-3xl mb-2">
                  {nextMatch.home.name}
                  <span className="text-text-dim mx-2">vs</span>
                  {nextMatch.away.name}
                </div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">
                  {nextMatch.stage}
                  {nextMatch.group ? ` · Group ${nextMatch.group}` : ''}
                </div>
                <Countdown
                  to={nextMatch.kickoff}
                  format="DD:HH:MM:SS"
                  className="font-mono text-gold text-3xl md:text-5xl"
                />
                <div className="text-[10px] uppercase tracking-[0.3em] text-text-dim mt-3">
                  until kickoff · {nextMatch.stadium.name}
                </div>
              </>
            ) : (
              <div className="text-text-dim">Schedule not yet available.</div>
            )}
          </div>

          {nextMatches.length > 1 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">
                Next up
              </div>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {nextMatches.slice(1).map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                  >
                    <Link to={`/match/${toMatchSlug(m)}`} className="block">
                      <MatchCard variant="today" match={m} />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
