import { Link } from 'react-router-dom';

const LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Matches', to: '/#today-matches' },
  { label: 'Teams', to: '/#featured-teams' },
  { label: 'Bracket', to: '/#road-to-final' },
];

export function NavLinks() {
  return (
    <ul className="flex gap-7">
      {LINKS.map((l) => (
        <li key={l.to}>
          <Link
            to={l.to}
            className="text-xs font-semibold tracking-[0.15em] uppercase text-text/85 hover:text-gold transition-colors duration-fast"
          >
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
