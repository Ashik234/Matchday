import { useMemo } from 'react';

export type CardPos = { id: string; x: number; y: number };

export const CARD_W = 180;
export const CARD_H = 56;

export function useBracketLayout(
  containerW: number,
  ids: { R16: string[]; QF: string[]; SF: string[]; F: string[] },
) {
  return useMemo(() => {
    const cols = 7;
    const colW = containerW / cols;
    const colX = (col: number) => col * colW + (colW - CARD_W) / 2;

    const s = CARD_H + 14;
    const heights = {
      R16: 4 * s,
      QF: 2 * (2 * s),
      SF: 4 * s,
      F: 0,
    };

    const totalH = heights.R16 + s;
    const yForCol = (col: number, idx: number, count: number): number => {
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

    ids.R16.slice(0, 4).forEach((id, i) => positions.push({ id, x: colX(0), y: yForCol(0, i, 4) }));
    ids.R16.slice(4, 8).forEach((id, i) => positions.push({ id, x: colX(6), y: yForCol(6, i, 4) }));
    ids.QF.slice(0, 2).forEach((id, i) => positions.push({ id, x: colX(1), y: yForCol(1, i, 2) }));
    ids.QF.slice(2, 4).forEach((id, i) => positions.push({ id, x: colX(5), y: yForCol(5, i, 2) }));
    ids.SF.slice(0, 1).forEach((id, i) => positions.push({ id, x: colX(2), y: yForCol(2, i, 1) }));
    ids.SF.slice(1, 2).forEach((id, i) => positions.push({ id, x: colX(4), y: yForCol(4, i, 1) }));
    ids.F.slice(0, 1).forEach((id, i) => positions.push({ id, x: colX(3), y: yForCol(3, i, 1) }));

    const map = new Map(positions.map((p) => [p.id, p]));
    return { positions, map, height: totalH };
  }, [containerW, ids.R16, ids.QF, ids.SF, ids.F]);
}
