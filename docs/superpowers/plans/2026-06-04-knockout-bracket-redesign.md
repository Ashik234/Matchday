# Symmetric Knockout Bracket Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current 4-column horizontal-scroll bracket with a symmetric R16 → QF → SF → F tournament tree on desktop (SVG connectors, central trophy, hover-path highlight) and a vertical waterfall on mobile.

**Architecture:** New `src/components/sections/RoadToFinal/` directory replaces the single `RoadToFinal.tsx` + `BracketColumn.tsx` files. Pure-function layout helper computes absolute card positions from container size; an SVG layer draws connectors between parent/child cards; a shared `hoveredTeam` state lights up the full path on mouse-enter. Mobile branch is a swipeable column stack with no SVG.

**Tech Stack:** React 19, TypeScript strict, Framer Motion, Tailwind v4, existing `useBracket` + `useBreakpoint` + `useReducedMotion` hooks, `react-router-dom` (for team links via `toSlug`).

**Repo note:** No test runner. Verification = `pnpm tsc -b --noEmit` + `pnpm build` + manual browser checks. Each task ends in a commit.

---

## File Structure

**Create (new directory):**

- `src/components/sections/RoadToFinal/index.tsx`
- `src/components/sections/RoadToFinal/BracketTree.tsx`
- `src/components/sections/RoadToFinal/BracketWaterfall.tsx`
- `src/components/sections/RoadToFinal/TrophyCenter.tsx`
- `src/components/sections/RoadToFinal/MatchCard.tsx`
- `src/components/sections/RoadToFinal/BracketConnector.tsx`
- `src/components/sections/RoadToFinal/useBracketLayout.ts`
- `src/components/sections/RoadToFinal/isPlaceholder.ts`
- `src/components/sections/RoadToFinal/pathFor.ts`

**Delete:**

- `src/components/sections/RoadToFinal.tsx`
- `src/components/sections/BracketColumn.tsx`

**Modify:** None — `HomePage.tsx` imports `RoadToFinal` from
`@/components/sections/RoadToFinal` which now resolves to the new
directory's `index.tsx`.

---

## Task 1: Extract `isPlaceholder` helper

**Files:**
- Create: `src/components/sections/RoadToFinal/isPlaceholder.ts`

- [ ] **Step 1: Write the helper**

```ts
// src/components/sections/RoadToFinal/isPlaceholder.ts
import type { BracketSide } from '@/data/types';

// Placeholder strings openfootball emits when actual teams aren't decided yet,
// e.g. "W74" = winner of match 74, "L11" = loser, "1A" = group A winner.
const PLACEHOLDER = /^([WL]\d+|[123]\w+|TBD)$/i;

export function isPlaceholder(side: BracketSide | undefined): boolean {
  if (!side) return true;
  return PLACEHOLDER.test(side.name) || side.countryCode === 'xx';
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/RoadToFinal/isPlaceholder.ts
git commit -m "bracket: extract isPlaceholder helper (shared by tree + waterfall)"
```

---

## Task 2: `pathFor` — hover-highlight team progression

**Files:**
- Create: `src/components/sections/RoadToFinal/pathFor.ts`

- [ ] **Step 1: Write the helper**

