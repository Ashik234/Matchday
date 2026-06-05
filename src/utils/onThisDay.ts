import type { IconicMoment } from '@/data/types/iconicMoment';

/** Returns today's date as "MM-DD" in local time. */
export function getTodayMMDD(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

/**
 * Returns a stable-per-day index into an array.
 * Uses day-of-year so the same date always shows the same item
 * without any server state or localStorage.
 */
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Picks the "On This Day" moment to display.
 *
 * Rules:
 * 1. Filter by today's MM-DD.
 * 2. Sort matched moments by importance desc.
 * 3. If multiple matches, rotate by dayOfYear so it's stable per day.
 * 4. If no match, fall back to a random legendary moment (stable per day).
 */
export function pickOnThisDayMoment(
  moments: IconicMoment[],
  today = getTodayMMDD(),
): {
  moment: IconicMoment;
  todayMatches: IconicMoment[];
  isFallback: boolean;
} {
  const todayMatches = moments
    .filter((m) => m.date === today)
    .sort((a, b) => b.importance - a.importance);

  if (todayMatches.length > 0) {
    const idx = dayOfYear(new Date()) % todayMatches.length;
    return { moment: todayMatches[idx], todayMatches, isFallback: false };
  }

  // Fallback: pick from top-importance moments, stable per day
  const legendaries = moments.slice().sort((a, b) => b.importance - a.importance);
  const idx = dayOfYear(new Date()) % legendaries.length;
  return { moment: legendaries[idx], todayMatches: [], isFallback: true };
}

/** Format "06-22" → "June 22" */
export function formatMMDD(mmdd: string): string {
  const [mm, dd] = mmdd.split('-').map(Number);
  return new Date(2000, mm - 1, dd).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}

/** Category → emoji */
export const CATEGORY_ICON: Record<string, string> = {
  goal: '⚽',
  final: '🏆',
  upset: '💥',
  record: '📊',
  player: '⭐',
  match: '🎬',
};
