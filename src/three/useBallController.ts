import { Vector3 } from 'three';
import { useThree } from '@react-three/fiber';
import { useUIStore } from '@/store/uiStore';
import { useAnchorRect, type AnchorRect } from './useAnchorRect';
import { useWaypointsCurve } from './useWaypoints';

const _tmpV3 = new Vector3();

export type BallTransform = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};

function screenToWorld(
  rect: AnchorRect | null,
  viewport: { width: number; height: number },
  size: { width: number; height: number },
): [number, number, number] {
  if (!rect) return [0, 0, 0];
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const x = ((centerX / size.width) * 2 - 1) * (viewport.width / 2);
  const y = -((centerY / size.height) * 2 - 1) * (viewport.height / 2);
  return [x, y, 0];
}

export function useBallController(): BallTransform {
  const stage = useUIStore((s) => s.ballStage);
  const scrollProgress = useUIStore((s) => s.scrollProgress);
  const { viewport, size } = useThree();
  const logoRect = useAnchorRect('logo');
  const cardRect = useAnchorRect('date-card');

  const logoWorld = screenToWorld(logoRect, viewport, size);
  const cardWorld = screenToWorld(cardRect, viewport, size);
  const curve = useWaypointsCurve();

  switch (stage) {
    case 'pre-intro':
      return { position: logoWorld, rotation: [0, 0, 0], scale: 0 };
    case 'intro':
      return { position: logoWorld, rotation: [0, 0, 0], scale: 1 };
    case 'roll-navbar': {
      const t = Math.min(1, Math.max(0, scrollProgress));
      const x = logoWorld[0] + (cardWorld[0] - logoWorld[0]) * t;
      const rotX = (logoWorld[0] - x) * 4;
      return { position: [x, logoWorld[1], 0], rotation: [rotX, 0, 0], scale: 1 };
    }
    case 'drop-card':
      return { position: cardWorld, rotation: [Math.PI, 0, 0], scale: 1 };
    case 'idle-card':
      return { position: cardWorld, rotation: [Math.PI, 0, 0], scale: 1 };
    case 'scroll-guide': {
      if (!curve) return { position: cardWorld, rotation: [Math.PI, 0, 0], scale: 1 };
      curve.getPointAt(Math.min(1, Math.max(0, scrollProgress)), _tmpV3);
      return {
        position: [_tmpV3.x, _tmpV3.y, 0],
        rotation: [Math.PI, 0, 0],
        scale: 1,
      };
    }
    case 'parked-countdown':
      return { position: cardWorld, rotation: [Math.PI, 0, 0], scale: 1 };
  }
}
