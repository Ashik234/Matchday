import type { ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export function MotionGate({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const isDesktop = useBreakpoint('lg');
  if (reduced || !isDesktop) return null;
  return <>{children}</>;
}
