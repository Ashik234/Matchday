import { Section } from './Section';
import { Countdown } from '@/components/ui/Countdown';
import { useFinalMatch } from '@/data/queries';

export function FinalCountdown() {
  const { data } = useFinalMatch();
  const kickoff = data?.kickoff;
  return (
    <Section id="countdown" stage="countdown" eyebrow="The Moment" title="Final Countdown">
      <div className="text-center py-12">
        <div className="text-[10px] uppercase tracking-[0.3em] text-text-dim mb-4">
          {data?.stadium.name}, {data?.stadium.city}
        </div>
        {kickoff && (
          <Countdown
            to={kickoff}
            format="DD:HH:MM:SS"
            className="font-mono text-gold text-5xl md:text-hero block"
          />
        )}
        <div className="mt-4 text-text-dim text-xs uppercase tracking-[0.3em]">
          Days · Hours · Minutes · Seconds
        </div>
      </div>
    </Section>
  );
}
