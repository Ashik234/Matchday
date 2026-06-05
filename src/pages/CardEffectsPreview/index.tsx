import { useRef, useState, type MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Flag } from '@/components/ui/Flag';

const SAMPLE = {
  name: 'France',
  federation: 'UEFA',
  countryCode: 'fr',
  fifaRank: 1,
};

type S = typeof SAMPLE;

/* 1. 3D tilt */
function TiltCard({ s }: { s: S }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 220, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 220, damping: 18 });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 800 }}
    >
      <BaseInner s={s} />
    </motion.div>
  );
}

/* 2. Gold border sweep */
function BorderSweepCard({ s }: { s: S }) {
  return (
    <div className="relative group rounded-xl p-[2px] overflow-hidden">
      <span
        aria-hidden
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0deg, #FFD700 60deg, transparent 120deg, transparent 360deg)',
          animation: 'spin 3s linear infinite',
        }}
      />
      <div className="relative rounded-[10px]">
        <BaseInner s={s} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* 3. Spotlight follow */
function SpotlightCard({ s }: { s: S }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x: 50, y: 50, on: false });
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, on: true });
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setPos((p) => ({ ...p, on: false }))}
      className="relative rounded-xl overflow-hidden"
      style={{
        background: pos.on
          ? `radial-gradient(circle 200px at ${pos.x}% ${pos.y}%, rgba(255,215,0,0.25), transparent 70%), var(--c-bg-elev-1)`
          : 'var(--c-bg-elev-1)',
        transition: 'background 80ms linear',
      }}
    >
      <BaseInner s={s} flat />
    </div>
  );
}

/* 4. Federation flush */
const FED_BG: Record<string, string> = {
  UEFA: 'rgba(59,130,246,0.35)',
  CONMEBOL: 'rgba(251,191,36,0.35)',
  AFC: 'rgba(16,185,129,0.35)',
  CAF: 'rgba(249,115,22,0.35)',
  CONCACAF: 'rgba(168,85,247,0.35)',
  OFC: 'rgba(6,182,212,0.35)',
};
function FederationFlushCard({ s }: { s: S }) {
  const tint = FED_BG[s.federation] ?? 'rgba(255,215,0,0.3)';
  return (
    <div
      className="relative rounded-xl transition-all duration-300 bg-bg-elev1 hover:[background:var(--tint)]"
      style={{ ['--tint' as never]: `linear-gradient(135deg, ${tint}, var(--c-bg-elev-1) 70%)` }}
    >
      <BaseInner s={s} flat />
    </div>
  );
}

/* 5. Magnetic flag */
function MagneticFlagCard({ s }: { s: S }) {
  const flagRef = useRef<HTMLDivElement | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 14 });
  const sy = useSpring(y, { stiffness: 200, damping: 14 });
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const fl = flagRef.current;
    const card = ref.current;
    if (!fl || !card) return;
    const fr = fl.getBoundingClientRect();
    const fx = fr.left + fr.width / 2;
    const fy = fr.top + fr.height / 2;
    x.set((e.clientX - fx) * 0.25);
    y.set((e.clientY - fy) * 0.25);
  };
  const onLeave = () => { x.set(0); y.set(0); };
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}>
      <Card hover className="w-full flex flex-col">
        <div className="flex items-center gap-3 mb-3 min-w-0">
          <motion.div ref={flagRef} style={{ x: sx, y: sy }}>
            <Flag countryCode={s.countryCode} size="lg" ariaLabel={s.name} />
          </motion.div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl truncate">{s.name}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim">{s.federation}</div>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between text-xs">
          <span className="text-text-dim">FIFA Rank</span>
          <span className="font-mono text-gold">#{s.fifaRank}</span>
        </div>
      </Card>
    </div>
  );
}

/* 6. Rank counter scrub */
function RankScrubCard({ s }: { s: S }) {
  const [n, setN] = useState(s.fifaRank);
  const [hovering, setHovering] = useState(false);
  const onEnter = () => {
    setHovering(true);
    let i = 0;
    const target = s.fifaRank;
    const id = window.setInterval(() => {
      i++;
      setN(Math.floor(Math.random() * 30) + 1);
      if (i >= 8) {
        window.clearInterval(id);
        setN(target);
      }
    }, 50);
  };
  const onLeave = () => { setHovering(false); setN(s.fifaRank); };
  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <Card hover className="w-full flex flex-col">
        <div className="flex items-center gap-3 mb-3 min-w-0">
          <Flag countryCode={s.countryCode} size="lg" ariaLabel={s.name} />
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl truncate">{s.name}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim">{s.federation}</div>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between text-xs">
          <span className="text-text-dim">FIFA Rank</span>
          <span className={`font-mono text-gold ${hovering ? 'font-display text-base' : ''}`}>#{n}</span>
        </div>
      </Card>
    </div>
  );
}

