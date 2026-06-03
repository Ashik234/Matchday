import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type Props = HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
};

export function Card({ hover = false, className, children, ...rest }: Props) {
  return (
    <div
      className={cn(
        'rounded-xl bg-bg-elev1 border border-white/5 shadow-card p-4 md:p-6 transition-all duration-fast',
        hover && 'hover:-translate-y-1 hover:bg-bg-elev2 hover:shadow-raised',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
