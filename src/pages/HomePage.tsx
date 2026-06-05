import { HeroGrid } from '@/components/hero/HeroGrid';
import { TodayMatchesSection } from '@/components/sections/TodayMatchesSection';
import { TournamentProgress } from '@/components/sections/TournamentProgress';
import { OnThisDaySection } from '@/components/sections/OnThisDay/OnThisDaySection';
import { GroupStandings } from '@/components/sections/GroupStandings';
import { FeaturedTeams } from '@/components/sections/FeaturedTeams';
import { LiveMatchCenter } from '@/components/sections/LiveMatchCenter';
import { RoadToFinal } from '@/components/sections/RoadToFinal';
import { FinalCountdown } from '@/components/sections/FinalCountdown';

export function HomePage() {
  return (
    <>
      <HeroGrid />
      <TodayMatchesSection />
      <TournamentProgress />
      <OnThisDaySection />
      <GroupStandings />
      <FeaturedTeams />
      <LiveMatchCenter />
      <RoadToFinal />
      <FinalCountdown />
    </>
  );
}
