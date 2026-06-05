// Player portrait SVG generator. 600x800. Two paths:
//   1. Curated motifs (star players) — `renderCurated()` with a named motif slug.
//   2. Default motifs (long tail)     — `renderDefault()` deterministic from name+jersey.
// No real photos. All SVG. Inspired by EA / FIFA card art.

// Public motif slugs. Add to this list as new motifs are designed.
const MOTIFS = {
  'goat-crown':      crownGoat,
  'siuuu-rays':      siuuuRays,
  'lightning-bolt':  lightningBolt,
  'rose-bloom':      roseBloom,
  'phoenix-flame':   phoenixFlame,
  'shark-fin':       sharkFin,
  'panther-stride':  pantherStride,
  'eagle-wing':      eagleWing,
  'cobra-strike':    cobraStrike,
  'drum-beat':       drumBeat,
  'samurai-blade':   samuraiBlade,
  'viking-rune':     vikingRune,
  'tiki-spiral':     tikiSpiral,
  'fox-tail':        foxTail,
  'matador-cape':    matadorCape,
  'compass-rose':    compassRose,
  'thunder-storm':   thunderStorm,
  'comet-trail':     cometTrail,
  'tornado-spin':    tornadoSpin,
  'wave-crest':      waveCrest,
  'sword-cross':     swordCross,
  'shield-emboss':   shieldEmboss,
  'trident-fork':    tridentFork,
  'tiger-claw':      tigerClaw,
  'lion-mane':       lionMane,
  'scorpion-tail':   scorpionTail,
  'spider-web':      spiderWeb,
  'owl-eye':         owlEye,
  'diamond-prism':   diamondPrism,
  'constellation':   constellation,
  'halo-arc':        haloArc,
  'winged-boot':     wingedBoot,
  'torch-flame':     torchFlame,
  'anchor-link':     anchorLink,
  'mountain-peak':   mountainPeak,
  'samba-rhythm':    sambaRhythm,
  'boomerang-arc':   boomerangArc,
};

const MOTIF_KEYS = Object.keys(MOTIFS);

function initialsFrom(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Deterministic hash → integer
function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickFor(seed, arr) {
  return arr[hashCode(seed) % arr.length];
}

// ─── Motif primitives (each draws over the gradient bg, returns inner SVG markup) ───

function crownGoat({ accent }) {
  return `
    <g opacity="0.95">
      <path d="M150 200 L220 320 L300 230 L380 320 L450 200 L430 380 L170 380 Z"
            fill="${accent}" stroke="#fff" stroke-width="6" opacity="0.85"/>
      <circle cx="220" cy="180" r="22" fill="${accent}" stroke="#fff" stroke-width="4"/>
      <circle cx="300" cy="170" r="26" fill="${accent}" stroke="#fff" stroke-width="4"/>
      <circle cx="380" cy="180" r="22" fill="${accent}" stroke="#fff" stroke-width="4"/>
    </g>
    <text x="300" y="540" text-anchor="middle" font-family="Anton, Impact, sans-serif"
          font-size="120" fill="#fff" opacity="0.18" letter-spacing="20">GOAT</text>`;
}

function siuuuRays({ accent }) {
  const rays = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * 22.5 * Math.PI) / 180;
    const x1 = 300 + Math.cos(a) * 80, y1 = 320 + Math.sin(a) * 80;
    const x2 = 300 + Math.cos(a) * 260, y2 = 320 + Math.sin(a) * 260;
    rays.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${accent}" stroke-width="6" opacity="0.6"/>`);
  }
  return `
    <g>${rays.join('')}</g>
    <circle cx="300" cy="320" r="78" fill="${accent}" opacity="0.9"/>
    <text x="300" y="550" text-anchor="middle" font-family="Anton, Impact, sans-serif"
          font-size="80" fill="#fff" opacity="0.2" letter-spacing="14">SIUUU</text>`;
}

