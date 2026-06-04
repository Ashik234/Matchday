import { motion } from 'framer-motion';
import { Section } from './Section';
import { GroupCard } from './GroupCard';
import { useGroupStandings } from '@/data/queries';
import { Skeleton } from '@/components/ui/Skeleton';
import { FallbackBanner } from '@/components/ui/FallbackBanner';

export function GroupStandings() {
  const { data, isLoading, isFallback, refetch } = useGroupStandings();

  return (
    <Section id="groups" stage="groups" eyebrow="Groups" title="Group Standings">
      {isFallback && <FallbackBanner onRetry={refetch} />}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
        {!isLoading &&
          data?.map((g, i) => (
            <motion.div
              key={g.letter}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <GroupCard group={g} />
            </motion.div>
          ))}
      </div>
    </Section>
  );
}
