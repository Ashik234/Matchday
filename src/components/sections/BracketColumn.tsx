import { motion } from 'framer-motion';
import { Flag } from '@/components/ui/Flag';
import type { BracketNode } from '@/data/types';

export function BracketColumn({
  label,
  nodes,
  delay,
}: {
  label: string;
  nodes: BracketNode[];
  delay: number;
}) {
  return (
    <div className="flex flex-col gap-4 min-w-[180px]">
      <div className="text-[10px] uppercase tracking-[0.3em] text-gold">{label}</div>
      {nodes.map((n, i) => (
        <motion.div
          key={n.id}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: delay + i * 0.08 }}
          className="rounded-lg bg-bg-elev1 border border-white/5 p-3 text-xs space-y-2"
        >
          {n.home ? (
            <div className="flex items-center gap-2">
              <Flag countryCode={n.home.countryCode} size="sm" />
              <span className="font-semibold">{n.home.name}</span>
            </div>
          ) : (
            <div className="text-text-dim">TBD</div>
          )}
          <div className="border-t border-white/5" />
          {n.away ? (
            <div className="flex items-center gap-2">
              <Flag countryCode={n.away.countryCode} size="sm" />
              <span className="font-semibold">{n.away.name}</span>
            </div>
          ) : (
            <div className="text-text-dim">TBD</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
