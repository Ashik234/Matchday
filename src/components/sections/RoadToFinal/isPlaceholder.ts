import type { BracketSide } from '@/data/types';

// Placeholder strings openfootball emits when actual teams aren't decided yet,
// e.g. "W74" = winner of match 74, "L11" = loser, "1A" = group A winner.
const PLACEHOLDER = /^([WL]\d+|[123]\w+|TBD)$/i;

export function isPlaceholder(side: BracketSide | undefined): boolean {
  if (!side) return true;
  return PLACEHOLDER.test(side.name) || side.countryCode === 'xx';
}
