import type { Match, HistoricalMatch } from '@/data/types';
import { FormStrip } from '../components/FormStrip';

export function RecentFormTab({
  homeName,
  awayName,
  homeCode,
  awayCode,
  recentHome,
  recentAway,
}: {
  homeName: string;
  awayName: string;
  homeCode: string;
  awayCode: string;
  recentHome: Array<Match | HistoricalMatch>;
  recentAway: Array<Match | HistoricalMatch>;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">{homeName}</h2>
        <FormStrip items={recentHome} teamName={homeName} teamCode={homeCode} />
      </section>
      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-text-dim mb-3">{awayName}</h2>
        <FormStrip items={recentAway} teamName={awayName} teamCode={awayCode} />
      </section>
    </div>
  );
}
