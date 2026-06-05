import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { CATEGORY_ICON, formatMMDD } from '@/utils/onThisDay';
import type { IconicMoment } from '@/data/types/iconicMoment';

// Gradient per category used as fallback when no image is available
const CATEGORY_GRADIENT: Record<string, string> = {
  goal: 'from-emerald-950 via-emerald-900 to-bg-deep',
  final: 'from-amber-950 via-yellow-900 to-bg-deep',
  upset: 'from-red-950 via-rose-900 to-bg-deep',
  record: 'from-blue-950 via-blue-900 to-bg-deep',
  player: 'from-purple-950 via-violet-900 to-bg-deep',
  match: 'from-slate-900 via-slate-800 to-bg-deep',
};

type Props = {
  moment: IconicMoment;
  isFallback: boolean;
  otherCount: number;
  todayMMDD: string;
};

export function OnThisDayCard({ moment, isFallback, otherCount, todayMMDD }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasImage = !!moment.image && !imgFailed;
  const gradient = CATEGORY_GRADIENT[moment.category] ?? CATEGORY_GRADIENT.match;
  const icon = CATEGORY_ICON[moment.category] ?? '🏆';

  const displayDate = isFallback
    ? `${moment.year}`
    : `${formatMMDD(todayMMDD)}, ${moment.year}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full overflow-hidden rounded-2xl min-h-[480px] md:min-h-[560px] flex items-end"
    >
      {/* ── Background ── */}
      {hasImage ? (
        <>
          <img
            src={moment.image}
            alt=""
            aria-hidden="true"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover object-top scale-105"
          />
          {/* Cinematic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
        </>
      ) : (
        <>
          {/* Fallback: year as giant background typography */}
          <div className={cn('absolute inset-0 bg-gradient-to-br', gradient)} />
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden"
          >
            <span className="font-display text-[clamp(8rem,30vw,20rem)] font-black text-white/5 leading-none tracking-tighter">
              {moment.year}
            </span>
          </div>
          {/* Subtle noise / vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
        </>
      )}

      {/* ── Content panel (glassmorphism) ── */}
      <div className="relative z-10 w-full p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
          className={cn(
            'rounded-xl md:rounded-2xl p-5 md:p-8',
            'backdrop-blur-md bg-white/5 border border-white/10',
            'max-w-2xl',
          )}
        >
          {/* Eyebrow: date */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
              {isFallback ? 'Legendary Moment' : `On This Day · ${formatMMDD(todayMMDD)}`}
            </span>
          </div>

          {/* Title row */}
          <div className="flex items-start gap-3 mb-2">
            <span className="text-2xl md:text-3xl leading-none mt-0.5" role="img" aria-label={moment.category}>
              {icon}
            </span>
            <div>
              <h3 className="font-display text-2xl md:text-4xl uppercase tracking-tight leading-tight text-white">
                {moment.title}
              </h3>
            </div>
          </div>

          {/* Year badge + subtitle */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-gold/20 text-gold border border-gold/30">
              {moment.year}
            </span>
            <span className="text-sm text-text-dim">{moment.subtitle}</span>
            <span className="text-text-dim/40">·</span>
            <span className="text-[11px] uppercase tracking-wider text-text-dim/70">{moment.stage}</span>
          </div>

          {/* Description */}
          <p className="text-sm md:text-base text-text-dim leading-relaxed mb-6 max-w-lg">
            {moment.description}
          </p>

          {/* Footer: other events link */}
          {!isFallback && otherCount > 1 && (
            <p className="text-[11px] text-text-dim/60 uppercase tracking-wider">
              {otherCount} World Cup event{otherCount !== 1 ? 's' : ''} happened on {formatMMDD(todayMMDD)} in history
            </p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
