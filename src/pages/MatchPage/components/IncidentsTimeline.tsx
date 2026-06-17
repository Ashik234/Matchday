import type { Incident, IncidentType } from '@/data/api/bzzoiroTypes';

const ICON: Record<IncidentType, string> = {
  goal: '⚽',
  'own-goal': '⚽',
  penalty: '⚽',
  'penalty-miss': '❌',
  yellow: '🟨',
  red: '🟥',
  sub: '🔄',
  var: '📺',
  unknown: '⚪',
};

const HOME_DOT = '#FFD700';
const AWAY_DOT = '#3B82F6';

function label(minute: number, addedTime?: number): string {
  return addedTime ? `${minute}+${addedTime}'` : `${minute}'`;
}

export function IncidentsTimeline({ incidents }: { incidents: Incident[] }) {
  if (!incidents.length) {
    return <div className="text-text-dim text-sm">No incidents yet.</div>;
  }
  return (
    <ol className="relative pl-3 border-l border-white/10 space-y-2">
      {incidents.map((e) => (
        <li key={e.id} className="relative text-xs">
          <span
            className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full"
            style={{ background: e.teamSide === 'home' ? HOME_DOT : AWAY_DOT }}
          />
          <span className="font-mono text-text-dim mr-2">{label(e.minute, e.addedTime)}</span>
          <span className="mr-1">{ICON[e.type]}</span>
          {e.player && <span className="text-text">{e.player}</span>}
          {e.detail && <span className="text-text-dim"> · {e.detail}</span>}
        </li>
      ))}
    </ol>
  );
}
