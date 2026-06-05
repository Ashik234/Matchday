import type { HistoricalEvent } from '@/data/types';

const ICON: Record<HistoricalEvent['type'], string> = {
  goal: '⚽',
  'own-goal': '⚽',
  penalty: '⚽',
  yellow: '🟨',
  red: '🟥',
  sub: '🔄',
};

export function EventTimeline({ events }: { events: HistoricalEvent[] }) {
  if (!events.length) return <div className="text-text-dim text-sm">No events on record.</div>;
  return (
    <ol className="relative pl-3 border-l border-white/10 space-y-2">
      {events.map((e, i) => (
        <li key={i} className="relative text-xs">
          <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-gold" />
          <span className="font-mono text-text-dim mr-2">{e.minute}'</span>
          <span className="mr-1">{ICON[e.type]}</span>
          <span className="text-text">{e.player}</span>
          {e.detail && <span className="text-text-dim"> · {e.detail}</span>}
        </li>
      ))}
    </ol>
  );
}
