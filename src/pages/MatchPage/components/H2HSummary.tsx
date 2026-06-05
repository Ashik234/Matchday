import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function H2HSummary({
  homeName,
  awayName,
  wHome,
  draws,
  wAway,
}: {
  homeName: string;
  awayName: string;
  wHome: number;
  draws: number;
  wAway: number;
}) {
  const total = Math.max(1, wHome + draws + wAway);
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const pct = (n: number) => `${(n / total) * 100}%`;

  return (
    <div ref={ref} className="grid grid-cols-3 gap-4">
      <Row label={`${homeName} wins`} value={wHome} pct={pct(wHome)} tone="success" inView={inView} reduced={reduced} />
      <Row label="Draws" value={draws} pct={pct(draws)} tone="gold" inView={inView} reduced={reduced} />
      <Row label={`${awayName} wins`} value={wAway} pct={pct(wAway)} tone="loss" inView={inView} reduced={reduced} />
    </div>
  );
}

function Row({
  label,
  value,
  pct,
  tone,
  inView,
  reduced,
}: {
  label: string;
  value: number;
  pct: string;
  tone: 'success' | 'gold' | 'loss';
  inView: boolean;
  reduced: boolean;
}) {
  const fill = tone === 'success' ? 'bg-success' : tone === 'loss' ? 'bg-loss' : 'bg-gold';
  return (
    <div className="rounded-2xl p-4 bg-bg-elev1/40 border border-white/8 backdrop-blur-md">
      <div className="text-[10px] uppercase tracking-[0.18em] text-text-dim mb-2">{label}</div>
      <div className="font-display text-3xl text-text">{value}</div>
      <div className="mt-3 h-1.5 rounded-full bg-bg-elev2 overflow-hidden">
        <motion.div
          className={`h-full ${fill}`}
          initial={{ width: 0 }}
          animate={inView || reduced ? { width: pct } : { width: 0 }}
          transition={{ duration: reduced ? 0 : 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
