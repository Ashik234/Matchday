import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Section } from '../Section';
import { OnThisDayCard } from './OnThisDayCard';
import { useIconicMoments } from '@/data/queries/useIconicMoments';
import { pickOnThisDayMoment, getTodayMMDD } from '@/utils/onThisDay';
import { Skeleton } from '@/components/ui/Skeleton';

export function OnThisDaySection() {
  const { data, isLoading } = useIconicMoments();
  const todayMMDD = getTodayMMDD();

  const { moment, todayMatches, isFallback } = useMemo(() => {
    if (!data?.moments.length) return { moment: null, todayMatches: [], isFallback: false };
    return pickOnThisDayMoment(data.moments, todayMMDD);
  }, [data, todayMMDD]);

  return (
    <Section
      id="on-this-day"
      stage="on-this-day"
      eyebrow="World Cup History"
      title="This Day in World Cup History"
    >
      {isLoading && (
        <Skeleton className="w-full min-h-[480px] md:min-h-[560px] rounded-2xl" />
      )}

      {!isLoading && moment && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <OnThisDayCard
            moment={moment}
            isFallback={isFallback}
            otherCount={todayMatches.length}
            todayMMDD={todayMMDD}
          />
        </motion.div>
      )}
    </Section>
  );
}
