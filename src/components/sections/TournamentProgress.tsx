import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Section } from './Section';
import { StatTile } from '@/components/ui/StatTile';
import { useFinalMatch, useAllMatches } from '@/data/queries';
import type { Match } from '@/data/types';

function deriveCurrentStage(matches: Match[]): string {
  const now = Date.now();
  // Find latest stage that has started or finished
  const started = matches
    .filter((m) => new Date(m.kickoff).getTime() <= now)
    .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime());

  const latest = started[0];
  if (!latest) {
    // Tournament hasn't started — show first scheduled stage
    const first = matches
      .slice()
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())[0];
    return first?.stage ? simplifyStage(first.stage) : 'Pre-Tournament';
  }
  return simplifyStage(latest.stage);
}

function simplifyStage(stage: string): string {
  if (/Matchday/i.test(stage)) return 'Group Stage';
  if (/Round of 32/i.test(stage)) return 'Round of 32';
  if (/Round of 16/i.test(stage)) return 'Round of 16';
  if (/Quarter/i.test(stage)) return 'Quarter-Finals';
  if (/Semi/i.test(stage)) return 'Semi-Finals';
  if (/third|3rd/i.test(stage)) return '3rd Place';
  if (/^Final$/i.test(stage)) return 'Final';
  return stage;
}

export function TournamentProgress() {
  const { data: finalMatch } = useFinalMatch();
  const { data: matches } = useAllMatches();

  const stats = useMemo(() => {
    const all = matches ?? [];
    const total = all.length || 104;
    const played = all.filter((m) => m.status === 'finished').length;
    const remaining = Math.max(0, total - played);
    const stage = deriveCurrentStage(all);
    return { total, played, remaining, stage };
  }, [matches]);

  const daysToFinal = useMemo(() => {
    if (!finalMatch) return 0;
    const ms = new Date(finalMatch.kickoff).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86_400_000));
  }, [finalMatch]);

  const pct = stats.total > 0 ? Math.round((stats.played / stats.total) * 100) : 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  return (
    <Section id="progress" stage="progress" eyebrow="Tournament" title="Where we are">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] items-center">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatTile label="Current Stage" value={stats.stage} />
          <StatTile label="Played" value={`${stats.played} / ${stats.total}`} />
        </div>
        <div className="relative w-44 h-44 mx-auto">
          <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
            <circle cx="100" cy="100" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
            <motion.circle
              cx="100"
              cy="100"
              r={radius}
              stroke="var(--c-gold)"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference * (1 - stats.played / stats.total) }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-display text-4xl">{pct}%</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim">Played</div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatTile label="Remaining" value={stats.remaining} />
          <StatTile label="Days to Final" value={daysToFinal} />
        </div>
      </div>
    </Section>
  );
}
