import { useMomentum } from '@/data/queries/useMomentum';
import { MomentumWave } from '../components/MomentumWave';
import type { Match } from '@/data/types';

const HOME = '#FFD700';
const AWAY = '#3B82F6';

export function MomentumTab({ match }: { match: Match }) {
  const eventId = Number(match.id);
  const numeric = Number.isFinite(eventId);
  const isLive = match.status === 'live';

  const { points, isLoading, isError } = useMomentum(
    numeric ? eventId : undefined,
    isLive,
    match.liveWsTracked ?? false,
  );

  if (!numeric) {
    return <div className="text-text-dim text-sm">Live momentum needs the live data source.</div>;
  }
  if (isLoading) {
    return <div className="text-text-dim text-sm">Loading momentum…</div>;
  }
  if (isError) {
    return <div className="text-text-dim text-sm">Momentum is unavailable for this match.</div>;
  }

  const current = points.length ? points[points.length - 1]!.v : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em]">
        <span className="flex items-center gap-2 text-text">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: HOME }} />
          {match.home.name} ↑
        </span>
        {isLive && (
          <span className="text-text-dim font-mono">
            now: {current >= 0 ? `+${current}` : current}
          </span>
        )}
        <span className="flex items-center gap-2 text-text">
          {match.away.name} ↓
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: AWAY }} />
        </span>
      </div>
      <MomentumWave points={points} homeColor={HOME} awayColor={AWAY} isLive={isLive} />
    </div>
  );
}