function lightningBolt({ accent }) {
  return `
    <path d="M310 130 L210 380 L290 380 L240 580 L390 290 L310 290 L360 130 Z"
          fill="${accent}" stroke="#fff" stroke-width="6" opacity="0.92"/>`;
}

function roseBloom({ accent }) {
  return `
    <g transform="translate(300 330)">
      ${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="0" cy="-70" rx="60" ry="100" fill="${accent}" opacity="0.55" transform="rotate(${a})"/>`).join('')}
      <circle r="36" fill="#fff" opacity="0.9"/>
    </g>`;
}

function phoenixFlame({ accent }) {
  return `
    <path d="M300 580 Q220 480 240 360 Q190 320 240 240 Q260 200 300 180 Q340 200 360 240 Q410 320 360 360 Q380 480 300 580 Z"
          fill="${accent}" stroke="#fff" stroke-width="5" opacity="0.88"/>
    <path d="M300 480 Q260 420 280 360 Q300 320 300 280 Q300 320 320 360 Q340 420 300 480 Z"
          fill="#fff" opacity="0.45"/>`;
}

function sharkFin({ accent }) {
  return `
    <path d="M180 480 L300 200 L420 480 Z" fill="${accent}" opacity="0.9" stroke="#fff" stroke-width="5"/>
    <path d="M180 480 Q220 460 300 480 T420 480" fill="none" stroke="#fff" stroke-width="4" opacity="0.5"/>`;
}

function pantherStride({ accent }) {
  return `
    <path d="M180 420 Q230 320 320 320 Q400 320 420 380 Q440 460 380 480 Q300 500 220 480 Q160 460 180 420 Z"
          fill="${accent}" opacity="0.9"/>
    <circle cx="380" cy="360" r="8" fill="#fff"/>
    <path d="M420 380 L460 340 L450 360 L470 380" fill="none" stroke="${accent}" stroke-width="6"/>`;
}

function eagleWing({ accent }) {
  return `
    <path d="M120 360 Q220 280 300 320 Q380 280 480 360 L450 410 Q360 360 300 380 Q240 360 150 410 Z"
          fill="${accent}" opacity="0.88" stroke="#fff" stroke-width="4"/>
    <path d="M260 320 L300 230 L340 320 Z" fill="${accent}" opacity="0.95"/>`;
}

function cobraStrike({ accent }) {
  return `
    <path d="M300 180 Q260 240 300 280 Q360 320 320 380 Q260 420 320 480 Q360 520 300 580"
          fill="none" stroke="${accent}" stroke-width="22" opacity="0.9" stroke-linecap="round"/>
    <circle cx="300" cy="180" r="26" fill="${accent}"/>`;
}

function drumBeat({ accent }) {
  return `
    <g transform="translate(300 340)">
      <ellipse rx="160" ry="40" fill="${accent}" opacity="0.85"/>
      <rect x="-160" y="0" width="320" height="120" fill="${accent}" opacity="0.6"/>
      <ellipse cy="120" rx="160" ry="40" fill="${accent}" opacity="0.75"/>
      ${[-100, -50, 0, 50, 100].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="120" stroke="#fff" stroke-width="3" opacity="0.45"/>`).join('')}
    </g>`;
}

function samuraiBlade({ accent }) {
  return `
    <path d="M170 540 L460 230 L490 260 L200 570 Z" fill="${accent}" stroke="#fff" stroke-width="4" opacity="0.92"/>
    <path d="M450 240 L470 220 L500 250 L480 270 Z" fill="#fff" opacity="0.8"/>`;
}

function vikingRune({ accent }) {
  return `
    <g stroke="${accent}" stroke-width="10" fill="none" opacity="0.9">
      <line x1="240" y1="200" x2="240" y2="480"/>
      <line x1="360" y1="200" x2="360" y2="480"/>
      <line x1="240" y1="280" x2="360" y2="200"/>
      <line x1="240" y1="400" x2="360" y2="320"/>
    </g>`;
}

