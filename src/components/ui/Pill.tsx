import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { LiveDot } from './LiveDot';

type Variant = 'live' | 'scheduled' | 'final';

const STYLES: Record<Variant, string> = {
  live: 'bg-live text-text',
  scheduled: 'bg-bg-elev2 text-text-dim',
  final: 'bg-text-muted text-bg-deep',
};

export function Pill({ variant, children }: { variant: Variant; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.1em]',
        STYLES[variant],
      )}
    >
      {variant === 'live' && <LiveDot />}
      {children}
    </span>
  );
}
