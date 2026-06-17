import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bzzoiro } from '@/data/api/bzzoiro';
import { hasBzzoiroKey } from '@/data/api/client';
import { liveSocket, type LiveFrame } from '@/data/api/bzzoiroLive';
import type { Incident } from '@/data/api/bzzoiroTypes';

const TTL_MS = 30_000;

type Result = {
  incidents: Incident[];
  isLive: boolean;
  isLoading: boolean;
  isError: boolean;
};

// Live incidents timeline for a match. Fetches the REST list (cached, polled
// every 30s while live) and, when a WebSocket frame reports a changed
// score/minute, triggers an immediate refetch instead of waiting for the next
// poll. The WS frame is a trigger only — incidents always come from REST, the
// source of truth. Incidents are bzzoiro-only: a missing key or a non-numeric
// (openfootball) event id yields an empty list.
export function useIncidents(
  eventId?: number,
  homeTeamId?: number,
  isLive = false,
  wsTracked = false,
): Result {
  const enabled = hasBzzoiroKey() && typeof eventId === 'number' && Number.isFinite(eventId);
  const queryClient = useQueryClient();

  const q = useQuery<Incident[], Error>({
    queryKey: ['incidents', eventId],
    queryFn: ({ signal }) => bzzoiro.incidents(eventId!, homeTeamId, signal!),
    enabled,
    staleTime: TTL_MS,
    refetchInterval: enabled && isLive ? TTL_MS : false,
  });

  // Last score/minute seen over the WS, used to detect a change worth an
  // early refetch. Kept in a ref so it never triggers a re-render.
  const lastSeen = useRef<{ h?: number; a?: number; m?: number }>({});

  useEffect(() => {
    if (!enabled || !isLive || !wsTracked) return;
    const apply = (f: LiveFrame) => {
      const prev = lastSeen.current;
      const changed =
        (f.home_score !== undefined && f.home_score !== prev.h) ||
        (f.away_score !== undefined && f.away_score !== prev.a) ||
        (f.minute !== undefined && f.minute !== prev.m);
      lastSeen.current = {
        h: f.home_score ?? prev.h,
        a: f.away_score ?? prev.a,
        m: f.minute ?? prev.m,
      };
      if (changed) {
        void queryClient.invalidateQueries({ queryKey: ['incidents', eventId] });
      }
    };
    const unsub = liveSocket.subscribe(eventId!, apply);
    return () => unsub();
  }, [enabled, isLive, wsTracked, eventId, queryClient]);

  return {
    incidents: q.data ?? [],
    isLive,
    isLoading: q.isLoading,
    isError: q.isError,
  };
}
