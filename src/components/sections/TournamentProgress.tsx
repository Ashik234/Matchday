import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Section } from './Section';
import { StatTile } from '@/components/ui/StatTile';
import { useFinalMatch } from '@/data/queries';

const TOTAL_MATCHES = 104;

export function TournamentProgress() {
  const { data: finalMatch } = useFinalMatch();
  const played = 32;
  const remaining = TOTAL_MATCHES - played;
  const daysToFinal = useMemo(() => {
    if (!finalMatch) return 0;
    const ms = new Date(finalMatch.kickoff).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86_400_000));
  }, [finalMatch]);

  const pct = Math.round((played / TOTAL_MATCHES) * 100);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  return (
    <Section id="progress" stage="progress" eyebrow="Tournament" title="Where we are">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] items-center">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatTile label="Current Stage" value="Group" />
          <StatTile label="Played" value={`${played} / ${TOTAL_MATCHES}`} />
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
              whileInView={{ strokeDashoffset: circumference * (1 - played / TOTAL_MATCHES) }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-display text-4xl">{pct}%</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim">Played</div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatTile label="Remaining" value={remaining} />
          <StatTile label="Days to Final" value={daysToFinal} />
        </div>
      </div>
    </Section>
  );
}
