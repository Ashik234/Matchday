import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { useBallController } from './useBallController';

export function Ball() {
  const ref = useRef<Mesh>(null);
  const { position, rotation, scale } = useBallController();

  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.set(position[0], position[1], position[2]);
    ref.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    ref.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.5, 3]} />
      <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} />
    </mesh>
  );
}
