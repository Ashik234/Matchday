import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center } from '@react-three/drei';
import { Box3, Vector3 } from 'three';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const MODEL_URL = '/models/wc-trophy.glb';

function TrophyMesh() {
  const { scene } = useGLTF(MODEL_URL);
  const { cloned, scale } = useMemo(() => {
    const c = scene.clone(true);
    const box = new Box3().setFromObject(c);
    const size = new Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    // Normalize so the largest dimension is 2 world units.
    return { cloned: c, scale: 2 / maxDim };
  }, [scene]);
  return <primitive object={cloned} scale={scale} />;
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
        camera={{ position: [0, 0.4, 3], fov: 35 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 6, 5]} intensity={1.1} />
        <directionalLight position={[-4, 2, -3]} intensity={0.4} />
        <Suspense fallback={null}>
          <Center>
            <TrophyMesh />
          </Center>
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls
          makeDefault
          enableZoom
          enablePan={false}
          autoRotate={!reduced}
          autoRotateSpeed={1.5}
          target={[0, 0, 0]}
          minDistance={1.8}
          maxDistance={6}
        />
      </Canvas>
    </div>
  );
}
