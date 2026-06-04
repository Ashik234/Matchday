import type { Player } from '@/data/types';

const POS_COLOR = {
  GK: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
  DF: 'bg-blue-500/20 text-blue-200 border-blue-400/40',
  MF: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  FW: 'bg-orange-500/20 text-orange-200 border-orange-400/40',
} as const;

export function PlayerCard({ player }: { player: Player }) {
  const posClass = POS_COLOR[player.position];
  return (
    <article className="group relative rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md transition-transform duration-fast hover:scale-[1.02] hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${posClass}`}>
          {player.position}
        </span>
        <span className="font-display text-2xl text-gold leading-none">#{player.jersey}</span>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-text truncate" title={player.name}>
        {player.name}
      </h3>
      <p className="text-[11px] text-text-dim truncate" title={player.club}>
        {player.club || 'Club unknown'}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <dt className="text-text-dim">Age</dt>
          <dd className="text-text">{player.age ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-text-dim">Goals</dt>
          <dd className="text-text">{player.goals ?? '—'}</dd>
        </div>
      </dl>
      <div className="mt-2 max-h-0 group-hover:max-h-12 overflow-hidden transition-[max-height] duration-base text-[11px] text-text-dim">
        Caps: {player.caps ?? '—'}
      </div>
    </article>
  );
}
