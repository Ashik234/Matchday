import { Flag } from '@/components/ui/Flag';
import type { Match, HistoricalMatch } from '@/data/types';

type Result = 'W' | 'D' | 'L';
const COLOR: Record<Result, string> = {
  W: 'bg-success text-bg-deep',
  D: 'bg-gold text-bg-deep',
  L: 'bg-loss text-text',
};

function resultFor(item: Match | HistoricalMatch, teamName: string, teamCode: string): { r: Result | null; oppName: string; oppCode: string; score: string } {
  if ('status' in item) {
    if (item.status !== 'finished' || item.home.score === undefined || item.away.score === undefined) {
      return { r: null, oppName: '', oppCode: '', score: '' };
    }
    const isHome = item.home.teamId === teamName;
    const me = isHome ? item.home.score : item.away.score;
    const them = isHome ? item.away.score : item.home.score;
    const r: Result = me > them ? 'W' : me < them ? 'L' : 'D';
    return {
      r,
      oppName: isHome ? item.away.name : item.home.name,
      oppCode: isHome ? item.away.countryCode : item.home.countryCode,
      score: `${item.home.score}-${item.away.score}`,
    };
  }
  const isHome = item.home.code === teamCode;
  const me = isHome ? item.home.score : item.away.score;
  const them = isHome ? item.away.score : item.home.score;
  const r: Result = me > them ? 'W' : me < them ? 'L' : 'D';
  return {
    r,
    oppName: isHome ? item.away.name : item.home.name,
    oppCode: (isHome ? item.away.code : item.home.code).toLowerCase(),
    score: `${item.home.score}-${item.away.score}`,
  };
}

export function FormStrip({
  items,
  teamName,
  teamCode,
}: {
  items: Array<Match | HistoricalMatch>;
  teamName: string;
  teamCode: string;
}) {
  if (!items.length) return <div className="text-text-dim text-sm">No matches on record.</div>;
  return (
    <ul className="flex items-end gap-3">
      {items.map((m, i) => {
        const { r, oppName, oppCode, score } = resultFor(m, teamName, teamCode);
        if (!r) return null;
        return (
          <li key={i} className="flex flex-col items-center gap-1">
            <span
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${COLOR[r]}`}
              aria-label={`${r} vs ${oppName} ${score}`}
            >
              {r}
            </span>
            {oppCode && <Flag countryCode={oppCode} size="sm" />}
            <span className="text-[10px] text-text-dim">{score}</span>
          </li>
        );
      })}
    </ul>
  );
}
