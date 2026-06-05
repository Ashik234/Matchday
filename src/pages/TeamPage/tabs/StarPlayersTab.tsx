import type { Team, Player } from '@/data/types';
import { STAR_PLAYER_JERSEYS } from '../data/starPlayers';
import { PlayerPortrait } from '@/components/ui/PlayerPortrait';

export function StarPlayersTab({ team, squad }: { team: Team; squad: Player[] }) {
  const jerseys = STAR_PLAYER_JERSEYS[team.id] ?? [];
  const picks = jerseys
    .map((j) => squad.find((p) => p.jersey === j))
    .filter((p): p is Player => Boolean(p));

  if (picks.length === 0) {
    return (
      <div className="text-text-dim">
        No star players curated for this team yet, or the squad hasn’t been scraped.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {picks.map((p) => (
        <article
          key={p.id}
          className="rounded-2xl p-5 bg-bg-elev1/40 border border-white/8 backdrop-blur-md"
        >
          <PlayerPortrait
            player={p}
            countryCode={team.countryCode}
            size="xl"
            shape="card"
            showJerseyBadge
            loading="eager"
            className="mx-auto mb-4"
          />
          <h3 className="font-display text-2xl text-text">{p.name}</h3>
          <p className="text-text-dim text-sm">{p.position} · {p.club || 'Club unknown'}</p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <dt className="text-text-dim">Age</dt>
              <dd className="text-text">{p.age ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-dim">Caps</dt>
              <dd className="text-text">{p.caps ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-dim">Goals</dt>
              <dd className="text-text">{p.goals ?? '—'}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
