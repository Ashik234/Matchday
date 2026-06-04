import type { Team } from '@/data/types';

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function findTeamBySlug(
  teams: readonly Team[] | undefined,
  slug: string,
): Team | undefined {
  if (!teams) return undefined;
  const target = slug.toLowerCase();
  return teams.find((t) => toSlug(t.name) === target);
}