function tikiSpiral({ accent }) {
  return `
    <path d="M300 340 m-120 0 a120 120 0 1 0 240 0 a120 120 0 1 0 -240 0
             M300 340 m-80  0 a80  80  0 1 1 160 0 a80  80  0 1 1 -160 0
             M300 340 m-40  0 a40  40  0 1 0 80  0 a40  40  0 1 0 -80  0"
          fill="none" stroke="${accent}" stroke-width="14" opacity="0.85"/>`;
}

function foxTail({ accent }) {
  return `
    <path d="M180 420 Q260 380 360 400 Q450 420 460 360 Q470 300 400 290 Q330 290 240 340 Q160 380 180 420 Z"
          fill="${accent}" opacity="0.9"/>
    <path d="M420 320 Q460 320 460 280" fill="none" stroke="#fff" stroke-width="6"/>`;
}

function matadorCape({ accent }) {
  return `
    <path d="M150 240 Q300 200 450 240 Q420 380 450 460 Q300 420 150 460 Q180 380 150 240 Z"
          fill="${accent}" opacity="0.88" stroke="#fff" stroke-width="4"/>`;
}

function compassRose({ accent }) {
  return `
    <g transform="translate(300 340)">
      <path d="M0 -160 L20 0 L0 160 L-20 0 Z" fill="${accent}" opacity="0.92"/>
      <path d="M-160 0 L0 -20 L160 0 L0 20 Z" fill="${accent}" opacity="0.6"/>
      <circle r="14" fill="#fff"/>
    </g>`;
}

function thunderStorm({ accent }) {
  return `
    <path d="M200 220 Q300 180 400 220 Q420 280 380 320 Q300 340 220 320 Q180 280 200 220 Z"
          fill="${accent}" opacity="0.6"/>
    ${lightningBolt({ accent })}`;
}

function cometTrail({ accent }) {
  return `
    <path d="M120 540 Q220 460 320 380 Q420 300 480 200" fill="none" stroke="${accent}" stroke-width="16" opacity="0.65" stroke-linecap="round"/>
    <circle cx="480" cy="200" r="44" fill="${accent}"/>
    <circle cx="480" cy="200" r="26" fill="#fff"/>`;
}

function tornadoSpin({ accent }) {
  return `
    <g stroke="${accent}" stroke-width="10" fill="none" opacity="0.9">
      <ellipse cx="300" cy="220" rx="120" ry="20"/>
      <ellipse cx="300" cy="280" rx="100" ry="18"/>
      <ellipse cx="300" cy="340" rx="80"  ry="16"/>
      <ellipse cx="300" cy="400" rx="55"  ry="13"/>
      <ellipse cx="300" cy="450" rx="30"  ry="10"/>
    </g>`;
}

function waveCrest({ accent }) {
  return `
    <path d="M120 380 Q180 320 240 380 T360 380 T480 380 L480 480 L120 480 Z"
          fill="${accent}" opacity="0.85"/>
    <path d="M120 440 Q180 400 240 440 T360 440 T480 440" fill="none" stroke="#fff" stroke-width="3" opacity="0.5"/>`;
}

function swordCross({ accent }) {
  return `
    <g stroke="${accent}" stroke-width="20" stroke-linecap="round">
      <line x1="200" y1="200" x2="420" y2="500"/>
      <line x1="420" y1="200" x2="200" y2="500"/>
    </g>`;
}

function shieldEmboss({ accent }) {
  return `
    <path d="M300 180 L440 240 L420 420 Q380 500 300 540 Q220 500 180 420 L160 240 Z"
          fill="${accent}" opacity="0.88" stroke="#fff" stroke-width="5"/>
    <path d="M260 280 L300 240 L340 280 L320 380 L280 380 Z" fill="#fff" opacity="0.65"/>`;
}

function tridentFork({ accent }) {
  return `
    <g stroke="${accent}" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.92">
      <line x1="300" y1="180" x2="300" y2="540"/>
      <line x1="220" y1="220" x2="220" y2="340"/>
      <line x1="380" y1="220" x2="380" y2="340"/>
      <line x1="220" y1="340" x2="380" y2="340"/>
    </g>`;
}

