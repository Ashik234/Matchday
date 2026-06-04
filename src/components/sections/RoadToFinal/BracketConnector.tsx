import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { CARD_W, CARD_H } from './useBracketLayout';

type Point = { x: number; y: number };

export function BracketConnector({
  src1,
  src2,
  dest,
  side,
  isOnPath,
  drawDelay,
}: {
  src1: Point;
  src2: Point;
  dest: Point;
  side: 'left' | 'right';
  isOnPath: boolean;
  drawDelay: number;
}) {
  const reduced = useReducedMotion();
  const stubLen = 18;
  const src1Anchor: Point = {
    x: side === 'left' ? src1.x + CARD_W : src1.x,
    y: src1.y + CARD_H / 2,
  };
  const src2Anchor: Point = {
    x: side === 'left' ? src2.x + CARD_W : src2.x,
    y: src2.y + CARD_H / 2,
  };
  const destAnchor: Point = {
    x: side === 'left' ? dest.x : dest.x + CARD_W,
    y: dest.y + CARD_H / 2,
  };

  const midX =
    side === 'left'
      ? Math.max(src1Anchor.x, src2Anchor.x) + stubLen
      : Math.min(src1Anchor.x, src2Anchor.x) - stubLen;

  const d = [
    `M ${src1Anchor.x} ${src1Anchor.y}`,
    `L ${midX} ${src1Anchor.y}`,
    `L ${midX} ${src2Anchor.y}`,
    `L ${src2Anchor.x} ${src2Anchor.y}`,
    `M ${midX} ${(src1Anchor.y + src2Anchor.y) / 2}`,
    `L ${destAnchor.x} ${destAnchor.y}`,
  ].join(' ');

  const stroke = isOnPath ? 'rgb(0,200,255)' : 'rgba(255,215,0,0.35)';
  const strokeWidth = isOnPath ? 2 : 1.5;

  return (
    <motion.path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={reduced ? false : { pathLength: 0, opacity: 0 }}
      animate={reduced ? undefined : { pathLength: 1, opacity: 1 }}
      transition={{
        pathLength: { duration: 0.6, delay: drawDelay, ease: 'easeOut' },
        opacity: { duration: 0.2, delay: drawDelay },
      }}
    />
  );
}
