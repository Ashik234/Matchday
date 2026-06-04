import { motion } from 'framer-motion';
import type { BracketNode } from '@/data/types';
import { MatchCard } from './MatchCard';
import { TrophyCenter } from './TrophyCenter';

const LABELS = {
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  F: 'Final',
} as const;

function RoundStrip({ label, nodes }: { label: string; nodes: BracketNode[] }) {
  if (!nodes.length) return null;
  return (
    <section aria-label={label}>
      <h3 className="text-[10px] uppercase tracking-[0.3em] text-gold mb-2 px-1">{label}</h3>
      <div className="no-scrollbar flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4">
        {nodes.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="shrink-0 w-[230px] snap-start"
          >
            <MatchCard node={n} isOnPath={false} onHoverTeam={() => {}} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Funnel({ from, to }: { from: number; to: number }) {
  return (
    <div
      aria-hidden
      className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-text-dim py-3"
    >
      <span>{from}</span>
      <span>→</span>
      <span>{to}</span>
    </div>
  );
}

export function BracketWaterfall({
  rounds,
}: {
  rounds: { R16: BracketNode[]; QF: BracketNode[]; SF: BracketNode[]; F: BracketNode[] };
}) {
  return (
    <div className="space-y-2">
      <RoundStrip label={LABELS.R16} nodes={rounds.R16} />
      <Funnel from={8} to={4} />
      <RoundStrip label={LABELS.QF} nodes={rounds.QF} />
      <Funnel from={4} to={2} />
      <RoundStrip label={LABELS.SF} nodes={rounds.SF} />
      <Funnel from={2} to={1} />
      <RoundStrip label={LABELS.F} nodes={rounds.F} />
      <div className="flex justify-center pt-4">
        <TrophyCenter size={72} />
      </div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-text-dim mt-2 text-center">
        ← swipe →
      </div>
    </div>
  );
}
