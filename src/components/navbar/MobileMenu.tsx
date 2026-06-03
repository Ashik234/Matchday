import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const LINKS = [
  { label: 'Home', href: '#hero' },
  { label: 'Matches', href: '#today-matches' },
  { label: 'Teams', href: '#featured-teams' },
  { label: 'Stadiums', href: '#stadiums' },
  { label: 'Bracket', href: '#road-to-final' },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="p-2 text-text"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      {open && (
        <ul className="fixed inset-x-0 top-[88px] z-50 bg-bg-elev1 border-t border-text-muted/30 p-4 flex flex-col gap-3">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="block py-2 text-sm font-semibold tracking-[0.15em] uppercase text-text"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
