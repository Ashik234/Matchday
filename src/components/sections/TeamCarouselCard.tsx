import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Flag } from '@/components/ui/Flag';
import { toSlug } from '@/utils/slug';
import { flagConicGradient } from '@/utils/flagColors';
import type { Team } from '@/data/types';

export function TeamCarouselCard({ team }: { team: Team }) {
  const gradient = flagConicGradient(team.countryCode);
  return (
    <Link to={`/team/${toSlug(team.name)}`} className="block">
      <div
        className="group relative rounded-xl p-[2px] overflow-hidden"
        style={{ ['--flag-grad' as never]: gradient }}
      >
        <span
          aria-hidden
          className="absolute inset-[-50%] opacity-0 group-hover:opacity-100 transition-opacity duration-300 motion-safe:animate-[flag-sweep_3s_linear_infinite]"
          style={{ background: 'var(--flag-grad)' }}
        />
        <div className="relative rounded-[10px]">
          <Card hover className="w-[260px] shrink-0 snap-start flex flex-col">
            <div className="flex items-center gap-3 mb-3 min-w-0">
              <Flag countryCode={team.countryCode} size="lg" ariaLabel={team.name} />
              <div className="min-w-0 flex-1">
                <div className="font-display text-xl truncate" title={team.name}>{team.name}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim">{team.federation}</div>
              </div>
            </div>
            <div className="mt-auto flex items-center justify-between text-xs">
              <span className="text-text-dim">FIFA Rank</span>
              <span className="font-mono text-gold">#{team.fifaRank ?? '—'}</span>
            </div>
          </Card>
        </div>
        <style>{`@keyframes flag-sweep { to { transform: rotate(360deg); } }`}</style>
      </div>
    </Link>
  );
}
