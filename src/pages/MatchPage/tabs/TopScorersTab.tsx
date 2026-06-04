import type { Player } from '@/data/types';
import type { Scorer } from '@/data/queries/useMatchProfile';
import { ScorerCard } from '../components/ScorerCard';

function lastName(name: string) {
  return name.split(' ').slice(-1)[0]?.toLowerCase() ?? '';
}

function isActive(scorerName: string, squad: Player[]): boolean {
  const target = lastName(scorerName);
  return squad.some((p) => lastName(p.name) === target);
}

export function TopScorersTab({
  homeName,
  awayName,
  scorersHome,
  scorersAway,
  squadHome,
  squadAway,
}: {
  homeName: string;
  awayName: string;
  scorersHome: Scorer[];
  scorersAway: Scorer[];
  squadHome: Player[];
  squadAway: Player[];
}) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">{homeName}</h2>
        {scorersHome.length === 0 ? (
          <div className="text-text-dim text-sm">No goals on record.</div>
        ) : (
          <div className="space-y-2">
            {scorersHome.map((s) => (
              <ScorerCard key={s.name} scorer={s} isActive={isActive(s.name, squadHome)} />
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">{awayName}</h2>
        {scorersAway.length === 0 ? (
          <div className="text-text-dim text-sm">No goals on record.</div>
        ) : (
          <div className="space-y-2">
            {scorersAway.map((s) => (
              <ScorerCard key={s.name} scorer={s} isActive={isActive(s.name, squadAway)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
