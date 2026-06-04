import type { Match } from '@/data/types';
import { Flag } from '@/components/ui/Flag';

export type FormResult = 'W' | 'D' | 'L';

const COLOR: Record<FormResult, string> = {
  W: 'bg-success text-bg-deep',
  D: 'bg-gold text-bg-deep',
  L: 'bg-loss text-text',
};

export function formFromMatch(m: Match, teamName: string): FormResult | null {
  if (m.status !== 'finished' || m.home.score === undefined || m.away.score === undefined) {
    return null;
  }
  const isHome = m.home.teamId === teamName;
  const me = isHome ? m.home.score : m.away.score;
  const them = isHome ? m.away.score : m.home.score;
  if (me > them) return 'W';
  if (me < them) return 'L';
  return 'D';
}

export function RecentForm({ matches, teamName }: { matches: Match[]; teamName: string }) {
  const items = matches
    .filter((m) => m.status === 'finished')
    .slice(-5)
    .map((m) => {
      const r = formFromMatch(m, teamName);
      const opponent = m.home.teamId === teamName ? m.away : m.home;
      return { r, opponent, id: m.id };
    })
    .filter((x): x is { r: FormResult; opponent: Match['home']; id: string } => x.r !== null);

  if (!items.length) return <div className="text-text-dim text-sm">No recent matches.</div>;

  return (
    <ul className="flex items-end gap-3">
      {items.map(({ r, opponent, id }) => (
        <li key={id} className="flex flex-col items-center gap-1">
          <span
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${COLOR[r]}`}
            aria-label={`${r} vs ${opponent.name}`}
          >
            {r}
          </span>
          <Flag countryCode={opponent.countryCode} size="sm" />
        </li>
      ))}
    </ul>
  );
}
