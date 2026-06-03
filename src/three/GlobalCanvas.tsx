import { Canvas } from '@react-three/fiber';
import { MotionGate } from './MotionGate';
import { Lights } from './Lights';
import { Ball } from './Ball';

export function GlobalCanvas() {
  return (
    <MotionGate>
      <div
        aria-hidden
        className="fixed inset-0 z-30 pointer-events-none"
      >
        <Canvas
          camera={{ position: [0, 0, 10], fov: 35 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
          frameloop="always"
        >
          <Lights />
          <Ball />
        </Canvas>
      </div>
    </MotionGate>
  );
}

export default GlobalCanvas;
