import { lazy, Suspense } from 'react';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { PitchNavbar } from '@/components/navbar/PitchNavbar';
import { Footer } from '@/components/ui/Footer';
import { HeroGrid } from '@/components/hero/HeroGrid';
import { HeadTags } from '@/components/seo/HeadTags';
import { useIntroTimeline } from '@/three/useIntroTimeline';
import { useScrollStage } from '@/hooks/useScrollStage';
import { TodayMatchesSection } from '@/components/sections/TodayMatchesSection';
import { TournamentProgress } from '@/components/sections/TournamentProgress';
import { GroupStandings } from '@/components/sections/GroupStandings';
import { FeaturedTeams } from '@/components/sections/FeaturedTeams';
import { LiveMatchCenter } from '@/components/sections/LiveMatchCenter';
import { RoadToFinal } from '@/components/sections/RoadToFinal';
import { FinalCountdown } from '@/components/sections/FinalCountdown';

const GlobalCanvas = lazy(() =>
  import('@/three/GlobalCanvas').then((m) => ({ default: m.GlobalCanvas })),
);

export default function App() {
  useIntroTimeline();
  useScrollStage();
  return (
    <>
      <HeadTags />
      <SkipToContent />
      <Suspense fallback={null}>
        <GlobalCanvas />
      </Suspense>
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
