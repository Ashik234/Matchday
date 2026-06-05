import { memo } from 'react';
import { PORTRAIT_CLASS, type PortraitSize } from '@/utils/playerImageSize';
import { flagColors } from '@/utils/flagColors';
import type { Player } from '@/data/types';

type Props = {
  player: Player;
  countryCode?: string;
  size?: PortraitSize;
  shape?: 'card' | 'circle';
  loading?: 'lazy' | 'eager';
  showJerseyBadge?: boolean;
  className?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function PlayerPortraitInner({
  player,
  countryCode,
  size = 'md',
  shape = 'card',
  loading = 'lazy',
  showJerseyBadge = false,
  className,
}: Props) {
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';
  const wrapperClass = `${PORTRAIT_CLASS[size]} relative overflow-hidden ${shapeClass} ${className ?? ''}`;

  if (player.image) {
    const useIcon = (size === 'xs' || size === 'sm') && player.image.iconUrl;
    const src = useIcon ? player.image.iconUrl! : player.image.url;
    return (
      <div className={wrapperClass}>
        <img
          src={src}
          alt={`${player.name}, #${player.jersey}`}
          width={useIcon ? 360 : player.image.width}
          height={useIcon ? 360 : player.image.height}
          loading={loading}
          decoding="async"
          className={`w-full h-full ${useIcon ? 'object-cover' : 'object-cover object-top'}`}
        />
        {showJerseyBadge && (
          <span className="absolute top-1.5 right-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-bg-deep/80 text-gold border border-gold/40">
            #{player.jersey}
          </span>
        )}
      </div>
    );
  }

  // CSS fallback (no manifest entry yet — e.g. during dev before scrape).
  const colors = flagColors(countryCode);
  const c1 = colors[0] ?? '#1a1a1a';
  const c2 = colors[1] ?? '#3a3a3a';
  return (
    <div
      className={wrapperClass}
      role="img"
      aria-label={`${player.name}, #${player.jersey}`}
      style={{ background: `linear-gradient(180deg, ${c1} 0%, ${c2} 100%)` }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center font-display text-white/90"
        style={{ fontSize: size === 'xs' ? 12 : size === 'sm' ? 22 : size === 'md' ? 48 : size === 'lg' ? 96 : 160 }}
      >
        {initials(player.name)}
      </span>
      {showJerseyBadge && (
        <span className="absolute top-1.5 right-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-bg-deep/80 text-gold border border-gold/40">
          #{player.jersey}
        </span>
      )}
    </div>
  );
}

export const PlayerPortrait = memo(PlayerPortraitInner);
