import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

function BallSVG() {
  return (
    <svg
      viewBox="0 0 32 32"
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
      <circle cx="16" cy="16" r="16" fill="url(#ballShade)" />
      {/* center pentagon */}
      <polygon
        points="16,9 22,13 19.5,20 12.5,20 10,13"
        fill="#1A1A1A"
      />
      {/* spokes to outer hexagons */}
      <line x1="16" y1="9" x2="16" y2="2" stroke="#1A1A1A" strokeWidth="1.4" />
      <line x1="22" y1="13" x2="29" y2="10" stroke="#1A1A1A" strokeWidth="1.4" />
      <line x1="19.5" y1="20" x2="24" y2="28" stroke="#1A1A1A" strokeWidth="1.4" />
      <line x1="12.5" y1="20" x2="8" y2="28" stroke="#1A1A1A" strokeWidth="1.4" />
      <line x1="10" y1="13" x2="3" y2="10" stroke="#1A1A1A" strokeWidth="1.4" />
      {/* highlight */}
      <ellipse cx="11" cy="9" rx="4.5" ry="2.2" fill="rgba(255,255,255,0.35)" />
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
