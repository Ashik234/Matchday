import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { VERTEX, FRAGMENT } from './shaders';

export function FlagPlane({
  texture,
  mouse,
  intensity,
  aspect,
}: {
  texture: THREE.Texture;
  mouse: MutableRefObject<[number, number]>;
  intensity: MutableRefObject<number>;
  aspect: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uIntensity: { value: 0 },
      uMap: { value: texture },
    }),
    [texture],
  );

  useFrame((_, dt) => {
    if (!matRef.current) return;
    uniforms.uTime.value += dt;
    uniforms.uMouse.value.set(mouse.current[0], mouse.current[1]);
    const target = intensity.current;
    const cur = uniforms.uIntensity.value;
    uniforms.uIntensity.value = cur + (target - cur) * Math.min(1, dt * 6);
  });

  return (
    <mesh>
      <planeGeometry args={[aspect, 1, 24, 18]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
}
