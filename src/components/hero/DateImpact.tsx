import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';

export function DateImpact() {
  const stage = useUIStore((s) => s.ballStage);
  const show = stage === 'drop-card' || stage === 'idle-card';
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="ripple"
          aria-hidden
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 6, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-white"
        />
      )}
    </AnimatePresence>
  );
}
