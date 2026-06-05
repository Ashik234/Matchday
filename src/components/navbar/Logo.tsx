import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useReducedMotion } from '@/hooks/useReducedMotion';

function BallSVG() {
  const cx = 50;
  const cy = 50;
  const pentR = 14;
  const centerPent = Array.from({ length: 5 }, (_, i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    return `${cx + pentR * Math.cos(a)},${cy + pentR * Math.sin(a)}`;
  }).join(' ');
  const outerR = 32;
  const outerSize = 11;
  const outerPents = Array.from({ length: 5 }, (_, i) => {
    const baseAngle = -90 + 36 + i * 72;
    const ox = cx + outerR * Math.cos((baseAngle * Math.PI) / 180);
    const oy = cy + outerR * Math.sin((baseAngle * Math.PI) / 180);
    const pts = Array.from({ length: 5 }, (_, j) => {
      const a = ((baseAngle + 180 + j * 72) * Math.PI) / 180;
      return `${ox + outerSize * Math.cos(a)},${oy + outerSize * Math.sin(a)}`;
    }).join(' ');
    return pts;
  });
  const seamPoints = Array.from({ length: 5 }, (_, i) => {
    const a1 = ((-90 + i * 72) * Math.PI) / 180;
    const a2 = ((-90 + 36 + i * 72) * Math.PI) / 180;
    return {
      x1: cx + pentR * Math.cos(a1),
      y1: cy + pentR * Math.sin(a1),
      x2: cx + (outerR - outerSize * 0.4) * Math.cos(a2),
      y2: cy + (outerR - outerSize * 0.4) * Math.sin(a2),
    };
  });

  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id="ballShade" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFEFA0" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#9A6F0A" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r="50" fill="url(#ballShade)" />
      {seamPoints.map((s, i) => (
        <line
          key={`seam-${i}`}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke="#0F0F0F"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
      <polygon points={centerPent} fill="#0F0F0F" />
      {outerPents.map((pts, i) => (
        <polygon key={`outer-${i}`} points={pts} fill="#0F0F0F" />
      ))}
      <ellipse cx="32" cy="26" rx="14" ry="7" fill="rgba(255,255,255,0.32)" />
      <circle cx={cx} cy={cy} r="49" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
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
    <Link
      to="/"
      aria-label="Matchday — home"
      className="font-display text-2xl tracking-wide text-text leading-none hover:text-gold transition-colors"
    >
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
    </Link>
  );
}
