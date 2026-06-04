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
          initial={{ y: -140, x: -18, rotate: 0, opacity: 0 }}
          animate={{
            y: [-140, 0, -22, 0, -8, 0],
            x: [-18, 0, 2, 0, -1, 0],
            rotate: [0, 540, 600, 680, 700, 720],
            opacity: [0, 1, 1, 1, 1, 1],
          }}
          transition={{
            duration: 1.6,
            times: [0, 0.55, 0.7, 0.85, 0.94, 1],
            ease: ['easeIn', 'easeOut', 'easeIn', 'easeOut', 'easeIn'],
          }}
        />
      )}
      26
    </div>
  );
}
