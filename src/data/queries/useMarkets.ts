import { useQuery } from '@tanstack/react-query';
import { bzzoiro, type Market1x2 } from '@/data/api/bzzoiro';
import { hasBzzoiroKey } from '@/data/api/client';

const TTL_MS = 60_000;

type Result = {
  data: Market1x2 | null | undefined;
  isLoading: boolean;
  isError: boolean;
};

// Polymarket 1X2 prices for a match. Bzzoiro-only: a missing key or a
// non-numeric (openfootball) event id disables the query. Returns null when the
// match has no prediction market.
export function useMarkets(eventId?: number): Result {
  const enabled = hasBzzoiroKey() && typeof eventId === 'number' && Number.isFinite(eventId);

  const q = useQuery<Market1x2 | null, Error>({
    queryKey: ['polymarket', eventId],
    queryFn: ({ signal }) => bzzoiro.polymarket(eventId!, signal!),
    enabled,
    staleTime: TTL_MS,
  });

  return { data: q.data, isLoading: q.isLoading, isError: q.isError };
}
