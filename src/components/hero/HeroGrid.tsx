import { HeroLeft } from './HeroLeft';
import { HeroCenter } from './HeroCenter';
import { HeroRight } from './HeroRight';

export function HeroGrid() {
  return (
    <section
      id="hero"
      data-ball-stage="hero"
      className="max-w-container mx-auto px-4 md:px-8 py-8 md:py-12"
    >
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1.1fr_1.4fr_1fr]">
        <div className="order-2 lg:order-1"><HeroLeft /></div>
        <div className="order-1 lg:order-2"><HeroCenter /></div>
        <div className="order-3"><HeroRight /></div>
      </div>
    </section>
  );
}
