import type { ReactNode } from 'react';
import { SkipToContent } from '@/components/ui/SkipToContent';
import { PitchNavbar } from '@/components/navbar/PitchNavbar';
import { Footer } from '@/components/ui/Footer';
import { HeadTags } from '@/components/seo/HeadTags';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <HeadTags />
      <SkipToContent />
      <PitchNavbar />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
