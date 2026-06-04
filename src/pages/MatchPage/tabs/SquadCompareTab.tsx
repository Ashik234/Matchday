import type { Player } from '@/data/types';
import { SquadColumn } from '../components/SquadColumn';

export function SquadCompareTab({
  homeName,
  awayName,
  squadHome,
  squadAway,
}: {
  homeName: string;
  awayName: string;
  squadHome: Player[];
  squadAway: Player[];
}) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <SquadColumn name={homeName} squad={squadHome} />
      <SquadColumn name={awayName} squad={squadAway} />
    </div>
  );
}
