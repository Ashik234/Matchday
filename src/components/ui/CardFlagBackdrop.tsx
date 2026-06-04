import { Suspense, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { FlagPlane } from './flagShader/FlagPlane';
import { loadFlagTexture } from '@/lib/flagTextureCache';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Full-card waving flag backdrop. Wraps card content. On pointer-hover, lazy-mounts
 * an absolutely-positioned R3F canvas behind the children showing a large rippling
 * flag. Children render above. Static (no canvas) on touch / reduced-motion.
 */
export function CardFlagBackdrop({
  countryCode,
  children,
  className,
  intensity = 0.7,
}: {
  countryCode: string;
  children: React.ReactNode;
  className?: string;
  /** 0..1 — caps how strongly the ripple shows behind text. */
  intensity?: number;
}) {
  const [hovering, setHovering] = useState(false);
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const mouseRef = useRef<[number, number]>([0.5, 0.5]);
  const intensityRef = useRef(0);
  const leaveTimerRef = useRef<number | null>(null);
  const hoveringRef = useRef(false);
  const reduced = useReducedMotion();

  const isHoverDevice =
    typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  const onEnter = () => {
    if (!isHoverDevice || reduced) return;
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    hoveringRef.current = true;
    setHovering(true);
    intensityRef.current = intensity;
    if (!tex) {
      void loadFlagTexture(countryCode)
        .then((t) => {
          // ignore stale texture if user already left
          if (hoveringRef.current) setTex(t);
        })
        .catch(() => {
          if (hoveringRef.current) setHovering(false);
        });
    }
  };

  const onLeave = () => {
    hoveringRef.current = false;
    intensityRef.current = 0;
    leaveTimerRef.current = window.setTimeout(() => {
      setHovering(false);
      leaveTimerRef.current = null;
    }, 300);
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    mouseRef.current = [x, y];
  };

  return (
    <div
      className={'relative isolate ' + (className ?? '')}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerMove={onMove}
    >
      {hovering && tex && (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 overflow-hidden rounded-[inherit] pointer-events-none"
          style={{ opacity: 0.55 }}
        >
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0, 1.05], fov: 45 }}
            gl={{ alpha: true, antialias: true }}
            style={{ background: 'transparent' }}
          >
            <Suspense fallback={null}>
              <FlagPlane
                texture={tex}
                mouse={mouseRef}
                intensity={intensityRef}
                aspect={4 / 3}
              />
            </Suspense>
          </Canvas>
        </div>
      )}
      {children}
    </div>
  );
}
