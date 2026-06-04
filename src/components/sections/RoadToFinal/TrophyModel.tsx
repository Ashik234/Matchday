import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const MODEL_URL = '/models/wc-trophy.glb';

function TrophyMesh() {
  const { scene } = useGLTF(MODEL_URL);
  return <primitive object={scene} scale={1.2} />;
}

useGLTF.preload(MODEL_URL);

export function TrophyModel({ size = 140 }: { size?: number }) {
  const reduced = useReducedMotion();
  return (
    <div
      aria-label="World Cup trophy (3D)"
      role="img"
      style={{ width: size, height: size }}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.5, 3.5], fov: 35 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 6, 5]} intensity={1.1} />
        <directionalLight position={[-4, 2, -3]} intensity={0.4} />
        <Suspense fallback={null}>
          <TrophyMesh />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls
          enableZoom
          enablePan={false}
          autoRotate={!reduced}
          autoRotateSpeed={1.5}
          minDistance={2}
          maxDistance={6}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </div>
  );
}
