import type { BracketNode } from '@/data/types';

/**
 * Given a team name and the bracketed node lists (already filtered + sorted),
 * return a Set of node IDs that fall on that team's progression path.
 *
 * Pairing rule (mirror of useBracketLayout):
 *   Round N nodes at indices (2k, 2k+1) feed Round N+1 node at index k.
 *   Applied independently on left and right halves.
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
