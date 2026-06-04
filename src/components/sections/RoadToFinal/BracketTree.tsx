import { useEffect, useRef, useState } from 'react';
import type { BracketNode } from '@/data/types';
import { MatchCard } from './MatchCard';
import { BracketConnector } from './BracketConnector';
import { TrophyCenter } from './TrophyCenter';
import { CARD_H, CARD_W, useBracketLayout } from './useBracketLayout';
import { pathFor } from './pathFor';

type Rounds = {
  R16: BracketNode[];
  QF: BracketNode[];
  SF: BracketNode[];
  F: BracketNode[];
};

export function BracketTree({ rounds }: { rounds: Rounds }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(1200);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth || 1200);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ids = {
    R16: rounds.R16.map((n) => n.id),
    QF: rounds.QF.map((n) => n.id),
    SF: rounds.SF.map((n) => n.id),
    F: rounds.F.map((n) => n.id),
  };
  const layout = useBracketLayout(width, ids);
  const onPath = pathFor(hovered, rounds);

  const labelCols = [
    'Round of 16',
    'Quarter-finals',
    'Semi-finals',
    'Final',
    'Semi-finals',
    'Quarter-finals',
    'Round of 16',
  ];

  type Conn = {
    key: string;
    src1: { x: number; y: number };
    src2: { x: number; y: number };
    dest: { x: number; y: number };
    side: 'left' | 'right';
    drawDelay: number;
    isOnPath: boolean;
  };
  const conns: Conn[] = [];
  const posFor = (id?: string) => (id ? layout.map.get(id) : undefined);

  // R16 → QF
  for (let half = 0; half < 2; half++) {
    for (let k = 0; k < 2; k++) {
      const r16a = rounds.R16[half * 4 + k * 2];
      const r16b = rounds.R16[half * 4 + k * 2 + 1];
      const qf = rounds.QF[half * 2 + k];
      const p1 = posFor(r16a?.id);
      const p2 = posFor(r16b?.id);
      const pd = posFor(qf?.id);
      if (p1 && p2 && pd && qf) {
        conns.push({
          key: `r16-qf-${qf.id}`,
          src1: p1,
          src2: p2,
          dest: pd,
          side: half === 0 ? 'left' : 'right',
          drawDelay: 0.0,
          isOnPath: onPath.has(qf.id),
        });
      }
    }
  }
  // QF → SF
  for (let half = 0; half < 2; half++) {
    const qfA = rounds.QF[half * 2];
    const qfB = rounds.QF[half * 2 + 1];
    const sf = rounds.SF[half];
    const p1 = posFor(qfA?.id);
    const p2 = posFor(qfB?.id);
    const pd = posFor(sf?.id);
    if (p1 && p2 && pd && sf) {
      conns.push({
        key: `qf-sf-${sf.id}`,
        src1: p1,
        src2: p2,
        dest: pd,
        side: half === 0 ? 'left' : 'right',
        drawDelay: 0.3,
        isOnPath: onPath.has(sf.id),
      });
    }
  }
  // SF → F (two short connectors converging on the Final from both sides)
  const sfA = rounds.SF[0];
  const sfB = rounds.SF[1];
  const fin = rounds.F[0];
  const p1 = posFor(sfA?.id);
  const p2 = posFor(sfB?.id);
  const pd = posFor(fin?.id);
  if (p1 && pd && fin) {
    conns.push({
      key: `sf-f-left`,
      src1: p1,
      src2: p1,
      dest: pd,
      side: 'left',
      drawDelay: 0.6,
      isOnPath: onPath.has(fin.id),
    });
  }
  if (p2 && pd && fin) {
    conns.push({
      key: `sf-f-right`,
      src1: p2,
      src2: p2,
      dest: pd,
      side: 'right',
      drawDelay: 0.6,
      isOnPath: onPath.has(fin.id),
    });
  }

  const finalPos = posFor(rounds.F[0]?.id);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: layout.height + 60, marginTop: 200 }}
    >
      <div className="absolute inset-x-0 top-0 grid grid-cols-7 text-[10px] uppercase tracking-[0.18em] text-text-dim text-center pointer-events-none">
        {labelCols.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>

      <svg
        className="absolute inset-x-0 w-full"
        style={{ height: layout.height, top: 20 }}
        aria-hidden
      >
        {conns.map((c) => (
          <BracketConnector
            key={c.key}
            src1={c.src1}
            src2={c.src2}
            dest={c.dest}
            side={c.side}
            isOnPath={c.isOnPath}
            drawDelay={c.drawDelay}
          />
        ))}
      </svg>

      <div className="absolute inset-0" style={{ top: 20 }}>
        {layout.positions.map((p) => {
          const node =
            rounds.R16.find((n) => n.id === p.id) ??
            rounds.QF.find((n) => n.id === p.id) ??
            rounds.SF.find((n) => n.id === p.id) ??
            rounds.F.find((n) => n.id === p.id);
          if (!node) return null;
          return (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: CARD_W,
                height: CARD_H,
              }}
            >
              <MatchCard
                node={node}
                isOnPath={onPath.has(node.id)}
                onHoverTeam={setHovered}
              />
            </div>
          );
        })}
      </div>

      {finalPos && (
        <div
          style={{
            position: 'absolute',
            left: finalPos.x + CARD_W / 2 - 110,
            top: finalPos.y - 240,
          }}
        >
          <TrophyCenter size={220} />
        </div>
      )}
    </div>
  );
}
