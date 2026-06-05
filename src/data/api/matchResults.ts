import type { MatchResultsPayload } from '../types/matchResult';

export async function fetchMatchResults(): Promise<MatchResultsPayload> {
  const response = await fetch('/data/match-results.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch match results: ${response.statusText}`);
  }
  return response.json();
}
