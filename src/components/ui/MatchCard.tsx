import { Card } from './Card';
import { Flag } from './Flag';
import { Pill } from './Pill';
import { Countdown } from './Countdown';
import { formatKickoff } from '@/utils/formatDate';
import { useMatchResult } from '@/data/queries/useMatchResults';
import { toMatchSlug } from '@/utils/matchSlug';
import type { Match, MatchResult } from '@/data/types';

export type MatchCardVariant = 'hero' | 'upcoming' | 'today' | 'live' | 'bracket';

type Props = {
  variant: MatchCardVariant;
  match: Match;
  onClick?: () => void;
};

function statusToPill(match: Match, result?: MatchResult) {
  if (result) return <Pill variant="final">{result.status}</Pill>;
  if (match.status === 'live') return <Pill variant="live">LIVE · {match.minute ?? 0}'</Pill>;
  if (match.status === 'finished') return <Pill variant="final">Final</Pill>;
  return <Pill variant="scheduled">{formatKickoff(match.kickoff)}</Pill>;
}

export function MatchCard({ variant, match, onClick }: Props) {
  const interactive = !!onClick;
  const Wrapper = interactive ? 'button' : 'div';
  const result = useMatchResult(toMatchSlug(match));
  const homeScore = result?.homeScore ?? match.home.score;
  const awayScore = result?.awayScore ?? match.away.score;
  const isFinished = Boolean(result) || match.status === 'finished';

  if (variant === 'hero') {
    return (
      <Wrapper
        type={interactive ? 'button' : undefined}
        onClick={onClick}
        className="w-full text-left"
      >
        <Card hover={interactive} className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
              {match.stage}
            </span>
            {statusToPill(match, result)}
          </div>
          <div className="flex items-center justify-between gap-4">
            <TeamSide team={match.home} large />
            <span className={isFinished ? 'font-mono text-text text-2xl' : 'font-mono text-text-dim text-xl'}>
              {isFinished ? `${homeScore ?? 0} - ${awayScore ?? 0}` : 'vs'}
            </span>
            <TeamSide team={match.away} large align="right" />
          </div>
          <div className="text-xs text-text-dim">
            {match.stadium.name} · {match.stadium.city}
          </div>
        </Card>
      </Wrapper>
    );
  }

  if (variant === 'upcoming' || variant === 'today') {
    return (
      <Wrapper
        type={interactive ? 'button' : undefined}
        onClick={onClick}
        className="w-full text-left"
      >
        <Card hover={interactive}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
              {match.stage}
            </span>
            {statusToPill(match)}
          </div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <TeamSide team={match.home} />
            <span className="font-mono text-text-dim text-sm">vs</span>
            <TeamSide team={match.away} align="right" />
          </div>
          <div className="flex items-center justify-between text-xs text-text-dim">
            <span>{match.stadium.name}</span>
            {match.status === 'scheduled' && (
              <Countdown
                to={match.kickoff}
                format="HH:MM:SS"
                className="font-mono text-gold"
              />
            )}
          </div>
        </Card>
      </Wrapper>
    );
  }

  if (variant === 'live') {
    return (
      <Card className="bg-bg-elev2 border-live/30 shadow-live">
        <div className="flex items-center justify-between mb-4">
          <Pill variant="live">LIVE · {match.minute ?? 0}'</Pill>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
            {match.stage}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <TeamSide team={match.home} large />
          <div className="font-mono text-hero text-text">
            {match.home.score ?? 0} - {match.away.score ?? 0}
          </div>
          <TeamSide team={match.away} large align="right" />
        </div>
      </Card>
    );
  }

  // bracket
  return (
    <Card hover={interactive} className="p-3 text-xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <TeamSide team={match.home} compact />
        <span className="font-mono text-text-dim">{match.home.score ?? '-'}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <TeamSide team={match.away} compact />
        <span className="font-mono text-text-dim">{match.away.score ?? '-'}</span>
      </div>
    </Card>
  );
}

function TeamSide({
  team,
  large = false,
  compact = false,
  align = 'left',
}: {
  team: Match['home'];
  large?: boolean;
  compact?: boolean;
  align?: 'left' | 'right';
}) {
  return (
    <div
      className={
        'flex items-center gap-2 ' + (align === 'right' ? 'flex-row-reverse text-right' : '')
      }
    >
      <Flag countryCode={team.countryCode} size={compact ? 'sm' : large ? 'lg' : 'md'} />
      <span
        className={
          'font-display uppercase tracking-wide ' +
          (compact ? 'text-xs' : large ? 'text-xl' : 'text-base')
        }
      >
        {team.name}
      </span>
    </div>
  );
}
