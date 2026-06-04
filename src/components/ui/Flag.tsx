import { cn } from '@/utils/cn';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<Size, number> = { sm: 20, md: 28, lg: 40, xl: 64 };

type Props = {
  countryCode: string;
  size?: Size;
  rounded?: boolean;
  ariaLabel?: string;
};

export function Flag({ countryCode, size = 'md', rounded = false, ariaLabel }: Props) {
  const px = SIZE_PX[size];
  return (
    <span
      role="img"
      aria-label={ariaLabel ?? countryCode.toUpperCase()}
      className={cn(
        'inline-block bg-cover bg-center shrink-0',
        `fi fi-${countryCode.toLowerCase()}`,
        rounded ? 'rounded-full overflow-hidden' : 'rounded-sm',
      )}
      style={{ width: px, height: Math.round(px * 0.75) }}
    />
  );
}
