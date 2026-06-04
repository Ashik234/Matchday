import type { Team, Match, BracketNode, Group } from '@/data/types';
import { formFromMatch } from '../components/RecentForm';

const KO_ORDER: Array<{ label: string; round: BracketNode['round'] }> = [
  { label: 'Round of 32', round: 'R32' },
  { label: 'Round of 16', round: 'R16' },
  { label: 'Quarter-final', round: 'QF' },
  { label: 'Semi-final', round: 'SF' },
  { label: 'Final', round: 'F' },
];

export function JourneyTab({
  team,
  matches,
  group,
  bracketNodes,
}: {
  team: Team;
  matches: Match[];
  group?: Group;
  bracketNodes: BracketNode[];
}) {
  const groupMatches = matches.filter((m) => m.group);
  let gf = 0;
  let ga = 0;
  let groupOutcome: 'qualified' | 'eliminated' | 'pending' = 'pending';
  if (groupMatches.length && groupMatches.every((m) => m.status === 'finished')) {
    for (const m of groupMatches) {
      const isHome = m.home.teamId === team.name;
      gf += (isHome ? m.home.score : m.away.score) ?? 0;
      ga += (isHome ? m.away.score : m.home.score) ?? 0;
    }
    const standing = group?.standings.findIndex(
      (s) => s.team.id === team.id || s.team.name === team.name,
    );
    groupOutcome = standing !== undefined && standing >= 0 && standing < 2 ? 'qualified' : 'eliminated';
  }

  const rows = KO_ORDER.map(({ label, round }) => {
    const node = bracketNodes.find((n) => n.round === round);
    if (!node) return { label, round, status: 'pending' as const };
    const isHome = node.home?.teamId === team.name;
    const opp = isHome ? node.away : node.home;
    const matchForNode = matches.find((m) => m.id === node.matchId);
    let status: 'won' | 'lost' | 'pending' = 'pending';
    let scoreLine: string | undefined;
    if (matchForNode && matchForNode.status === 'finished') {
      const r = formFromMatch(matchForNode, team.name);
      status = r === 'W' ? 'won' : 'lost';
      scoreLine = `${matchForNode.home.score}-${matchForNode.away.score}`;
    }
    return { label, round, status, opp: opp?.name, scoreLine };
  });

  const dotColor = (status: 'won' | 'lost' | 'pending' | 'qualified' | 'eliminated') => {
    if (status === 'won' || status === 'qualified') return 'bg-success';
    if (status === 'lost' || status === 'eliminated') return 'bg-loss';
    return 'bg-text-muted';
  };

  return (
    <ol className="relative pl-6 border-l border-white/10 space-y-6">
      <li className="relative">
        <span className={`absolute -left-[10px] top-1 w-4 h-4 rounded-full ${dotColor(groupOutcome)}`} />
        <div className="text-sm font-semibold text-text">Group Stage{group ? ` — Group ${group.letter}` : ''}</div>
        <div className="text-xs text-text-dim mt-1">
          {groupOutcome === 'pending'
            ? 'In progress'
            : `${groupOutcome === 'qualified' ? 'Qualified' : 'Eliminated'} · GF ${gf} · GA ${ga}`}
        </div>
      </li>
      {rows.map((r) => (
        <li key={r.round} className="relative">
          <span className={`absolute -left-[10px] top-1 w-4 h-4 rounded-full ${dotColor(r.status)}`} />
          <div className="text-sm font-semibold text-text">{r.label}</div>
          <div className="text-xs text-text-dim mt-1">
            {r.status === 'pending'
              ? 'Not played'
              : `vs ${'opp' in r ? r.opp ?? '' : ''}${r.scoreLine ? ` · ${r.scoreLine}` : ''}`}
          </div>
        </li>
      ))}
    </ol>
  );
}
