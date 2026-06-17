import { useMarkets } from '@/data/queries/useMarkets';
import { MarketBar } from '../components/MarketBar';
import type { Match } from '@/data/types';

export function MarketsTab({ match }: { match: Match }) {
  const eventId = Number(match.id);
  const numeric = Number.isFinite(eventId);
  const { data, isLoading, isError } = useMarkets(numeric ? eventId : undefined);

  if (!numeric) {
    return (
      <div className="text-text-dim text-sm">
        Prediction-market prices need the live data source.
      </div>
    );
  }
  if (isLoading) {
    return <div className="text-text-dim text-sm">Loading market prices…</div>;
  }
  if (isError) {
    return <div className="text-text-dim text-sm">Market prices are unavailable for this match.</div>;
  }
  if (!data) {
    return <div className="text-text-dim text-sm">No prediction-market prices for this match.</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xs uppercase tracking-[0.14em] text-text-dim">Match result · implied odds</h2>
      <MarketBar market={data} homeName={match.home.name} awayName={match.away.name} />
    </div>
  );
}
