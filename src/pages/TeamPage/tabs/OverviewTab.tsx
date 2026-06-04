import type { Team, Match } from '@/data/types';
import { RecentForm, formFromMatch } from '../components/RecentForm';
import { StatBar } from '../components/StatBar';
import { ACHIEVEMENTS } from '../data/achievements';

export function OverviewTab({ team, matches }: { team: Team; matches: Match[] }) {
  const finished = matches.filter((m) => m.status === 'finished');
  let w = 0;
  let d = 0;
  let l = 0;
  let gf = 0;
  let ga = 0;
  for (const m of finished) {
    const r = formFromMatch(m, team.name);
    if (r === 'W') w++;
    else if (r === 'D') d++;
    else if (r === 'L') l++;
    const isHome = m.home.teamId === team.name;
    gf += (isHome ? m.home.score : m.away.score) ?? 0;
    ga += (isHome ? m.away.score : m.home.score) ?? 0;
  }
  const playedMax = Math.max(1, w + d + l);
  const achievements = ACHIEVEMENTS[team.id] ?? [];

  return (
    <div className="space-y-8">
      <p className="text-text-dim max-w-2xl">
        {team.name} represent {team.federation} at the FIFA World Cup 2026.
        {team.fifaRank ? ` They sit at FIFA rank #${team.fifaRank}.` : ''}
        {team.group ? ` They are placed in Group ${team.group}.` : ''}
      </p>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Qualification</h2>
        <p className="text-text">Qualified via {team.federation} qualifiers.</p>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Tournament performance</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 max-w-xl">
          <StatBar label="Wins" value={w} max={playedMax} tone="success" />
          <StatBar label="Draws" value={d} max={playedMax} tone="gold" />
          <StatBar label="Losses" value={l} max={playedMax} tone="live" />
          <StatBar label="Goals for" value={gf} max={Math.max(1, gf + ga)} tone="gold" />
          <StatBar label="Goals against" value={ga} max={Math.max(1, gf + ga)} tone="live" />
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Recent form</h2>
        <RecentForm matches={matches} teamName={team.name} />
      </section>

      {achievements.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Key achievements</h2>
          <ul className="list-disc list-inside text-text space-y-1">
            {achievements.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