```ts
// src/components/sections/RoadToFinal/pathFor.ts
import type { BracketNode } from '@/data/types';

/**
 * Given a team name and the bracketed node lists (already filtered + sorted),
 * return a Set of node IDs that fall on that team's progression path.
 *
 * Pairing rule (mirror of useBracketLayout):
 *   Round N nodes at indices (2k, 2k+1) feed Round N+1 node at index k.
 *   This applies independently on left and right halves of each round.
 *
 * A node is "on the path" if:
 *   (a) Either side is this team's name, OR
 *   (b) It descends from a pair where one of (a) was true.
 */
export function pathFor(
  team: string | null,
  rounds: {
    R16: BracketNode[];
    QF: BracketNode[];
    SF: BracketNode[];
    F: BracketNode[];
  },
): Set<string> {
  const out = new Set<string>();
  if (!team) return out;

  // Track which index in the current round is on-path.
  // For each side (left/right half), 4 R16 indices → 2 QF → 1 SF; both → 1 F.
  const checkSide = (n: BracketNode | undefined) =>
    !!n && (n.home?.teamId === team || n.away?.teamId === team);

  // R16: 8 nodes. left = 0..3, right = 4..7.
  const onR16 = rounds.R16.map(checkSide);
  rounds.R16.forEach((n, i) => {
    if (onR16[i]) out.add(n.id);
  });

  // QF: 4 nodes. left 0..1 from R16 (0,1)+(2,3); right 2..3 from R16 (4,5)+(6,7).
  const onQF = [
    onR16[0] || onR16[1],
    onR16[2] || onR16[3],
    onR16[4] || onR16[5],
    onR16[6] || onR16[7],
  ];
  rounds.QF.forEach((n, i) => {
    if (onQF[i] || checkSide(n)) {
      out.add(n.id);
      onQF[i] = true;
    }
  });

  // SF: 2 nodes. left 0 from QF (0,1); right 1 from QF (2,3).
  const onSF = [onQF[0] || onQF[1], onQF[2] || onQF[3]];
  rounds.SF.forEach((n, i) => {
    if (onSF[i] || checkSide(n)) {
      out.add(n.id);
      onSF[i] = true;
    }
  });

  // F: 1 node from SF (0,1).
  const onF = onSF[0] || onSF[1];
  rounds.F.forEach((n) => {
    if (onF || checkSide(n)) out.add(n.id);
  });

  return out;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/RoadToFinal/pathFor.ts
git commit -m "bracket: pathFor helper — derives team progression node set"
```

---

## Task 3: `useBracketLayout` — compute card positions

**Files:**
- Create: `src/components/sections/RoadToFinal/useBracketLayout.ts`

- [ ] **Step 1: Write the hook**

```ts
// src/components/sections/RoadToFinal/useBracketLayout.ts
import { useMemo } from 'react';

export type CardPos = { id: string; x: number; y: number };

export const CARD_W = 180;
export const CARD_H = 56;

/**
 * Pure layout: given container width and the 4 round node-id arrays
 * (in sorted order, halved at midpoint = left/right), return an absolute
 * x/y for every card.
 *
 * Columns (7 total): 0 R16L, 1 QFL, 2 SFL, 3 F, 4 SFR, 5 QFR, 6 R16R.
 *
 * Y layout: R16 cards spaced `s` apart vertically; QF spaced `2s`; SF
 * spaced `4s`; F centred. Outer half-card padding on top + bottom.
 */
export function useBracketLayout(
  containerW: number,
  ids: { R16: string[]; QF: string[]; SF: string[]; F: string[] },
) {
  return useMemo(() => {
    const cols = 7;
    const colW = containerW / cols;
    const colX = (col: number) => col * colW + (colW - CARD_W) / 2;

    const s = CARD_H + 14; // base vertical gap between sibling R16 cards
    const heights = {
      R16: 4 * s, // 4 cards stack distance
      QF: 2 * (2 * s),
      SF: 4 * s,
      F: 0,
    };

    const totalH = heights.R16 + s;
    const yForCol = (col: number, idx: number, count: number): number => {
      // count cards in this side+round; place them centred around totalH/2
      // spaced according to that round's stride.
      const stride =
        col === 0 || col === 6
          ? s
          : col === 1 || col === 5
            ? 2 * s
            : col === 2 || col === 4
              ? 4 * s
              : 0;
      const groupHeight = (count - 1) * stride;
      const startY = (totalH - groupHeight) / 2;
      return startY + idx * stride;
    };

    const positions: CardPos[] = [];

    // R16 left (col 0)
    ids.R16.slice(0, 4).forEach((id, i) => {
      positions.push({ id, x: colX(0), y: yForCol(0, i, 4) });
    });
    // R16 right (col 6)
    ids.R16.slice(4, 8).forEach((id, i) => {
      positions.push({ id, x: colX(6), y: yForCol(6, i, 4) });
    });
    // QF left (col 1)
    ids.QF.slice(0, 2).forEach((id, i) => {
      positions.push({ id, x: colX(1), y: yForCol(1, i, 2) });
    });
    // QF right (col 5)
    ids.QF.slice(2, 4).forEach((id, i) => {
      positions.push({ id, x: colX(5), y: yForCol(5, i, 2) });
    });
    // SF left (col 2)
    ids.SF.slice(0, 1).forEach((id, i) => {
      positions.push({ id, x: colX(2), y: yForCol(2, i, 1) });
    });
    // SF right (col 4)
    ids.SF.slice(1, 2).forEach((id, i) => {
      positions.push({ id, x: colX(4), y: yForCol(4, i, 1) });
    });
    // F centre (col 3)
    ids.F.slice(0, 1).forEach((id, i) => {
      positions.push({ id, x: colX(3), y: yForCol(3, i, 1) });
    });

    const map = new Map(positions.map((p) => [p.id, p]));
    return { positions, map, height: totalH };
  }, [containerW, ids.R16, ids.QF, ids.SF, ids.F]);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/RoadToFinal/useBracketLayout.ts
git commit -m "bracket: useBracketLayout — pure card positioning by column + stride"
```