/* 7. Confetti */
function ConfettiCard({ s }: { s: S }) {
  const [burst, setBurst] = useState(0);
  return (
    <div onMouseEnter={() => setBurst((b) => b + 1)} className="relative">
      <Card hover className="w-full flex flex-col">
        <div className="flex items-center gap-3 mb-3 min-w-0">
          <Flag countryCode={s.countryCode} size="lg" ariaLabel={s.name} />
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl truncate">{s.name}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim">{s.federation}</div>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between text-xs">
          <span className="text-text-dim">FIFA Rank</span>
          <span className="font-mono text-gold">#{s.fifaRank}</span>
        </div>
      </Card>
      {burst > 0 && (
        <div key={burst} aria-hidden className="absolute inset-0 pointer-events-none overflow-visible">
          {Array.from({ length: 14 }).map((_, i) => {
            const ang = (i / 14) * Math.PI * 2;
            const dist = 60 + Math.random() * 40;
            return (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(ang) * dist,
                  y: Math.sin(ang) * dist,
                  opacity: 0,
                  scale: 0.5,
                }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-gold shadow-gold"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* 8. Scale + bigger gold shadow */
function ScaleGoldCard({ s }: { s: S }) {
  return (
    <div className="rounded-xl bg-bg-elev1 border border-white/5 shadow-card p-4 md:p-6 transition-transform duration-200 hover:scale-[1.04] hover:shadow-[0_0_40px_rgba(255,215,0,0.35)] flex flex-col">
      <div className="flex items-center gap-3 mb-3 min-w-0">
        <Flag countryCode={s.countryCode} size="lg" ariaLabel={s.name} />
        <div className="min-w-0 flex-1">
          <div className="font-display text-xl truncate">{s.name}</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim">{s.federation}</div>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between text-xs">
        <span className="text-text-dim">FIFA Rank</span>
        <span className="font-mono text-gold">#{s.fifaRank}</span>
      </div>
    </div>
  );
}

function BaseInner({ s, flat }: { s: S; flat?: boolean }) {
  return (
    <div className={`${flat ? '' : 'rounded-xl bg-bg-elev1 border border-white/5 shadow-card'} p-4 md:p-6 flex flex-col`}>
      <div className="flex items-center gap-3 mb-3 min-w-0">
        <Flag countryCode={s.countryCode} size="lg" ariaLabel={s.name} />
        <div className="min-w-0 flex-1">
          <div className="font-display text-xl truncate">{s.name}</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim">{s.federation}</div>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between text-xs">
        <span className="text-text-dim">FIFA Rank</span>
        <span className="font-mono text-gold">#{s.fifaRank}</span>
      </div>
    </div>
  );
}

const EFFECTS = [
  { n: 1, label: '3D tilt (mouse-tracked)', C: TiltCard },
  { n: 2, label: 'Gold border sweep', C: BorderSweepCard },
  { n: 3, label: 'Spotlight follow', C: SpotlightCard },
  { n: 4, label: 'Federation color flush', C: FederationFlushCard },
  { n: 5, label: 'Magnetic flag', C: MagneticFlagCard },
  { n: 6, label: 'Rank counter scrub', C: RankScrubCard },
  { n: 7, label: 'Confetti burst', C: ConfettiCard },
  { n: 8, label: 'Scale + gold glow', C: ScaleGoldCard },
];

export default function CardEffectsPreview() {
  return (
    <div className="max-w-container mx-auto px-6 lg:px-8 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl text-text">Card Hover Effects — Preview</h1>
        <p className="text-text-dim text-sm">Hover each card. Pick a number and tell me.</p>
        <Link to="/" className="text-xs text-gold hover:underline">← back home</Link>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {EFFECTS.map(({ n, label, C }) => (
          <div key={n} className="space-y-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-text-dim">
              #{n} · {label}
            </div>
            <C s={SAMPLE} />
          </div>
        ))}
      </div>
    </div>
  );
}
