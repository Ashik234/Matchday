import { SkipToContent } from '@/components/ui/SkipToContent';
import { PitchNavbar } from '@/components/navbar/PitchNavbar';
import { Footer } from '@/components/ui/Footer';
import { HeroGrid } from '@/components/hero/HeroGrid';
import { GlobalCanvas } from '@/three/GlobalCanvas';
import { useIntroTimeline } from '@/three/useIntroTimeline';
import { TodayMatchesSection } from '@/components/sections/TodayMatchesSection';
import { TournamentProgress } from '@/components/sections/TournamentProgress';
import { GroupStandings } from '@/components/sections/GroupStandings';
import { FeaturedTeams } from '@/components/sections/FeaturedTeams';
import { LiveMatchCenter } from '@/components/sections/LiveMatchCenter';
import { RoadToFinal } from '@/components/sections/RoadToFinal';
import { FinalCountdown } from '@/components/sections/FinalCountdown';

export default function App() {
  useIntroTimeline();
  return (
    <>
      <SkipToContent />
      <GlobalCanvas />
      <PitchNavbar />
      <main id="main">
        <HeroGrid />
        <TodayMatchesSection />
        <TournamentProgress />
        <GroupStandings />
        <FeaturedTeams />
        <LiveMatchCenter />
        <RoadToFinal />
        <FinalCountdown />
      </main>
      <Footer />
    </>
  );
}
