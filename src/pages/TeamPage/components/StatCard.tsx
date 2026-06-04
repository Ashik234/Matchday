import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | string;
  suffix?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -20% 0px' });
  const reduced = useReducedMotion();
  const isNumber = typeof value === 'number';
  const [display, setDisplay] = useState<number | string>(reduced || !isNumber ? value : 0);

  useEffect(() => {
    if (!isNumber || reduced) {
      setDisplay(value);
      return;
    }
    if (!inView) return;
    const start = performance.now();
    const dur = 800;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - (1 - p) * (1 - p);
      setDisplay(Math.round(eased * (value as number)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, isNumber, reduced, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.4 }}
      className="rounded-2xl p-5 bg-bg-elev1/40 border border-white/8 backdrop-blur-md"
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-text-dim">{label}</div>
      <div className="mt-1 font-display text-3xl text-text">
        {display}
        {suffix}
      </div>
    </motion.div>
  );
}
