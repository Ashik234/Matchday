import { SkipToContent } from '@/components/ui/SkipToContent';
import { PitchNavbar } from '@/components/navbar/PitchNavbar';
import { Footer } from '@/components/ui/Footer';
import { HeroGrid } from '@/components/hero/HeroGrid';

export default function App() {
  return (
    <>
      <SkipToContent />
      <PitchNavbar />
      <main id="main">
        <HeroGrid />
      </main>
      <Footer />
    </>
  );
}
