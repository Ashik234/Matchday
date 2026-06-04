import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center, Bounds } from '@react-three/drei';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const MODEL_URL = '/models/wc-trophy.glb';

function TrophyMesh() {
  const { scene } = useGLTF(MODEL_URL);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} />;
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
        camera={{ position: [0, 0.5, 4], fov: 35 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 6, 5]} intensity={1.1} />
        <directionalLight position={[-4, 2, -3]} intensity={0.4} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.2}>
            <Center>
              <TrophyMesh />
            </Center>
          </Bounds>
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls
          makeDefault
          enableZoom
          enablePan={false}
          autoRotate={!reduced}
          autoRotateSpeed={1.5}
        />
      </Canvas>
    </div>
  );
}
