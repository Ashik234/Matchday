const LINKS = [
  { label: 'Home', href: '#hero' },
  { label: 'Matches', href: '#today-matches' },
  { label: 'Teams', href: '#featured-teams' },
  { label: 'Stadiums', href: '#stadiums' },
  { label: 'Bracket', href: '#road-to-final' },
];

export function NavLinks() {
  return (
    <ul className="flex gap-7">
      {LINKS.map((l) => (
        <li key={l.href}>
          <a
            href={l.href}
            className="text-xs font-semibold tracking-[0.15em] uppercase text-text/85 hover:text-gold transition-colors duration-fast"
          >
            {l.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
