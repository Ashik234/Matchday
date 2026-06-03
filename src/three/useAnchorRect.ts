import { useEffect, useState } from 'react';

export type AnchorRect = { x: number; y: number; width: number; height: number };

export function useAnchorRect(name: string): AnchorRect | null {
  const [rect, setRect] = useState<AnchorRect | null>(null);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-ball-anchor="${name}"]`);
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      setRect({ x: r.x, y: r.y, width: r.width, height: r.height });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    ro.observe(document.body);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [name]);

  return rect;
}
