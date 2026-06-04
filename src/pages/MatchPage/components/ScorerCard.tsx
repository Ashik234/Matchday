import type { Scorer } from '@/data/queries/useMatchProfile';

export function ScorerCard({
  scorer,
  isActive,
}: {
  scorer: Scorer;
  isActive: boolean;
}) {
  return (
    <article className="rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md flex items-center gap-3">
      <div className="font-display text-3xl text-gold w-12 text-center">
        {scorer.goals}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-text truncate">{scorer.name}</h3>
        <p className="text-[11px] text-text-dim truncate">{scorer.lastTournament}</p>
      </div>
      {isActive && (
        <span className="text-[10px] uppercase tracking-[0.15em] bg-success/20 text-success px-2 py-0.5 rounded-full">
          Active 2026
        </span>
      )}
    </article>
  );
}
