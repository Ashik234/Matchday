import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { CatmullRomCurve3, Vector3 } from 'three';

const ORDER = [
  'today-matches',
  'progress',
  'groups',
  'featured-teams',
  'live',
  'road-to-final',
  'countdown',
];

function rectToWorld(
  rect: DOMRect,
  viewport: { width: number; height: number },
  size: { width: number; height: number },
): Vector3 {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const x = ((cx / size.width) * 2 - 1) * (viewport.width / 2);
  const y = -((cy / size.height) * 2 - 1) * (viewport.height / 2);
  return new Vector3(x, y, 0);
}

export function useWaypointsCurve(): CatmullRomCurve3 | null {
  const { viewport, size } = useThree();
  const [curve, setCurve] = useState<CatmullRomCurve3 | null>(null);

  useEffect(() => {
    const compute = () => {
      const points: Vector3[] = [];
      for (const id of ORDER) {
        const el = document.querySelector<HTMLElement>(`[data-ball-stage="${id}"]`);
        if (el) {
          points.push(rectToWorld(el.getBoundingClientRect(), viewport, size));
        }
      }
      if (points.length >= 2) setCurve(new CatmullRomCurve3(points, false, 'catmullrom', 0.4));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(document.body);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [viewport, size]);

  return curve;
}
