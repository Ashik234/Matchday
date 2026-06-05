export type PortraitSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const PORTRAIT_PIXELS: Record<PortraitSize, { w: number; h: number }> = {
  xs: { w: 32, h: 32 },
  sm: { w: 64, h: 64 },
  md: { w: 128, h: 171 },
  lg: { w: 240, h: 320 },
  xl: { w: 480, h: 640 },
};

export const PORTRAIT_CLASS: Record<PortraitSize, string> = {
  xs: 'w-8 h-8',
  sm: 'w-16 h-16',
  md: 'w-32 h-[171px]',
  lg: 'w-60 h-80',
  xl: 'w-full max-w-[320px] aspect-[3/4]',
};
