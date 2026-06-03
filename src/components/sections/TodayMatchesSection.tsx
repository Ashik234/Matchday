import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Section } from './Section';
import { useTodayMatches } from '@/data/queries';
import { MatchCard } from '@/components/ui/MatchCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { FallbackBanner } from '@/components/ui/FallbackBanner';
import { cn } from '@/utils/cn';

type Filter = 'all' | 'live' | 'upcoming';

export function TodayMatchesSection() {
  const { data, isLoading, isFallback, refetch } = useTodayMatches();
  const [filter, setFilter] = useState<Filter>('all');

  const matches = useMemo(() => {
    const all = data ?? [];
    if (filter === 'live') return all.filter((m) => m.status === 'live');
    if (filter === 'upcoming') return all.filter((m) => m.status === 'scheduled');
    return all;
  }, [data, filter]);

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
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        {!isLoading &&
          matches.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <MatchCard variant="today" match={m} />
            </motion.div>
          ))}
      </div>
    </Section>
  );
}
