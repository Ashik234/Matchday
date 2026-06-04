import { AlertTriangle } from 'lucide-react';

type Props = {
  message?: string;
  onRetry?: () => void;
};

export function FallbackBanner({ message = 'Showing sample data — live feed unavailable.', onRetry }: Props) {
  return (
    <div className="flex items-center gap-3 mb-4 px-4 py-2 rounded-lg bg-bg-elev1 border border-gold/40 text-text-dim text-sm">
      <AlertTriangle size={16} className="text-gold shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-gold font-semibold uppercase tracking-wider text-xs hover:text-gold-light"
        >
          Retry
        </button>
      )}
    </div>
  );
}
