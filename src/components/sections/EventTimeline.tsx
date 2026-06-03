import { motion } from 'framer-motion';
import type { MatchEvent } from '@/data/types';

const ICON: Record<MatchEvent['type'], string> = {
  goal: '⚽',
  'own-goal': '🙃',
  penalty: '⚽',
  yellow: '🟨',
  red: '🟥',
  sub: '↔︎',
};

export function EventTimeline({ events }: { events: MatchEvent[] }) {
  return (
    <ul className="space-y-2">
      {events.map((e) => (
        <motion.li
          key={e.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 text-sm"
        >
          <span className="w-10 font-mono text-text-dim">{e.minute}'</span>
          <span aria-hidden>{ICON[e.type]}</span>
          <span className="font-semibold">{e.playerName}</span>
          {e.detail && <span className="text-text-dim text-xs">— {e.detail}</span>}
        </motion.li>
      ))}
    </ul>
  );
}
