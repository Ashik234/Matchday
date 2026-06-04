import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function TrophySVG({ size = 96 }: { size?: number }) {
  const reduced = useReducedMotion();
  const filterFrames = [
    'drop-shadow(0 0 6px rgba(255,215,0,0.4))',
    'drop-shadow(0 0 18px rgba(255,215,0,0.7))',
    'drop-shadow(0 0 6px rgba(255,215,0,0.4))',
  ];

  return (
    <motion.div
      aria-label="World Cup trophy"
      role="img"
      style={{ width: size, height: size }}
      initial={false}
      animate={reduced ? undefined : { filter: filterFrames }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
        <defs>
          <radialGradient id="trophy-shade" cx="40%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#FFEFA0" />
            <stop offset="55%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#8a6708" />
          </radialGradient>
        </defs>
        <path d="M16 8 L48 8 L48 22 C48 32 40 38 32 38 C24 38 16 32 16 22 Z" fill="url(#trophy-shade)" stroke="#5a4400" strokeWidth="1" />
        <path d="M16 12 C8 14 8 24 16 24" fill="none" stroke="url(#trophy-shade)" strokeWidth="3" />
        <path d="M48 12 C56 14 56 24 48 24" fill="none" stroke="url(#trophy-shade)" strokeWidth="3" />
        <rect x="29" y="38" width="6" height="8" fill="url(#trophy-shade)" />
        <rect x="20" y="46" width="24" height="6" rx="1" fill="url(#trophy-shade)" />
        <rect x="16" y="52" width="32" height="4" rx="1" fill="url(#trophy-shade)" />
        <ellipse cx="26" cy="14" rx="5" ry="2" fill="rgba(255,255,255,0.35)" />
      </svg>
    </motion.div>
  );
}
