import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

function BallSVG() {
  // truncated icosahedron pattern: center pentagon + 5 outer hex panels (black on gold)
  const cx = 32;
  const cy = 32;
  const rPent = 9;
  const rHex = 22;
  const pent = (radius: number, rot: number) =>
    Array.from({ length: 5 }, (_, i) => {
      const a = ((rot + i * 72) * Math.PI) / 180;
      return `${cx + radius * Math.sin(a)},${cy - radius * Math.cos(a)}`;
    }).join(' ');
  return (
    <svg
      viewBox="0 0 64 64"
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id="ballShade" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFE680" />
          <stop offset="55%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#B8860B" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r="32" fill="url(#ballShade)" />
      {/* center pentagon */}
      <polygon points={pent(rPent, 0)} fill="#0F0F0F" />
      {/* 5 outer hexagon "spokes" — small black pentagons offset outward */}
      {Array.from({ length: 5 }).map((_, i) => {
        const a = ((i * 72) * Math.PI) / 180;
        const ox = cx + rHex * Math.sin(a);
        const oy = cy - rHex * Math.cos(a);
        const offsetPts = Array.from({ length: 5 }, (_, j) => {
          const aa = ((j * 72 + i * 72 + 36) * Math.PI) / 180;
          return `${ox + 5.5 * Math.sin(aa)},${oy - 5.5 * Math.cos(aa)}`;
        }).join(' ');
        return <polygon key={i} points={offsetPts} fill="#0F0F0F" />;
      })}
      {/* highlight */}
      <ellipse cx="22" cy="18" rx="9" ry="4.5" fill="rgba(255,255,255,0.3)" />
      {/* rim shadow */}
      <circle cx={cx} cy={cy} r="31" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
    </svg>
  );
}

export function Logo() {
  const reduced = useReducedMotion();

  const ballBoxStyle = {
    width: '0.95em',
    height: '0.95em',
    verticalAlign: '-0.05em',
  };
  const ballCommon = 'inline-block mx-0.5 rounded-full overflow-hidden shadow-gold';

  return (
    <div className="font-display text-2xl tracking-wide text-text leading-none">
      FIFA 2
      {reduced ? (
        <span
          data-ball-anchor="logo"
          className={ballCommon}
          style={ballBoxStyle}
          aria-label="0"
        >
          <BallSVG />
        </span>
      ) : (
        <motion.span
          data-ball-anchor="logo"
          className={ballCommon}
          style={ballBoxStyle}
          aria-label="0"
          initial={{ x: -150, y: -32, rotate: 0, opacity: 0 }}
          animate={{
            x: [-150, -110, -55, 0, 0, 0, 0, 0, 0],
            y: [-32, -32, -32, -32, 0, -10, 0, -3, 0],
            rotate: [0, 240, 540, 900, 980, 1010, 1030, 1040, 1050],
            opacity: [0, 1, 1, 1, 1, 1, 1, 1, 1],
          }}
          transition={{
            duration: 2.2,
            times: [0, 0.18, 0.42, 0.68, 0.8, 0.88, 0.94, 0.98, 1],
            ease: [
              'linear',
              'linear',
              'linear',
              'easeIn',
              'easeOut',
              'easeIn',
              'easeOut',
              'easeIn',
            ],
          }}
        >
          <BallSVG />
        </motion.span>
      )}
      26
    </div>
  );
}