---

## Task 4: `MatchCard` — single match (two sides + winner styling)

**Files:**
- Create: `src/components/sections/RoadToFinal/MatchCard.tsx`

- [ ] **Step 1: Write the card**

```tsx
// src/components/sections/RoadToFinal/MatchCard.tsx
import { Link } from 'react-router-dom';
import { Flag } from '@/components/ui/Flag';
import { toSlug } from '@/utils/slug';
import { isPlaceholder } from './isPlaceholder';
import type { BracketNode, BracketSide } from '@/data/types';

function SideContent({ side }: { side: BracketSide | undefined }) {
  if (!side) return <span className="text-text-dim text-[11px] uppercase tracking-wider">TBD</span>;
  if (isPlaceholder(side)) {
    return (
      <span className="flex items-center gap-2 text-text-dim">
        <span className="w-5 h-3 rounded-sm bg-bg-elev2" aria-hidden />
        <span className="text-[11px] uppercase tracking-wider truncate">{side.name}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2 min-w-0">
      <Flag countryCode={side.countryCode} size="sm" />
      <span className="font-semibold text-xs truncate">{side.name}</span>
    </span>
  );
}

function Side({
  side,
  isWinner,
  onHover,
}: {
  side: BracketSide | undefined;
  isWinner: boolean;
  onHover: (name: string | null) => void;
}) {
  const realTeam = side && !isPlaceholder(side);
  const handleEnter = () => {
    if (realTeam && side) onHover(side.name);
  };
  const handleLeave = () => onHover(null);

  const inner = (
    <span
      className={
        'flex items-center justify-between gap-2 px-2 py-1.5 ' +
        (isWinner ? 'border-l-2 border-gold bg-bg-elev1/70' : '')
      }
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <SideContent side={side} />
    </span>
  );

  if (realTeam && side) {
    return (
      <Link to={`/team/${toSlug(side.name)}`} className="block hover:text-gold transition-colors">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function MatchCard({
  node,
  isOnPath,
  onHoverTeam,
}: {
  node: BracketNode;
  isOnPath: boolean;
  onHoverTeam: (name: string | null) => void;
}) {
  const winnerId = node.winnerTeamId;
  return (
    <div
      role="group"
      aria-label={`${node.home?.name ?? 'TBD'} vs ${node.away?.name ?? 'TBD'}`}
      className={
        'rounded-lg bg-bg-elev1/40 backdrop-blur-md border transition-all duration-fast ' +
        (isOnPath
          ? 'border-gold shadow-gold -translate-y-0.5'
          : 'border-white/10')
      }
    >
      <Side
        side={node.home}
        isWinner={!!winnerId && node.home?.teamId === winnerId}
        onHover={onHoverTeam}
      />
      <div className="border-t border-white/5" />
      <Side
        side={node.away}
        isWinner={!!winnerId && node.away?.teamId === winnerId}
        onHover={onHoverTeam}
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/RoadToFinal/MatchCard.tsx
git commit -m "bracket: MatchCard with winner border + path highlight + team links"
```

---

## Task 5: `BracketConnector` — animated SVG path

**Files:**
- Create: `src/components/sections/RoadToFinal/BracketConnector.tsx`

- [ ] **Step 1: Write the connector**

