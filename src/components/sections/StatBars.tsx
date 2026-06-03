import { motion } from 'framer-motion';

type Stat = { label: string; home: number; away: number; unit?: string };

const STATS: Stat[] = [
  { label: 'Possession', home: 58, away: 42, unit: '%' },
  { label: 'Shots', home: 14, away: 9 },
  { label: 'On Target', home: 6, away: 3 },
  { label: 'Corners', home: 5, away: 2 },
];

export function StatBars() {
  return (
    <div className="space-y-3">
      {STATS.map((s) => {
        const total = s.home + s.away || 1;
        return (
          <div key={s.label}>
            <div className="flex justify-between text-xs text-text-dim mb-1">
              <span className="font-mono">{s.home}{s.unit ?? ''}</span>
              <span className="uppercase tracking-wider">{s.label}</span>
              <span className="font-mono">{s.away}{s.unit ?? ''}</span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-bg-elev1">
              <motion.div
                className="bg-gold"
                initial={{ width: 0 }}
                whileInView={{ width: `${(s.home / total) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              />
              <motion.div
                className="bg-text-muted"
                initial={{ width: 0 }}
                whileInView={{ width: `${(s.away / total) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
