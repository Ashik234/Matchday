import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { MobileBallSprite } from './MobileBallSprite';

type Props = {
  id: string;
  stage: string;
  eyebrow?: string;
  title: string;
  className?: string;
  children: ReactNode;
};

export function Section({ id, stage, eyebrow, title, className, children }: Props) {
  return (
    <section
      id={id}
      data-ball-stage={stage}
      className={cn('relative max-w-container mx-auto px-4 md:px-8 py-16 md:py-24', className)}
    >
      <MobileBallSprite />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mb-8"
      >
        {eyebrow && (
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold mb-2">
            {eyebrow}
          </div>
        )}
        <h2 className="font-display text-3xl md:text-5xl uppercase tracking-tight">{title}</h2>
      </motion.div>
      {children}
    </section>
  );
}