function tigerClaw({ accent }) {
  return `
    <g stroke="${accent}" stroke-width="18" fill="none" stroke-linecap="round" opacity="0.92">
      <path d="M180 200 Q220 320 200 460"/>
      <path d="M260 180 Q300 320 280 480"/>
      <path d="M340 180 Q380 320 360 480"/>
      <path d="M420 200 Q460 320 440 460"/>
    </g>`;
}

function lionMane({ accent }) {
  const spikes = [];
  for (let i = 0; i < 18; i++) {
    const a = (i * 20 * Math.PI) / 180;
    const x1 = 300 + Math.cos(a) * 100, y1 = 340 + Math.sin(a) * 100;
    const x2 = 300 + Math.cos(a) * 180, y2 = 340 + Math.sin(a) * 180;
    spikes.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${accent}" stroke-width="14" opacity="0.85" stroke-linecap="round"/>`);
  }
  return `<g>${spikes.join('')}</g><circle cx="300" cy="340" r="92" fill="${accent}" opacity="0.95"/>`;
}

function scorpionTail({ accent }) {
  return `
    <path d="M200 460 Q280 460 320 380 Q380 280 460 240 L440 220 L470 200 L490 230 L470 260"
          fill="none" stroke="${accent}" stroke-width="16" opacity="0.92" stroke-linecap="round"/>`;
}

function spiderWeb({ accent }) {
  const lines = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    lines.push(`<line x1="300" y1="340" x2="${300 + Math.cos(a) * 200}" y2="${340 + Math.sin(a) * 200}" stroke="${accent}" stroke-width="3" opacity="0.7"/>`);
  }
  const rings = [60, 120, 180].map(r =>
    `<circle cx="300" cy="340" r="${r}" fill="none" stroke="${accent}" stroke-width="3" opacity="0.6"/>`).join('');
  return `<g>${lines.join('')}${rings}</g>`;
}

function owlEye({ accent }) {
  return `
    <g transform="translate(220 340)">
      <circle r="80" fill="${accent}" opacity="0.85"/>
      <circle r="40" fill="#fff"/>
      <circle r="18" fill="#000"/>
    </g>
    <g transform="translate(380 340)">
      <circle r="80" fill="${accent}" opacity="0.85"/>
      <circle r="40" fill="#fff"/>
      <circle r="18" fill="#000"/>
    </g>`;
}

function diamondPrism({ accent }) {
  return `
    <g transform="translate(300 340)">
      <path d="M0 -160 L120 -40 L80 160 L-80 160 L-120 -40 Z" fill="${accent}" opacity="0.88" stroke="#fff" stroke-width="4"/>
      <path d="M0 -160 L0 160 M-120 -40 L120 -40" stroke="#fff" stroke-width="3" opacity="0.55"/>
    </g>`;
}

