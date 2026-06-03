import { Section } from './Section';
import { TeamCarouselCard } from './TeamCarouselCard';
import { fixtures } from '@/data/fixtures';

export function FeaturedTeams() {
  const teams = fixtures.teams;
  return (
    <Section id="featured-teams" stage="featured-teams" eyebrow="Featured" title="Teams to watch">
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4">
        {teams.map((t) => (
          <TeamCarouselCard key={t.id} team={t} />
        ))}
      </div>
    </Section>
  );
}
