import type { Incident, IncidentType, IncidentsResponseV2 } from './bzzoiroTypes';

// Raw incident shape is undocumented; coerce every field defensively so a
// missing/mistyped value never crashes the timeline. Mirrors the LiveFrame
// coercion approach in bzzoiroLive.ts.
function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

// Map a wide range of API/source type strings onto our IncidentType union.
function mapType(raw: unknown): IncidentType {
  const t = (str(raw) ?? '').toLowerCase();
  if (t.includes('own')) return 'own-goal';
  if (t.includes('miss') || t.includes('penalty_miss') || t.includes('penalty-miss')) return 'penalty-miss';
  if (t.includes('pen')) return 'penalty';
  if (t === 'goal' || t.includes('goal')) return 'goal';
  if (t.includes('yellow')) return 'yellow';
  if (t.includes('red')) return 'red';
  if (t.includes('sub')) return 'sub';
  if (t.includes('var')) return 'var';
  return 'unknown';
}

function mapOne(raw: unknown, homeTeamId?: number): Incident | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const minute = num(r.minute ?? r.time ?? r.elapsed);
  if (minute === undefined) return null;

  const rawTeamId = num(r.team_id ?? r.team ?? r.participant_id);
  const teamSide: 'home' | 'away' =
    homeTeamId !== undefined && rawTeamId !== undefined && rawTeamId !== homeTeamId
      ? 'away'
      : homeTeamId !== undefined && rawTeamId === homeTeamId
        ? 'home'
        : str(r.side) === 'away'
          ? 'away'
          : 'home';

  const id =
    str(r.id) ??
    str(r.incident_id) ??
    `${minute}|${mapType(r.type ?? r.incident_type)}|${str(r.player ?? r.player_name) ?? ''}|${teamSide}`;

  return {
    id,
    minute,
    addedTime: num(r.added_time ?? r.injury_time ?? r.extra),
    type: mapType(r.type ?? r.incident_type ?? r.code),
    teamSide,
    player: str(r.player ?? r.player_name ?? r.name) ?? '',
    detail:
      str(r.detail) ??
      str(r.assist ?? r.assist_name) ??
      str(r.player_out ?? r.sub_out) ??
      str(r.reason),
  };
}

// Map the raw incidents payload to a sorted (newest-first) Incident[].
export function mapIncidents(raw: IncidentsResponseV2, homeTeamId?: number): Incident[] {
  const list = Array.isArray(raw.incidents) ? raw.incidents : [];
  const mapped = list
    .map((item) => mapOne(item, homeTeamId))
    .filter((x): x is Incident => x !== null);

  // De-dupe by id, then sort newest-first (minute desc, addedTime desc).
  const byId = new Map<string, Incident>();
  for (const inc of mapped) byId.set(inc.id, inc);
  return Array.from(byId.values()).sort((a, b) => {
    if (b.minute !== a.minute) return b.minute - a.minute;
    return (b.addedTime ?? 0) - (a.addedTime ?? 0);
  });
}
