import { useMemo } from 'react';
import type { MomentumPoint } from '@/data/api/bzzoiroTypes';

const W = 1000; // viewBox width
const H = 220; // viewBox height
const MID = H / 2;
const PAD = 8;

const DEFAULT_HOME = '#FFD700';
const DEFAULT_AWAY = '#3B82F6';

type Props = {
  points: MomentumPoint[];
  homeColor?: string;
  awayColor?: string;
  isLive?: boolean;
};

// Map a point to SVG coordinates. xMax = end of minute domain, vMax = max |v|.
function project(p: MomentumPoint, xMax: number, vMax: number) {
  const x = PAD + (p.m / xMax) * (W - PAD * 2);
  const y = MID - (p.v / vMax) * (MID - PAD);
  return { x, y };
}

// Smooth path through projected points (Catmull-Rom → cubic bézier).
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0]!.x} ${pts[0]!.y}`;
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function MomentumWave({ points, homeColor, awayColor, isLive }: Props) {
  const home = homeColor || DEFAULT_HOME;
  const away = awayColor || DEFAULT_AWAY;

  const { areaPath, last } = useMemo(() => {
    if (points.length === 0) return { areaPath: '', last: null };
    const xMax = Math.max(90, points[points.length - 1]!.m);
    // Clamp so a single spike doesn't flatten the rest.
    const rawMax = Math.max(...points.map((p) => Math.abs(p.v)), 1);
    const vMax = rawMax;
    const proj = points.map((p) => project(p, xMax, vMax));
    const line = smoothPath(proj);
    // Close the area back along the center line to fill above+below.
    const first = proj[0]!;
    const lastP = proj[proj.length - 1]!;
    const area = `${line} L ${lastP.x} ${MID} L ${first.x} ${MID} Z`;
    return { areaPath: area, last: { ...lastP, v: points[points.length - 1]!.v } };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-text-dim text-sm">
        Momentum available once the match kicks off.
      </div>
    );
  }

  const xMax = Math.max(90, points[points.length - 1]!.m);
  const ticks = [15, 30, 45, 60, 75, 90].filter((t) => t <= xMax);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="Match momentum over time"
      preserveAspectRatio="none"
    >
      <defs>
        <clipPath id="momentum-home-clip">
          <rect x="0" y="0" width={W} height={MID} />
        </clipPath>
        <clipPath id="momentum-away-clip">
          <rect x="0" y={MID} width={W} height={MID} />
        </clipPath>
      </defs>

      {/* minute ticks */}
      {ticks.map((t) => {
        const x = PAD + (t / xMax) * (W - PAD * 2);
        return (
          <g key={t}>
            <line x1={x} y1={PAD} x2={x} y2={H - PAD} stroke="rgba(255,255,255,0.06)" strokeWidth={t === 45 ? 1.5 : 1} strokeDasharray={t === 45 ? '4 4' : undefined} />
            <text x={x} y={H - 1} fill="rgba(255,255,255,0.35)" fontSize="11" textAnchor="middle">{t}'</text>
          </g>
        );
      })}

      {/* center / neutral line */}
      <line x1={PAD} y1={MID} x2={W - PAD} y2={MID} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />

      {/* home fill (above center) */}
      <path d={areaPath} fill={home} fillOpacity={0.85} clipPath="url(#momentum-home-clip)" />
      {/* away fill (below center) */}
      <path d={areaPath} fill={away} fillOpacity={0.85} clipPath="url(#momentum-away-clip)" />

      {/* live edge dot */}
      {isLive && last && (
        <circle cx={last.x} cy={last.y} r={5} fill={last.v >= 0 ? home : away}>
          <animate attributeName="r" values="4;7;4" dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.4;1" dur="1.4s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}
