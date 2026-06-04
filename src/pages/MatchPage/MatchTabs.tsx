import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

export type MatchTabKey =
  | 'overview'
  | 'h2h'
  | 'form'
  | 'scorers'
  | 'squad'
  | 'history';

export const MATCH_TABS: { key: MatchTabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'h2h', label: 'Head-to-Head' },
  { key: 'form', label: 'Recent Form' },
  { key: 'scorers', label: 'Top Scorers' },
  { key: 'squad', label: 'Squad' },
  { key: 'history', label: 'Previous Meetings' },
];

export function MatchTabs({
  active,
  onChange,
}: {
  active: MatchTabKey;
  onChange: (k: MatchTabKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Match sections"
      className="sticky top-[88px] lg:top-[140px] z-20 -mx-6 px-6 lg:-mx-8 lg:px-8 bg-bg/80 backdrop-blur-md border-b border-white/8"
    >
      <div className="max-w-container mx-auto flex gap-1 overflow-x-auto no-scrollbar py-2">
        {MATCH_TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`match-panel-${t.key}`}
              id={`match-tab-${t.key}`}
              onClick={() => onChange(t.key)}
              className={cn(
                'relative px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] whitespace-nowrap transition-colors',
                isActive ? 'text-text' : 'text-text-dim hover:text-text',
              )}
            >
              {t.label}
              {isActive && (
                <motion.span
                  layoutId="match-tab-underline"
                  className="absolute left-2 right-2 -bottom-0.5 h-0.5 bg-gold rounded-full"
                  transition={{ duration: 0.25 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
