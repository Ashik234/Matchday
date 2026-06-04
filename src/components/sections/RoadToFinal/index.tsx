import { useMemo } from 'react';
import { Section } from '../Section';
import { useBracket } from '@/data/queries';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Skeleton } from '@/components/ui/Skeleton';
import { FallbackBanner } from '@/components/ui/FallbackBanner';
import type { BracketNode } from '@/data/types';
import { BracketTree } from './BracketTree';
import { BracketWaterfall } from './BracketWaterfall';

function pickRounds(nodes: BracketNode[]) {
  const r16 = nodes.filter((n) => n.round === 'R16');
  const qf = nodes.filter((n) => n.round === 'QF');
  const sf = nodes.filter((n) => n.round === 'SF');
  const f = nodes.filter((n) => n.round === 'F');
  const sortById = (a: BracketNode, b: BracketNode) =>
    (a.matchId ?? a.id).localeCompare(b.matchId ?? b.id);
  return {
    R16: r16.slice().sort(sortById),
    QF: qf.slice().sort(sortById),
    SF: sf.slice().sort(sortById),
    F: f.slice().sort(sortById),
  };
}

export function RoadToFinal() {
  const { data, isLoading, isFallback, refetch } = useBracket();
  const isDesktop = useBreakpoint('md');

  const rounds = useMemo(() => pickRounds(data ?? []), [data]);
  const empty =
    !isLoading &&
    rounds.R16.length === 0 &&
    rounds.QF.length === 0 &&
    rounds.SF.length === 0 &&
    rounds.F.length === 0;

  return (
    <Section id="road-to-final" stage="road-to-final" eyebrow="Bracket" title="Road to the Final">
      {isFallback && <FallbackBanner onRetry={refetch} />}
      {isLoading && <Skeleton className="h-72" />}
      {!isLoading && empty && (
        <p className="text-text-dim text-sm">
          Bracket will appear once knockout draws are confirmed.
        </p>
      )}
      {!isLoading && !empty &&
        (isDesktop ? <BracketTree rounds={rounds} /> : <BracketWaterfall rounds={rounds} />)}
    </Section>
  );
}
