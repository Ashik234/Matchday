import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Logo } from './Logo';
import { NavLinks } from './NavLinks';
import { MobileMenu } from './MobileMenu';

export function PitchNavbar() {
  const isDesktop = useBreakpoint('lg');
  return (
    <header
      data-ball-stage="navbar"
      className="sticky top-0 z-40 w-full"
    >
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: isDesktop ? 140 : 88,
          background:
            'linear-gradient(180deg, var(--c-pitch-dark) 0%, var(--c-pitch) 100%)',
        }}
      >
        {/* mowed stripes */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent 0 80px, rgba(255,255,255,0.05) 80px 160px)',
          }}
        />
        {/* sideline (ball roll path) */}
        <div
          aria-hidden
          className="absolute left-[4%] right-[4%] bottom-5 h-[3px] bg-pitch-line rounded-full"
        />
        {/* center arc */}
        {isDesktop && (
          <>
            <div
              aria-hidden
              className="absolute left-1/2 bottom-5 -translate-x-1/2 w-[120px] h-[60px] border-[3px] border-pitch-line border-b-0"
              style={{ borderRadius: '120px 120px 0 0' }}
            />
            <div
              aria-hidden
              className="absolute left-1/2 -translate-x-1/2 bottom-[44px] w-[6px] h-[6px] rounded-full bg-pitch-line"
            />
          </>
        )}

        <div className="relative h-full max-w-container mx-auto px-6 lg:px-8 flex items-center justify-between">
          <Logo />
          {isDesktop ? <NavLinks /> : <MobileMenu />}
        </div>
      </div>
    </header>
  );
}