```tsx
// src/components/sections/RoadToFinal/BracketConnector.tsx
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { CARD_W, CARD_H } from './useBracketLayout';

type Point = { x: number; y: number };

export function BracketConnector({
  src1,
  src2,
  dest,
  side, // 'left' | 'right' — determines stub direction
  isOnPath,
  drawDelay,
}: {
  src1: Point;
  src2: Point;
  dest: Point;
  side: 'left' | 'right';
  isOnPath: boolean;
  drawDelay: number;
}) {
  const reduced = useReducedMotion();

  // Anchors: right edge of src cards (for left side) or left edge (for right side).
  const stubLen = 18;
  const src1Anchor: Point = {
    x: side === 'left' ? src1.x + CARD_W : src1.x,
    y: src1.y + CARD_H / 2,
  };
  const src2Anchor: Point = {
    x: side === 'left' ? src2.x + CARD_W : src2.x,
    y: src2.y + CARD_H / 2,
  };
  const destAnchor: Point = {
    x: side === 'left' ? dest.x : dest.x + CARD_W,
    y: dest.y + CARD_H / 2,
  };

  const midX =
    side === 'left'
      ? Math.max(src1Anchor.x, src2Anchor.x) + stubLen
      : Math.min(src1Anchor.x, src2Anchor.x) - stubLen;

  // Path: two stubs + vertical brace + horizontal feed.
  const d = [
    `M ${src1Anchor.x} ${src1Anchor.y}`,
    `L ${midX} ${src1Anchor.y}`,
    `L ${midX} ${src2Anchor.y}`,
    `L ${src2Anchor.x} ${src2Anchor.y}`,
    `M ${midX} ${(src1Anchor.y + src2Anchor.y) / 2}`,
    `L ${destAnchor.x} ${destAnchor.y}`,
  ].join(' ');

  const stroke = isOnPath ? 'rgb(0,200,255)' : 'rgba(255,215,0,0.35)';
  const strokeWidth = isOnPath ? 2 : 1.5;

  return (
    <motion.path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={reduced ? false : { pathLength: 0, opacity: 0 }}
      animate={reduced ? undefined : { pathLength: 1, opacity: 1 }}
      transition={{
        pathLength: { duration: 0.6, delay: drawDelay, ease: 'easeOut' },
        opacity: { duration: 0.2, delay: drawDelay },
      }}
    />
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/RoadToFinal/BracketConnector.tsx
git commit -m "bracket: BracketConnector — animated SVG path between two src and dest"
```

---

## Task 6: `TrophyCenter` — pulsing gold trophy

**Files:**
- Create: `src/components/sections/RoadToFinal/TrophyCenter.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/sections/RoadToFinal/TrophyCenter.tsx
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function TrophyCenter({ size = 96 }: { size?: number }) {
  const reduced = useReducedMotion();
  const filterFrames = [
    'drop-shadow(0 0 6px rgba(255,215,0,0.4))',
    'drop-shadow(0 0 18px rgba(255,215,0,0.7))',
    'drop-shadow(0 0 6px rgba(255,215,0,0.4))',
  ];

  return (
    <motion.div
      aria-label="World Cup trophy"
      role="img"
      style={{ width: size, height: size }}
      initial={false}
      animate={reduced ? undefined : { filter: filterFrames }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
        <defs>
          <radialGradient id="trophy-shade" cx="40%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#FFEFA0" />
            <stop offset="55%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#8a6708" />
          </radialGradient>
        </defs>
        {/* cup body */}
        <path
          d="M16 8 L48 8 L48 22 C48 32 40 38 32 38 C24 38 16 32 16 22 Z"
          fill="url(#trophy-shade)"
          stroke="#5a4400"
          strokeWidth="1"
        />
        {/* handles */}
        <path d="M16 12 C8 14 8 24 16 24" fill="none" stroke="url(#trophy-shade)" strokeWidth="3" />
        <path d="M48 12 C56 14 56 24 48 24" fill="none" stroke="url(#trophy-shade)" strokeWidth="3" />
        {/* stem */}
        <rect x="29" y="38" width="6" height="8" fill="url(#trophy-shade)" />
        {/* base */}
        <rect x="20" y="46" width="24" height="6" rx="1" fill="url(#trophy-shade)" />
        <rect x="16" y="52" width="32" height="4" rx="1" fill="url(#trophy-shade)" />
        {/* highlight */}
        <ellipse cx="26" cy="14" rx="5" ry="2" fill="rgba(255,255,255,0.35)" />
      </svg>
    </motion.div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/RoadToFinal/TrophyCenter.tsx
git commit -m "bracket: TrophyCenter — inline gold SVG trophy with glow pulse"
```

---

## Task 7: `BracketTree` — desktop assembly

**Files:**
- Create: `src/components/sections/RoadToFinal/BracketTree.tsx`

- [ ] **Step 1: Implementation**

