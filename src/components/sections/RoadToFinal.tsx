import { useMemo } from 'react';
import { Section } from './Section';
import { BracketColumn } from './BracketColumn';
import { useBracket } from '@/data/queries';
import { Skeleton } from '@/components/ui/Skeleton';
import { FallbackBanner } from '@/components/ui/FallbackBanner';
import type { BracketRound, BracketNode } from '@/data/types';

const ORDER: BracketRound[] = ['R16', 'QF', 'SF', 'F'];
const LABEL: Record<BracketRound, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-Finals',
  SF: 'Semi-Finals',
  F: 'Final',
  '3rd': '3rd Place',
};

export function RoadToFinal() {
  const { data, isLoading, isFallback, refetch } = useBracket();

  const byRound = useMemo(() => {
    const m = new Map<BracketRound, BracketNode[]>();
    (data ?? []).forEach((n) => {
      const arr = m.get(n.round) ?? [];
      arr.push(n);
      m.set(n.round, arr);
    });
    return m;
  }, [data]);

  return (
    <Section id="road-to-final" stage="road-to-final" eyebrow="Bracket" title="Road to the Final">
      {isFallback && <FallbackBanner onRetry={refetch} />}
      {isLoading && <Skeleton className="h-72" />}
      {!isLoading && (
        <div className="no-scrollbar flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4">
          {ORDER.map((round, i) => (
            <BracketColumn
              key={round}
              label={LABEL[round]}
              nodes={byRound.get(round) ?? []}
              delay={i * 0.15}
            />
          ))}
        </div>
      )}
      <div className="text-[10px] uppercase tracking-[0.3em] text-text-dim mt-2 md:hidden text-center">
        ← swipe →
      </div>
    </Section>
  );
}
