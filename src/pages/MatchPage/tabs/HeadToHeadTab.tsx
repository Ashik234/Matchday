import type { HistoricalMatch } from '@/data/types';
import { H2HSummary } from '../components/H2HSummary';

export function HeadToHeadTab({
  homeName,
  awayName,
  homeCode,
  h2h,
}: {
  homeName: string;
  awayName: string;
  homeCode: string;
  h2h: HistoricalMatch[];
}) {
  if (!h2h.length) {
    return <div className="text-text-dim">No previous meetings on record.</div>;
  }
  let wHome = 0;
  let draws = 0;
  let wAway = 0;
  let gfHome = 0;
  let gfAway = 0;
  for (const m of h2h) {
    const homeIsHome = m.home.code === homeCode;
    const meScore = homeIsHome ? m.home.score : m.away.score;
    const themScore = homeIsHome ? m.away.score : m.home.score;
    gfHome += meScore;
    gfAway += themScore;
    if (meScore > themScore) wHome++;
    else if (meScore < themScore) wAway++;
    else draws++;
  }

  return (
    <div className="space-y-6">
      <H2HSummary
        homeName={homeName}
        awayName={awayName}
        wHome={wHome}
        draws={draws}
        wAway={wAway}
      />
      <p className="text-text-dim text-sm">
        Total goals: <span className="text-text">{homeName} {gfHome} · {awayName} {gfAway}</span> over {h2h.length} meeting{h2h.length === 1 ? '' : 's'}.
      </p>
    </div>
  );
}
