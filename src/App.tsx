import { SkipToContent } from '@/components/ui/SkipToContent';
import { PitchNavbar } from '@/components/navbar/PitchNavbar';
import { Footer } from '@/components/ui/Footer';
import { HeroGrid } from '@/components/hero/HeroGrid';
import { GlobalCanvas } from '@/three/GlobalCanvas';
import { useIntroTimeline } from '@/three/useIntroTimeline';

export default function App() {
  useIntroTimeline();
  return (
    <>
      <SkipToContent />
      <GlobalCanvas />
      <PitchNavbar />
      <main id="main">
        <HeroGrid />
      </main>
      <Footer />
    </>
  );
}
