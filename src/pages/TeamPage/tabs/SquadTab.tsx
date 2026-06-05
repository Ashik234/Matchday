import { useMemo, useState } from 'react';
import type { Player, Position } from '@/data/types';
import { PlayerCard } from '../components/PlayerCard';

const POS_FILTERS: Array<'ALL' | Position> = ['ALL', 'GK', 'DF', 'MF', 'FW'];

export function SquadTab({ squad, countryCode }: { squad: Player[]; countryCode?: string }) {
  const [q, setQ] = useState('');
  const [pos, setPos] = useState<'ALL' | Position>('ALL');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return squad.filter((p) => {
      if (pos !== 'ALL' && p.position !== pos) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        (p.club ?? '').toLowerCase().includes(needle)
      );
    });
  }, [squad, q, pos]);

  if (!squad.length) {
    return (
      <div className="text-text-dim">
        Squad not yet scraped. Run <code className="text-gold">pnpm scrape:squads</code>.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or club…"
          className="px-3 py-2 rounded-full bg-bg-elev1 border border-white/8 text-sm text-text placeholder:text-text-muted w-full sm:w-72"
          aria-label="Search players"
        />
        <div role="tablist" aria-label="Filter by position" className="flex gap-1">
          {POS_FILTERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPos(p)}
              aria-pressed={pos === p}
              className={
                'px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.12em] border transition-colors ' +
                (pos === p
                  ? 'bg-gold text-bg-deep border-gold'
                  : 'bg-bg-elev1/40 text-text-dim border-white/10 hover:text-text')
              }
            >
              {p === 'ALL' ? 'All' : p}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-text-dim">No players match those filters.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <PlayerCard key={p.id} player={p} countryCode={countryCode} />
          ))}
        </div>
      )}
    </div>
  );
}
