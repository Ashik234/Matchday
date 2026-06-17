import type { Market1x2 } from '@/data/api/bzzoiro';

const HOME = '#FFD700';
const DRAW = '#6B7280';
const AWAY = '#3B82F6';

type Outcome = { label: string; price: number | null; color: string };

function pct(p: number | null): string {
  return p == null ? '—' : `${(p * 100).toFixed(1)}%`;
}
function odds(p: number | null): string {
  return p == null || p <= 0 ? '—' : (1 / p).toFixed(2);
}
function relTime(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function MarketBar({
  market,
  homeName,
  awayName,
}: {
  market: Market1x2;
  homeName: string;
  awayName: string;
}) {
  const outcomes: Outcome[] = [
    { label: homeName, price: market.home, color: HOME },
    { label: 'Draw', price: market.draw, color: DRAW },
    { label: awayName, price: market.away, color: AWAY },
  ];
  const total = outcomes.reduce((s, o) => s + (o.price ?? 0), 0) || 1;

  return (
    <div className="space-y-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5">
        {outcomes.map((o) => (
          <div
            key={o.label}
            style={{ width: `${((o.price ?? 0) / total) * 100}%`, background: o.color }}
            title={`${o.label} ${pct(o.price)}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {outcomes.map((o) => (
          <div key={o.label} className="rounded-lg border border-white/8 bg-white/[0.02] p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-text-dim truncate">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: o.color }} />
              {o.label}
            </div>
            <div className="mt-1 font-display text-2xl text-text">{pct(o.price)}</div>
            <div className="text-[11px] font-mono text-text-dim">@ {odds(o.price)}</div>
          </div>
        ))}
      </div>

      <div className="text-[11px] text-text-dim">
        Polymarket{market.updatedAt ? ` · updated ${relTime(market.updatedAt)}` : ''}
      </div>
    </div>
  );
}
