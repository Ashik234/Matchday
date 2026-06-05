import type { Player } from '@/data/types';
import { SquadColumn } from '../components/SquadColumn';

export function SquadCompareTab({
  homeName,
  awayName,
  squadHome,
  squadAway,
  homeCountryCode,
  awayCountryCode,
}: {
  homeName: string;
  awayName: string;
  squadHome: Player[];
  squadAway: Player[];
  homeCountryCode?: string;
  awayCountryCode?: string;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <SquadColumn name={homeName} squad={squadHome} countryCode={homeCountryCode} />
      <SquadColumn name={awayName} squad={squadAway} countryCode={awayCountryCode} />
    </div>
  );
}
