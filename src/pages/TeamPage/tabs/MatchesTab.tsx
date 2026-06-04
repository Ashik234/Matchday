import type { Team, Match } from '@/data/types';
import { MatchTimeline } from '../components/MatchTimeline';
import { Flag } from '@/components/ui/Flag';
import { formatDate } from '@/utils/formatDate';

export function MatchesTab({ team, matches }: { team: Team; matches: Match[] }) {
  const upcoming = matches.filter((m) => m.status === 'scheduled');

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Last 5</h2>
        <MatchTimeline matches={matches} teamName={team.name} />
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="text-text-dim">No upcoming fixtures.</div>
        ) : (
          <ul className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
            {upcoming.map((m) => {
              const opp = m.home.teamId === team.name ? m.away : m.home;
              return (
                <li
                  key={m.id}
                  className="shrink-0 w-64 rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md"
                >
                  <div className="flex items-center gap-2">
                    <Flag countryCode={opp.countryCode} size="md" />
                    <div>
                      <div className="text-sm font-semibold text-text truncate">vs {opp.name}</div>
                      <div className="text-[11px] text-text-dim">{formatDate(m.kickoff)}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-text-dim">{m.stadium.name}</div>
                  <div className="text-[11px] text-text-dim">{m.stage}</div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
