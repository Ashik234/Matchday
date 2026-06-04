import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

export type TabKey =
  | 'overview'
  | 'squad'
  | 'stats'
  | 'matches'
  | 'journey'
  | 'stars';

export const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'squad', label: 'Squad' },
  { key: 'stats', label: 'Statistics' },
  { key: 'matches', label: 'Matches' },
  { key: 'journey', label: 'Tournament Journey' },
  { key: 'stars', label: 'Star Players' },
];

export function TeamTabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Team profile sections"
      className="sticky top-[88px] lg:top-[140px] z-20 -mx-6 px-6 lg:-mx-8 lg:px-8 bg-bg/80 backdrop-blur-md border-b border-white/8"
    >
      <div className="max-w-container mx-auto flex gap-1 overflow-x-auto no-scrollbar py-2">
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${t.key}`}
              id={`tab-${t.key}`}
              onClick={() => onChange(t.key)}
              className={cn(
                'relative px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] whitespace-nowrap transition-colors',
                isActive ? 'text-text' : 'text-text-dim hover:text-text',
              )}
            >
              {t.label}
              {isActive && (
                <motion.span
                  layoutId="team-tab-underline"
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
