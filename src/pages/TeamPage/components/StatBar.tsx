import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function StatBar({
  label,
  value,
  max,
  tone = 'gold',
}: {
  label: string;
  value: number;
  max: number;
  tone?: 'gold' | 'live' | 'success';
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduced = useReducedMotion();
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const fill =
    tone === 'live' ? 'bg-live' : tone === 'success' ? 'bg-success' : 'bg-gold';

  return (
    <div ref={ref}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-text-dim">{label}</span>
        <span className="font-semibold text-text">{value}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-bg-elev2 overflow-hidden">
        <motion.div
          className={`h-full ${fill}`}
          initial={{ width: 0 }}
          animate={inView || reduced ? { width: `${pct * 100}%` } : { width: 0 }}
          transition={{ duration: reduced ? 0 : 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
