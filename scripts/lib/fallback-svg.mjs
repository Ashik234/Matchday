// Build a deterministic SVG portrait fallback. Used when no Wikidata image
// is acceptable. 600x800, gradient from first two flag colors, big initials.

function initialsFrom(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function generateFallbackSvg({ name, jersey, flagColors }) {
  const [c1 = '#1a1a1a', c2 = '#3a3a3a'] = flagColors;
  const initials = initialsFrom(name);
  const altName = escapeXml(name);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" role="img" aria-labelledby="t">
  <title id="t">${altName} #${jersey}</title>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="600" height="800" fill="url(#g)"/>
  <text x="300" y="420" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="280" fill="#fff" opacity="0.92">${initials}</text>
  <text x="540" y="80" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="56" fill="#FFD700" font-weight="700">#${jersey}</text>
</svg>`;
}
