import type { Player } from '@/data/types';
import { PlayerPortrait } from '@/components/ui/PlayerPortrait';

const POS_ORDER = ['GK', 'DF', 'MF', 'FW'] as const;

export function SquadColumn({
  name,
  squad,
  countryCode,
}: {
  name: string;
  squad: Player[];
  countryCode?: string;
}) {
  if (!squad.length) {
    return <div className="text-text-dim text-sm">No squad data for {name}.</div>;
  }
  const withAge = squad.filter((p) => p.age !== undefined);
  const avgAge = withAge.length
    ? withAge.reduce((s, p) => s + (p.age ?? 0), 0) / withAge.length
    : 0;
  const totalGoals = squad.reduce((s, p) => s + (p.goals ?? 0), 0);

  return (
    <section>
      <header className="flex items-baseline justify-between mb-3">
        <h2 className="font-display text-xl text-text">{name}</h2>
        <div className="text-[11px] text-text-dim">
          avg age {avgAge.toFixed(1)} · {totalGoals} intl goals
        </div>
      </header>
      {POS_ORDER.map((pos) => {
        const rows = squad.filter((p) => p.position === pos);
        if (!rows.length) return null;
        return (
          <div key={pos} className="mb-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-text-dim mb-1">
              {pos}
            </div>
            <ul className="space-y-1">
              {rows.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-xs">
                  <PlayerPortrait player={p} countryCode={countryCode} size="xs" shape="circle" />
                  <span className="font-mono text-gold w-6 text-right">#{p.jersey}</span>
                  <span className="text-text truncate flex-1">{p.name}</span>
                  <span className="text-text-dim truncate">{p.club}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
