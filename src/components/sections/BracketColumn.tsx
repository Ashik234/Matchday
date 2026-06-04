import { motion } from 'framer-motion';
import { Flag } from '@/components/ui/Flag';
import type { BracketNode, BracketSide } from '@/data/types';

// Placeholder codes openfootball emits when actual teams aren't decided yet,
// e.g. "W74" = winner of match 74, "L11" = loser, "1A" = group A winner.
const PLACEHOLDER = /^([WL]\d+|[123]\w+|TBD)$/i;

function isPlaceholder(side: BracketSide | undefined): boolean {
  if (!side) return true;
  return PLACEHOLDER.test(side.name) || side.countryCode === 'xx';
}

function SideRow({ side }: { side: BracketSide | undefined }) {
  if (!side) return <div className="text-text-dim text-xs uppercase tracking-wider">TBD</div>;
  if (isPlaceholder(side)) {
    return (
      <div className="flex items-center gap-2 text-text-dim">
        <span className="w-5 h-3 rounded-sm bg-bg-elev2" aria-hidden />
        <span className="text-[11px] uppercase tracking-wider">{side.name}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Flag countryCode={side.countryCode} size="sm" />
      <span className="font-semibold text-xs truncate">{side.name}</span>
    </div>
  );
}

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
    <div className="flex flex-col gap-3 w-[230px] sm:w-[200px] shrink-0 snap-start">
      <div className="text-[10px] uppercase tracking-[0.3em] text-gold sticky top-0 bg-bg/90 backdrop-blur py-1 z-10">
        {label}
      </div>
      {nodes.map((n, i) => (
        <motion.div
          key={n.id}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: delay + i * 0.06 }}
          className="rounded-lg bg-bg-elev1 border border-white/5 p-3 space-y-2"
        >
          <SideRow side={n.home} />
          <div className="border-t border-white/5" />
          <SideRow side={n.away} />
        </motion.div>
      ))}
    </div>
  );
}
