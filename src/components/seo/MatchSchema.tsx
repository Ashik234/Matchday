import type { Match } from '@/data/types';

export function MatchSchema({ matches }: { matches: Match[] }) {
  const items = matches.map((m) => ({
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${m.home.name} vs ${m.away.name}`,
    startDate: m.kickoff,
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: m.stadium.name,
      address: m.stadium.city,
    },
    competitor: [
      { '@type': 'SportsTeam', name: m.home.name },
      { '@type': 'SportsTeam', name: m.away.name },
    ],
  }));
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(items).replace(/</g, '\\u003c') }}
    />
  );
}
