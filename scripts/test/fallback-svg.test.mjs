import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFallbackSvg } from '../lib/fallback-svg.mjs';

test('produces valid SVG with player initials', () => {
  const svg = generateFallbackSvg({
    name: 'Lionel Messi',
    jersey: 10,
    flagColors: ['#74ACDF', '#FFFFFF', '#F6B40E'],
  });
  assert.match(svg, /^<svg [^>]*viewBox="0 0 600 800"/);
  assert.match(svg, /LM/);   // initials
  assert.match(svg, /#10/);  // jersey
  assert.match(svg, /#74ACDF/i);  // primary flag color
});

test('uses first letter of single-name players', () => {
  const svg = generateFallbackSvg({
    name: 'Pelé',
    jersey: 10,
    flagColors: ['#FEDF00', '#009C3B'],
  });
  assert.match(svg, />P</);
});
