import { cn } from '@/utils/cn';

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex h-2 w-2', className)}>
      <span className="absolute inset-0 rounded-full bg-live opacity-80 motion-safe:animate-ping" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-live" />
    </span>
  );
}
