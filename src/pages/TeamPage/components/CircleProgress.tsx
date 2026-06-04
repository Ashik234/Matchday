import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function CircleProgress({
  label,
  value,
  display,
}: {
  label: string;
  value: number;
  display: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));

  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#142340" strokeWidth="8" />
          <motion.circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#FFD700"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={
              inView || reduced
                ? { strokeDashoffset: c * (1 - pct) }
                : { strokeDashoffset: c }
            }
            transition={{ duration: reduced ? 0 : 0.9, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-display text-xl">
          {display}
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-text-dim">{label}</div>
    </div>
  );
}
