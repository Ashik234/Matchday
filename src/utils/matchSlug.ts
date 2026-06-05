import type { Match } from '@/data/types';
import { toSlug } from './slug';

export function toMatchSlug(match: Match): string {
  const date = match.kickoff.slice(0, 10); // YYYY-MM-DD
  return `${toSlug(match.home.name)}-vs-${toSlug(match.away.name)}-${date}`;
}

export function findMatchBySlug(
  matches: readonly Match[] | undefined,
  slug: string,
): Match | undefined {
  if (!matches) return undefined;
  const target = slug.toLowerCase();
  return matches.find((m) => toMatchSlug(m) === target);
}
