import { motion, AnimatePresence } from 'framer-motion';
import { useTodayMatches } from '@/data/queries';
import { MatchCard } from '@/components/ui/MatchCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { FallbackBanner } from '@/components/ui/FallbackBanner';
import { formatHeroDate } from '@/utils/formatDate';
import { useUIStore } from '@/store/uiStore';
import { DateImpact } from './DateImpact';

export function TodayMatchesCard() {
  const { data, isLoading, isFallback, refetch } = useTodayMatches();
  const stage = useUIStore((s) => s.ballStage);
  const revealed =
    stage === 'idle-card' || stage === 'scroll-guide' || stage === 'parked-countdown';

  const featured = data?.[0];
  const rest = (data ?? []).slice(1);
  const live = (data ?? []).filter((m) => m.status === 'live').length;
  const total = data?.length ?? 0;

  return (
    <div
      data-ball-anchor="date-card"
      className="relative rounded-2xl bg-bg-elev1 border border-white/5 shadow-card p-6 md:p-8 min-h-[480px] flex flex-col"
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold mb-1">
        Today
      </div>
      <div className="font-display text-2xl md:text-3xl text-text">
        {formatHeroDate(new Date())}
      </div>
      <div className="text-text-dim text-sm mt-1">
        {total} matches today · {live} live now · {Math.max(0, total - live)} upcoming
      </div>

      {isFallback && <div className="mt-4"><FallbackBanner onRetry={refetch} /></div>}

      <div className="mt-6 flex-1 flex flex-col gap-3 relative">
        <DateImpact />
        <AnimatePresence>
          {revealed && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="flex flex-col gap-3"
            >
              {isLoading && <Skeleton className="h-48" />}
              {!isLoading && featured && <MatchCard variant="hero" match={featured} />}
              {!isLoading && rest.length > 0 && (
                <div className="grid gap-2">
                  {rest.map((m) => (
                    <MatchCard key={m.id} variant="today" match={m} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
