import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export function MobileBallSprite() {
  const reduced = useReducedMotion();
  const isDesktop = useBreakpoint('lg');
  if (isDesktop || reduced) return null;
  return (
    <motion.div
      initial={{ x: -60, opacity: 0, rotate: 0 }}
      whileInView={{ x: 0, opacity: 1, rotate: 360 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gradient-to-br from-white to-gold shadow-gold"
      aria-hidden
    />
  );
}
