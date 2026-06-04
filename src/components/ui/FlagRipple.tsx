import { Suspense, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Flag } from './Flag';
import { FlagPlane } from './flagShader/FlagPlane';
import { loadFlagTexture } from '@/lib/flagTextureCache';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Size = 'sm' | 'md' | 'lg' | 'xl';

export function FlagRipple({
  countryCode,
  size = 'lg',
  ariaLabel,
}: {
  countryCode: string;
  size?: Size;
  ariaLabel?: string;
}) {
  const [hovering, setHovering] = useState(false);
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const mouseRef = useRef<[number, number]>([0.5, 0.5]);
  const intensityRef = useRef(0);
  const leaveTimerRef = useRef<number | null>(null);
  const reduced = useReducedMotion();

  const isHoverDevice =
    typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  const onEnter = () => {
    if (!isHoverDevice || reduced) return;
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setHovering(true);
    intensityRef.current = 1;
    if (!tex) {
      void loadFlagTexture(countryCode)
        .then(setTex)
        .catch(() => setHovering(false));
    }
  };

  const onLeave = () => {
    intensityRef.current = 0;
    leaveTimerRef.current = window.setTimeout(() => {
      setHovering(false);
      leaveTimerRef.current = null;
    }, 250);
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    mouseRef.current = [x, y];
  };

  const aspect = 4 / 3;

  return (
    <div
      className="relative inline-block"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerMove={onMove}
    >
      <Flag countryCode={countryCode} size={size} ariaLabel={ariaLabel} />
      {hovering && tex && (
        <div className="absolute inset-0 pointer-events-none">
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0, 1.4], fov: 45 }}
            gl={{ alpha: true, antialias: true }}
            style={{ background: 'transparent' }}
          >
            <Suspense fallback={null}>
              <FlagPlane
                texture={tex}
                mouse={mouseRef}
                intensity={intensityRef}
                aspect={aspect}
              />
            </Suspense>
          </Canvas>
        </div>
      )}
    </div>
  );
}