```tsx
// src/components/sections/RoadToFinal/BracketTree.tsx
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

  // Round labels (left + right columns share label, drawn at top)
  const labelCols: Array<{ x: number; label: string }> = [
    { x: 0, label: 'Round of 16' },
    { x: 1, label: 'Quarter-finals' },
    { x: 2, label: 'Semi-finals' },
    { x: 3, label: 'Final' },
    { x: 4, label: 'Semi-finals' },
    { x: 5, label: 'Quarter-finals' },
    { x: 6, label: 'Round of 16' },
  ];

  // Connector definitions: for each dest in QF/SF/F, two src nodes.
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
  // SF → F
  const sfA = rounds.SF[0];
  const sfB = rounds.SF[1];
  const fin = rounds.F[0];
  const p1 = posFor(sfA?.id);
  const p2 = posFor(sfB?.id);
  const pd = posFor(fin?.id);
  if (p1 && p2 && pd && fin) {
    // Two short connectors converging on the Final from both sides.
    conns.push({
      key: `sf-f-left`,
      src1: p1,
      src2: p1,
      dest: pd,
      side: 'left',
      drawDelay: 0.6,
      isOnPath: onPath.has(fin.id),
    });
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

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: layout.height + 60 }}
    >
      {/* Round labels strip */}
      <div className="absolute inset-x-0 top-0 grid grid-cols-7 text-[10px] uppercase tracking-[0.18em] text-text-dim text-center pointer-events-none">
        {labelCols.map((l, i) => (
          <span key={i}>{l.label}</span>
        ))}
      </div>

      {/* Connectors layer */}
      <svg
        className="absolute inset-0 w-full"
        style={{ height: layout.height + 60, top: 20 }}
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

      {/* Cards layer */}
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

      {/* Trophy — centred above the Final card */}
      {(() => {
        const finalPos = posFor(rounds.F[0]?.id);
        if (!finalPos) return null;
        return (
          <div
            style={{
              position: 'absolute',
              left: finalPos.x + CARD_W / 2 - 48,
              top: finalPos.y - 110,
            }}
          >
            <TrophyCenter />
          </div>
        );
      })()}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/RoadToFinal/BracketTree.tsx
git commit -m "bracket: BracketTree — desktop layout with connectors + trophy + hover-path"
```

---

## Task 8: `BracketWaterfall` — mobile vertical stack

**Files:**
- Create: `src/components/sections/RoadToFinal/BracketWaterfall.tsx`

- [ ] **Step 1: Implementation**

```tsx
// src/components/sections/RoadToFinal/BracketWaterfall.tsx
import { motion } from 'framer-motion';
import type { BracketNode } from '@/data/types';
import { MatchCard } from './MatchCard';
import { TrophyCenter } from './TrophyCenter';

const LABELS = {
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  F: 'Final',
} as const;

function RoundStrip({
  label,
  nodes,
}: {
  label: string;
  nodes: BracketNode[];
}) {
  if (!nodes.length) return null;
  return (
    <section aria-label={label}>
      <h3 className="text-[10px] uppercase tracking-[0.3em] text-gold mb-2 px-1">{label}</h3>
      <div className="no-scrollbar flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4">
        {nodes.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="shrink-0 w-[230px] snap-start"
          >
            <MatchCard node={n} isOnPath={false} onHoverTeam={() => {}} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Funnel({ from, to }: { from: number; to: number }) {
  return (
    <div
      aria-hidden
      className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-text-dim py-3"
    >
      <span>{from}</span>
      <span>→</span>
      <span>{to}</span>
    </div>
  );
}

export function BracketWaterfall({
  rounds,
}: {
  rounds: { R16: BracketNode[]; QF: BracketNode[]; SF: BracketNode[]; F: BracketNode[] };
}) {
  return (
    <div className="space-y-2">
      <RoundStrip label={LABELS.R16} nodes={rounds.R16} />
      <Funnel from={8} to={4} />
      <RoundStrip label={LABELS.QF} nodes={rounds.QF} />
      <Funnel from={4} to={2} />
      <RoundStrip label={LABELS.SF} nodes={rounds.SF} />
      <Funnel from={2} to={1} />
      <RoundStrip label={LABELS.F} nodes={rounds.F} />
      <div className="flex justify-center pt-4">
        <TrophyCenter size={72} />
      </div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-text-dim mt-2 text-center">
        ← swipe →
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/RoadToFinal/BracketWaterfall.tsx
git commit -m "bracket: BracketWaterfall — mobile vertical stack with funnels + trophy"
```

---

## Task 9: `RoadToFinal/index.tsx` — section shell

