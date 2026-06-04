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
          initial={{ x: -110, rotate: 0, opacity: 0 }}
          animate={{ x: 0, rotate: 720, opacity: 1 }}
          transition={{
            duration: 1.8,
            ease: [0.16, 0.84, 0.32, 1],
            opacity: { duration: 0.2, ease: 'linear' },
          }}
        />
      )}
      26
    </div>
  );
}
