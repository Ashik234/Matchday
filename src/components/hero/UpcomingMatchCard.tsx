import { MatchCard } from '@/components/ui/MatchCard';
import type { Match } from '@/data/types';

export function UpcomingMatchCard({ match }: { match: Match }) {
  return <MatchCard variant="upcoming" match={match} />;
}
