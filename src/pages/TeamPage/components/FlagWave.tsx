import { Flag } from '@/components/ui/Flag';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function FlagWave({ countryCode, label }: { countryCode: string; label: string }) {
  const reduced = useReducedMotion();
  return (
    <div
      className="relative inline-block rounded-md overflow-hidden shadow-card"
      style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))' }}
    >
      <div
        className={reduced ? '' : 'animate-[flag-wave_4s_ease-in-out_infinite]'}
        style={{ transformOrigin: 'left center' }}
      >
        <Flag countryCode={countryCode} size="xl" ariaLabel={label} />
      </div>
      <style>{`
        @keyframes flag-wave {
          0%, 100% { transform: skewX(-2deg) scaleY(1); }
          50%      { transform: skewX(2deg)  scaleY(0.98); }
        }
      `}</style>
    </div>
  );
}
