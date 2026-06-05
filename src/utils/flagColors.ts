// Dominant flag colors per WC 2026 team, keyed by ISO code (lowercase).
// Used by the conic-gradient hover border on TeamCarouselCard.
// Source: standard flag color references; minor liberties for visual impact.

const FLAG_COLORS: Record<string, readonly string[]> = {
  // UEFA
  fr:        ['#0055A4', '#FFFFFF', '#EF4135'],
  es:        ['#AA151B', '#F1BF00'],
  ar:        ['#74ACDF', '#FFFFFF', '#F6B40E'],
  'gb-eng':  ['#FFFFFF', '#CE1124'],
  pt:        ['#006600', '#FF0000', '#FFD700'],
  de:        ['#000000', '#DD0000', '#FFCE00'],
  nl:        ['#AE1C28', '#FFFFFF', '#21468B'],
  be:        ['#000000', '#FAE042', '#ED2939'],
  hr:        ['#FF0000', '#FFFFFF', '#0F1F4F'],
  ch:        ['#FF0000', '#FFFFFF'],
  cz:        ['#FFFFFF', '#D7141A', '#11457E'],
  at:        ['#ED2939', '#FFFFFF'],
  no:        ['#EF2B2D', '#FFFFFF', '#002868'],
  se:        ['#006AA7', '#FECC00'],
  ba:        ['#002F6C', '#FFCC00', '#FFFFFF'],
  pl:        ['#FFFFFF', '#DC143C'],
  tr:        ['#E30A17', '#FFFFFF'],
  'gb-sct':  ['#005EB8', '#FFFFFF'],
  it:        ['#008C45', '#FFFFFF', '#CD212A'],

  // CONMEBOL
  br:        ['#FEDF00', '#009C3B', '#002776'],
  uy:        ['#7B9FE5', '#FFFFFF', '#FCD116'],
  co:        ['#FCD116', '#003893', '#CE1126'],
  ec:        ['#FFD100', '#0072CE', '#EF3340'],
  py:        ['#D52B1E', '#FFFFFF', '#0038A8'],

  // AFC
  jp:        ['#FFFFFF', '#BC002D'],
  kr:        ['#FFFFFF', '#CD2E3A', '#0047A0'],
  ir:        ['#239F40', '#FFFFFF', '#DA0000'],
  iq:        ['#CE1126', '#FFFFFF', '#000000'],
  sa:        ['#006C35', '#FFFFFF'],
  qa:        ['#8D1B3D', '#FFFFFF'],
  au:        ['#012169', '#FFFFFF', '#E4002B'],
  uz:        ['#0099B5', '#FFFFFF', '#1EB53A'],
  jo:        ['#000000', '#FFFFFF', '#007A3D', '#CE1126'],

  // CAF
  ma:        ['#C1272D', '#006233'],
  eg:        ['#CE1126', '#FFFFFF', '#000000'],
  sn:        ['#00853F', '#FDEF42', '#E31B23'],
  za:        ['#007A4D', '#FCB514', '#000000', '#DE3831', '#002395'],
  tn:        ['#E70013', '#FFFFFF'],
  gh:        ['#CE1126', '#FCD116', '#006B3F', '#000000'],
  ci:        ['#F77F00', '#FFFFFF', '#009E60'],
  dz:        ['#006233', '#FFFFFF', '#D21034'],
  cv:        ['#003893', '#FFFFFF', '#CF2027', '#F7D116'],
  cd:        ['#007FFF', '#F7D618', '#CE1126'],

  // CONCACAF
  us:        ['#3C3B6E', '#FFFFFF', '#B22234'],
  mx:        ['#006847', '#FFFFFF', '#CE1126'],
  ca:        ['#FF0000', '#FFFFFF'],
  ht:        ['#00209F', '#D21034'],
  pa:        ['#005AA7', '#FFFFFF', '#D21034'],
  cw:        ['#012169', '#FFD100', '#FFFFFF'],

  // OFC
  nz:        ['#012169', '#FFFFFF', '#C8102E'],
};

const GOLD_FALLBACK = ['#FFD700', '#FFEFA0', '#9A6F0A'] as const;

export function flagColors(isoCode: string | undefined): readonly string[] {
  if (!isoCode) return GOLD_FALLBACK;
  return FLAG_COLORS[isoCode.toLowerCase()] ?? GOLD_FALLBACK;
}

/**
 * Build a conic-gradient string cycling through the flag's colors and
 * separating them with transparent gaps — gives the "comet" sweep look.
 */
export function flagConicGradient(isoCode: string | undefined): string {
  const colors = flagColors(isoCode);
  const n = colors.length;
  // each color occupies a small arc; transparent fills the rest, then a sliver-rotate animation does the sweep.
  const arcSize = 30; // degrees per color
  const gap = (360 - n * arcSize) / n;
  const stops: string[] = [];
  let cursor = 0;
  for (const c of colors) {
    stops.push(`transparent ${cursor}deg`);
    stops.push(`${c} ${cursor}deg`);
    stops.push(`${c} ${cursor + arcSize}deg`);
    stops.push(`transparent ${cursor + arcSize}deg`);
    cursor += arcSize + gap;
  }
  stops.push(`transparent 360deg`);
  return `conic-gradient(from 0deg, ${stops.join(', ')})`;
}
