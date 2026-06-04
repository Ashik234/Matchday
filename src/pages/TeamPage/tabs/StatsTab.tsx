import type { Team, Match, Group } from '@/data/types';
import { CircleProgress } from '../components/CircleProgress';
import { StatBar } from '../components/StatBar';
import { formFromMatch } from '../components/RecentForm';

function pct(n: number, d: number): string {
  if (d <= 0) return '0%';
  return `${Math.round((n / d) * 100)}%`;
}

export function StatsTab({
  team,
  matches,
  group,
}: {
  team: Team;
  matches: Match[];
  group?: Group;
}) {
  const finished = matches.filter((m) => m.status === 'finished');
  const last10 = finished.slice(-10);
  let w = 0;
  let drw = 0;
  let l = 0;
  let cleanSheets = 0;
  for (const m of finished) {
    const r = formFromMatch(m, team.name);
    if (r === 'W') w++;
    else if (r === 'D') drw++;
    else if (r === 'L') l++;
    const isHome = m.home.teamId === team.name;
    const them = (isHome ? m.away.score : m.home.score) ?? 0;
    if (them === 0) cleanSheets++;
  }
  const total = w + drw + l;
  const cleanRate = total > 0 ? cleanSheets / total : 0;
  const avgFor =
    total > 0
      ? finished.reduce((acc, m) => {
          const isHome = m.home.teamId === team.name;
          return acc + ((isHome ? m.home.score : m.away.score) ?? 0);
        }, 0) / total
      : 0;

  const groupAvg =
    group && group.standings.length
      ? group.standings.reduce((acc, s) => acc + s.gf, 0) /
        group.standings.reduce((acc, s) => acc + Math.max(1, s.played), 0)
      : 0;
  const cmpMax = Math.max(avgFor, groupAvg, 0.01);

  return (
    <div className="space-y-10">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CircleProgress label="Win %" value={total ? w / total : 0} display={pct(w, total)} />
        <CircleProgress label="Draw %" value={total ? drw / total : 0} display={pct(drw, total)} />
        <CircleProgress label="Loss %" value={total ? l / total : 0} display={pct(l, total)} />
        <CircleProgress label="Clean sheet %" value={cleanRate} display={pct(cleanSheets, total)} />
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Goals scored (last {last10.length})</h2>
        <div className="space-y-2 max-w-xl">
          {last10.map((m, i) => {
            const opp = m.home.teamId === team.name ? m.away : m.home;
            const isHome = m.home.teamId === team.name;
            const me = (isHome ? m.home.score : m.away.score) ?? 0;
            return (
              <StatBar
                key={m.id + i}
                label={`vs ${opp.name}`}
                value={me}
                max={Math.max(5, me)}
                tone="success"
              />
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Goals conceded (last {last10.length})</h2>
        <div className="space-y-2 max-w-xl">
          {last10.map((m, i) => {
            const opp = m.home.teamId === team.name ? m.away : m.home;
            const isHome = m.home.teamId === team.name;
            const them = (isHome ? m.away.score : m.home.score) ?? 0;
            return (
              <StatBar
                key={m.id + i + '-ga'}
                label={`vs ${opp.name}`}
                value={them}
                max={Math.max(5, them)}
                tone="live"
              />
            );
          })}
        </div>
      </section>

      {group && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">vs Group average (goals per match)</h2>
          <div className="space-y-2 max-w-xl">
            <StatBar label={team.name} value={Number(avgFor.toFixed(2))} max={cmpMax} tone="gold" />
            <StatBar label={`Group ${group.letter} avg`} value={Number(groupAvg.toFixed(2))} max={cmpMax} />
          </div>
        </section>
      )}
    </div>
  );
}