function constellation({ accent }) {
  const stars = [
    [220, 220], [320, 260], [420, 220], [380, 360], [260, 380],
    [180, 460], [340, 460], [440, 420], [300, 520], [240, 300],
  ];
  return `
    <g>
      ${stars.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${accent}"/>`).join('')}
      <polyline points="${stars.map(s => s.join(',')).join(' ')}" fill="none" stroke="${accent}" stroke-width="2" opacity="0.55"/>
    </g>`;
}

function haloArc({ accent }) {
  return `
    <path d="M120 340 A180 180 0 0 1 480 340" fill="none" stroke="${accent}" stroke-width="22" opacity="0.9"/>
    <circle cx="300" cy="340" r="60" fill="${accent}" opacity="0.85"/>`;
}

function wingedBoot({ accent }) {
  return `
    <path d="M200 460 L380 460 L430 380 L400 360 L380 380 L300 380 L260 320 L200 360 Z"
          fill="${accent}" opacity="0.92" stroke="#fff" stroke-width="4"/>
    <path d="M180 360 Q140 340 100 360 M180 380 Q140 360 100 380 M180 400 Q140 380 100 400"
          stroke="${accent}" stroke-width="6" fill="none" opacity="0.85"/>`;
}

function torchFlame({ accent }) {
  return `
    <path d="M300 180 Q260 240 270 300 Q230 340 260 380 Q300 420 340 380 Q370 340 330 300 Q340 240 300 180 Z"
          fill="${accent}" opacity="0.9"/>
    <rect x="280" y="400" width="40" height="160" fill="${accent}" opacity="0.85"/>`;
}

function anchorLink({ accent }) {
  return `
    <g stroke="${accent}" stroke-width="18" fill="none" stroke-linecap="round" opacity="0.92">
      <circle cx="300" cy="240" r="36"/>
      <line x1="300" y1="280" x2="300" y2="500"/>
      <line x1="220" y1="430" x2="380" y2="430"/>
      <path d="M180 460 Q220 540 300 540 Q380 540 420 460"/>
    </g>`;
}

function mountainPeak({ accent }) {
  return `
    <path d="M120 520 L260 280 L320 380 L400 220 L500 520 Z"
          fill="${accent}" opacity="0.88" stroke="#fff" stroke-width="4"/>
    <path d="M260 280 L320 380 L400 220 Z" fill="#fff" opacity="0.55"/>`;
}

function sambaRhythm({ accent }) {
  const bars = [];
  for (let i = 0; i < 8; i++) {
    const h = 80 + (i % 3) * 60 + ((i * 17) % 50);
    bars.push(`<rect x="${160 + i * 40}" y="${500 - h}" width="28" height="${h}" fill="${accent}" opacity="${0.7 + (i % 3) * 0.1}"/>`);
  }
  return `<g>${bars.join('')}</g>`;
}

function boomerangArc({ accent }) {
  return `
    <path d="M180 240 Q300 200 420 240 Q400 320 360 340 Q300 320 240 340 Q200 320 180 240 Z"
          fill="${accent}" opacity="0.9" stroke="#fff" stroke-width="4"/>`;
}

// ─── Public API ───

export function renderPortraitSvg({
  name,
  jersey,
  flagColors,
  motif,        // motif slug (curated) or null (default = derive from name+jersey)
  signature,    // 2-4 char glyph e.g. "M10" / "CR7"; falls back to initials
  accent,       // hex accent override; falls back to last flag color or gold
}) {
  const [bg1 = '#1a1a1a', bg2 = '#3a3a3a'] = flagColors;
  const seed = `${name}|${jersey}`;
  const motifKey = motif && MOTIFS[motif] ? motif : pickFor(seed, MOTIF_KEYS);
  const motifFn = MOTIFS[motifKey];
  const accentColor = accent || flagColors[flagColors.length - 1] || '#FFD700';
  const sig = (signature || initialsFrom(name)).toUpperCase();
  const altName = escapeXml(name);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" role="img" aria-labelledby="t">
  <title id="t">${altName} #${jersey}</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.4" r="0.7">
      <stop offset="0%" stop-color="transparent"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.45)"/>
    </radialGradient>
  </defs>
  <rect width="600" height="800" fill="url(#bg)"/>
  ${motifFn({ accent: accentColor })}
  <rect width="600" height="800" fill="url(#vignette)"/>
  <text x="300" y="700" text-anchor="middle" font-family="Anton, Impact, sans-serif"
        font-size="180" fill="#fff" opacity="0.96" letter-spacing="4">${escapeXml(sig)}</text>
  <text x="540" y="80" text-anchor="end" font-family="JetBrains Mono, monospace"
        font-size="56" fill="${accentColor}" font-weight="700">#${jersey}</text>
  <text x="60" y="760" font-family="Anton, Impact, sans-serif"
        font-size="22" fill="#fff" opacity="0.55" letter-spacing="3">${escapeXml(name.toUpperCase())}</text>
</svg>`;
}

export function listMotifs() {
  return MOTIF_KEYS.slice();
}
