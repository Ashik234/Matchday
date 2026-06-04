import { FlagRipple } from '@/components/ui/FlagRipple';

export function FlagWave({ countryCode, label }: { countryCode: string; label: string }) {
  return (
    <div
      className="relative inline-block rounded-md overflow-hidden shadow-card"
      style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))' }}
    >
      <FlagRipple countryCode={countryCode} size="xl" ariaLabel={label} />
    </div>
  );
}
