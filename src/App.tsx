import { SkipToContent } from '@/components/ui/SkipToContent';
import { PitchNavbar } from '@/components/navbar/PitchNavbar';
import { Footer } from '@/components/ui/Footer';

export default function App() {
  return (
    <>
      <SkipToContent />
      <PitchNavbar />
      <main id="main" className="min-h-screen">
        <div className="max-w-container mx-auto p-12 text-text-dim">
          Sections will appear here.
        </div>
      </main>
      <Footer />
    </>
  );
}
