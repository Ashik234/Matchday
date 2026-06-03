import { useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export function useIntroTimeline() {
  const setBallStage = useUIStore((s) => s.setBallStage);
  const setScrollProgress = useUIStore((s) => s.setScrollProgress);
  const reduced = useReducedMotion();
  const isDesktop = useBreakpoint('lg');

  useEffect(() => {
    if (reduced || !isDesktop) {
      setBallStage('idle-card');
      return;
    }

    let cancelled = false;
    const timers: number[] = [];
    let rafId = 0;

    timers.push(window.setTimeout(() => !cancelled && setBallStage('intro'), 900));
    timers.push(
      window.setTimeout(() => {
        if (cancelled) return;
        setBallStage('roll-navbar');
        const start = performance.now();
        const duration = 1700;
        const tick = (t: number) => {
          if (cancelled) return;
          const p = Math.min(1, (t - start) / duration);
          setScrollProgress(p);
          if (p < 1) rafId = requestAnimationFrame(tick);
          else {
            setBallStage('drop-card');
            timers.push(window.setTimeout(() => !cancelled && setBallStage('idle-card'), 400));
          }
        };
        rafId = requestAnimationFrame(tick);
      }, 1100),
    );

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      cancelAnimationFrame(rafId);
    };
  }, [reduced, isDesktop, setBallStage, setScrollProgress]);
}
