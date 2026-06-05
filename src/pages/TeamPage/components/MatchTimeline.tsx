import { Link } from 'react-router-dom';
import { Flag } from '@/components/ui/Flag';
import type { Match } from '@/data/types';
import { formatDate } from '@/utils/formatDate';
import { toMatchSlug } from '@/utils/matchSlug';

export function MatchTimeline({ matches, teamName }: { matches: Match[]; teamName: string }) {
  const items = matches.filter((m) => m.status === 'finished').slice(-5);
  if (!items.length) return <div className="text-text-dim text-sm">No previous matches.</div>;

  return (
    <ol className="relative pl-3 border-l border-white/10 space-y-4">
      {items.map((m) => {
        const opp = m.home.teamId === teamName ? m.away : m.home;
        return (
          <li key={m.id} className="relative">
            <span className="absolute -left-[7px] top-2 w-3 h-3 rounded-full bg-gold" />
            <Link
              to={`/match/${toMatchSlug(m)}`}
              className="rounded-xl bg-bg-elev1/40 border border-white/8 backdrop-blur-md p-3 flex items-center gap-3 hover:bg-bg-elev1/60 transition-colors"
            >
              <Flag countryCode={opp.countryCode} size="md" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-text truncate">vs {opp.name}</div>
                <div className="text-[11px] text-text-dim">{formatDate(m.kickoff)}</div>
              </div>
              <div className="font-display text-xl text-text">
                {m.home.score}-{m.away.score}
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
