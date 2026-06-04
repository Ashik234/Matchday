import { useState } from 'react';
import type { HistoricalMatch } from '@/data/types';
import { EventTimeline } from '../components/EventTimeline';

export function PreviousMeetingsTab({ h2h }: { h2h: HistoricalMatch[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (!h2h.length) {
    return <div className="text-text-dim">No previous meetings on record.</div>;
  }
  const sorted = h2h.slice().sort((a, b) => b.date.localeCompare(a.date));
  return (
    <ol className="space-y-3">
      {sorted.map((m) => {
        const isOpen = openId === m.id;
        return (
          <li key={m.id} className="rounded-2xl bg-bg-elev1/40 border border-white/8 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : m.id)}
              className="w-full text-left p-4 flex items-center gap-4"
            >
              <span className="text-[11px] text-text-dim w-24 shrink-0">{m.date}</span>
              <span className="text-xs text-text-dim flex-1 truncate">{m.tournament} · {m.stage}</span>
              <span className="font-display text-lg text-text">
                {m.home.score}-{m.away.score}
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-2 text-xs text-text-dim">
                <div>Venue: {m.stadium ?? 'Unknown'}{m.attendance ? ` · ${m.attendance.toLocaleString()} att.` : ''}</div>
                {m.referee && <div>Referee: {m.referee}</div>}
                <div className="pt-2"><EventTimeline events={m.events} /></div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
