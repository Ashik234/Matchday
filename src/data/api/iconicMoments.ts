import type { IconicMomentsPayload } from '../types/iconicMoment';

export async function fetchIconicMoments(): Promise<IconicMomentsPayload> {
  const response = await fetch('/data/iconic-moments.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch iconic moments: ${response.statusText}`);
  }
  return response.json();
}