**Files:**
- Create: `src/components/sections/RoadToFinal/index.tsx`

- [ ] **Step 1: Implementation**

```tsx
// src/components/sections/RoadToFinal/index.tsx
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/RoadToFinal/index.tsx
git commit -m "bracket: RoadToFinal section shell branches desktop tree vs mobile waterfall"
```

---

## Task 10: Delete legacy bracket files

**Files:**
- Delete: `src/components/sections/RoadToFinal.tsx`
- Delete: `src/components/sections/BracketColumn.tsx`

- [ ] **Step 1: Confirm no stale references**

Run: `grep -r "BracketColumn" src/ --include="*.ts" --include="*.tsx"`
Expected: only matches in the file about to be deleted (or zero).

Run: `grep -r "sections/RoadToFinal'" src/ --include="*.ts" --include="*.tsx"`
Expected: only `HomePage.tsx` (which already resolves to the new directory's `index.tsx`).

- [ ] **Step 2: Remove the files**

```bash
git rm src/components/sections/RoadToFinal.tsx src/components/sections/BracketColumn.tsx
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc -b --noEmit`
Run: `npx vite build`
Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git commit -m "bracket: remove legacy RoadToFinal.tsx + BracketColumn.tsx (replaced by directory)"
```

---

## Task 11: Manual verification

**Files:** none — runtime only.

- [ ] **Step 1: Start dev server**

Run: `pnpm dev` and open the URL.

- [ ] **Step 2: Desktop layout (≥768 px)**

Scroll to "Road to the Final". Expected:
- 7 column labels across the top (R16, QF, SF, F, SF, QF, R16).
- 8 R16 cards, 4 left + 4 right.
- 4 QF cards, 2 left + 2 right.
- 2 SF cards, 1 left + 1 right.
- 1 Final card centred.
- Trophy icon hovering above the Final card with a soft gold pulse.
- Gold connector lines link every pair to their next round.

- [ ] **Step 3: Connector draw-in animation**

Reload the page. Watch the connectors animate from short to full length, R16→QF wave first, QF→SF next, SF→F last.

- [ ] **Step 4: Hover-path highlight**

Mouse over any real (non-placeholder) team in any R16 card. Expected:
- That card gets gold border + slight lift.
- Connectors to QF/SF/F nodes containing that team turn cyan + thicker.
- Cards on that path get gold border.
- Mouse leave → all returns to neutral.

- [ ] **Step 5: Click-through navigation**

Click a real team in an R16 card. Expected: navigate to `/team/<slug>`.

- [ ] **Step 6: Placeholder behaviour**

Hover/click a `W74` or `1A` style placeholder. Expected: no link, no
hover highlight, just the grey pill.

- [ ] **Step 7: Mobile (≤640 px)**

DevTools to mobile. Expected: stacked rounds R16 → QF → SF → F → Trophy,
each round a swipeable horizontal strip. Funnels `8 → 4`, `4 → 2`,
`2 → 1` between strips.

- [ ] **Step 8: Reduced motion**

Toggle OS reduced-motion. Reload. Expected: connectors render
immediately (no draw-in), trophy glow is static, card fade-ins are
instant.

- [ ] **Step 9: Empty payload**

In devtools network panel, block `worldcup.json` and reload. Expected:
fallback banner appears; if the cache is empty the "Bracket will appear
once knockout draws are confirmed" message renders.

- [ ] **Step 10: tsc + build sanity**

Run: `npx tsc -b --noEmit` (clean)
Run: `npx vite build` (clean)

---

## Self-review checklist

- [ ] Spec coverage: every section of `docs/superpowers/specs/2026-06-04-knockout-bracket-redesign-design.md` mapped to a task above (architecture → T1–T9, data flow → T9 `pickRounds`, desktop layout → T7, connectors → T5, hover path → T2 + T7, trophy → T6, mobile waterfall → T8, animations → T5/T7, accessibility → MatchCard role/aria + TrophyCenter aria-label, empty state → T9, deletes → T10, verify → T11).
- [ ] No placeholders: all code blocks complete, no TBD/TODO inside steps.
- [ ] Type consistency: `BracketNode`, `BracketSide`, `Point`, `Rounds`, `CardPos`, `pathFor`, `useBracketLayout`, `CARD_W`/`CARD_H` referenced consistently across tasks.
- [ ] Exact file paths in every Files block.
- [ ] Every task ends in a commit.
