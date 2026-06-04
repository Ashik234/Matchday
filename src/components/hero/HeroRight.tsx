import { useUpcomingMatches } from '@/data/queries';
import { UpcomingMatchCard } from './UpcomingMatchCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { FallbackBanner } from '@/components/ui/FallbackBanner';

export function HeroRight() {
  const { data, isLoading, isFallback, refetch } = useUpcomingMatches(2);

  return (
    <div className="space-y-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
        Up Next
      </div>
      {isFallback && <FallbackBanner onRetry={refetch} />}
      {isLoading && (
        <>
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </>
      )}
      {!isLoading && data?.map((m) => <UpcomingMatchCard key={m.id} match={m} />)}
    </div>
  );
}
