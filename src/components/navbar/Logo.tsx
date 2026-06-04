import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function Logo() {
  const reduced = useReducedMotion();

  const ballStyle = { width: '0.85em', height: '0.85em' };
  const ballCommon =
    'inline-block mx-0.5 rounded-full bg-gold align-baseline shadow-gold';

  return (
    <div className="font-display text-2xl tracking-wide text-text leading-none">
      FIFA 2
      {reduced ? (
        <span
          data-ball-anchor="logo"
          className={ballCommon}
          style={ballStyle}
          aria-label="0"
        />
      ) : (
        <motion.span
          data-ball-anchor="logo"
          className={ballCommon}
          style={ballStyle}
          aria-label="0"
          initial={{ x: -150, y: 0, rotate: 0, opacity: 0 }}
          animate={{
            x: [-150, -110, -75, -40, 0],
            y: [0, -28, -32, -22, 0],
            rotate: [0, 270, 540, 810, 1080],
            opacity: [0, 1, 1, 1, 1],
          }}
          transition={{
            duration: 2,
            times: [0, 0.25, 0.5, 0.75, 1],
            ease: 'easeInOut',
          }}
        />
      )}
      26
    </div>
  );
}
