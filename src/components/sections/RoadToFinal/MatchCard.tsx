import { Link } from 'react-router-dom';
import { Flag } from '@/components/ui/Flag';
import { toSlug } from '@/utils/slug';
import { isPlaceholder } from './isPlaceholder';
import type { BracketNode, BracketSide } from '@/data/types';

function SideContent({ side }: { side: BracketSide | undefined }) {
  if (!side) return <span className="text-text-dim text-[11px] uppercase tracking-wider">TBD</span>;
  if (isPlaceholder(side)) {
    return (
      <span className="flex items-center gap-2 text-text-dim">
        <span className="w-5 h-3 rounded-sm bg-bg-elev2" aria-hidden />
        <span className="text-[11px] uppercase tracking-wider truncate">{side.name}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2 min-w-0">
      <Flag countryCode={side.countryCode} size="sm" />
      <span className="font-semibold text-xs truncate">{side.name}</span>
    </span>
  );
}

function Side({
  side,
  isWinner,
  onHover,
}: {
  side: BracketSide | undefined;
  isWinner: boolean;
  onHover: (name: string | null) => void;
}) {
  const realTeam = side && !isPlaceholder(side);
  const handleEnter = () => {
    if (realTeam && side) onHover(side.name);
  };
  const handleLeave = () => onHover(null);

  const inner = (
    <span
      className={
        'flex items-center justify-between gap-2 px-2 py-1.5 ' +
        (isWinner ? 'border-l-2 border-gold bg-bg-elev1/70' : '')
      }
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <SideContent side={side} />
    </span>
  );

  if (realTeam && side) {
    return (
      <Link to={`/team/${toSlug(side.name)}`} className="block hover:text-gold transition-colors">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function MatchCard({
  node,
  isOnPath,
  onHoverTeam,
}: {
  node: BracketNode;
  isOnPath: boolean;
  onHoverTeam: (name: string | null) => void;
}) {
  const winnerId = node.winnerTeamId;
  return (
    <div
      role="group"
      aria-label={`${node.home?.name ?? 'TBD'} vs ${node.away?.name ?? 'TBD'}`}
      className={
        'rounded-lg bg-bg-elev1/40 backdrop-blur-md border transition-all duration-fast ' +
        (isOnPath
          ? 'border-gold shadow-gold -translate-y-0.5'
          : 'border-white/10')
      }
    >
      <Side
        side={node.home}
        isWinner={!!winnerId && node.home?.teamId === winnerId}
        onHover={onHoverTeam}
      />
      <div className="border-t border-white/5" />
      <Side
        side={node.away}
        isWinner={!!winnerId && node.away?.teamId === winnerId}
        onHover={onHoverTeam}
      />
    </div>
  );
}
