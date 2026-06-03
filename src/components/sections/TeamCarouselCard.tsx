import { Card } from '@/components/ui/Card';
import { Flag } from '@/components/ui/Flag';
import type { Team } from '@/data/types';

export function TeamCarouselCard({ team }: { team: Team }) {
  return (
    <Card hover className="min-w-[260px] snap-start">
      <div className="flex items-center gap-3 mb-3">
        <Flag countryCode={team.countryCode} size="lg" />
        <div>
          <div className="font-display text-xl">{team.name}</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim">{team.federation}</div>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-dim">FIFA Rank</span>
        <span className="font-mono text-gold">#{team.fifaRank ?? '—'}</span>
      </div>
    </Card>
  );
}
