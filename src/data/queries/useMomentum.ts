import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bzzoiro } from '@/data/api/bzzoiro';
import { hasBzzoiroKey } from '@/data/api/client';
import { liveSocket, type LiveFrame } from '@/data/api/bzzoiroLive';
import type { MomentumPoint } from '@/data/api/bzzoiroTypes';

const TTL_MS = 30_000;

type Result = {
  points: MomentumPoint[];
  isLive: boolean;
  isLoading: boolean;
  isError: boolean;
};

// Live momentum curve for a match. Fetches the REST curve once (cached), and
// while the match is live appends incoming WebSocket momentum points, de-duped
// by minute. Momentum is a bzzoiro-only feature: a missing key or a non-numeric
// (openfootball) event id yields an empty curve.
export function useMomentum(eventId?: number, isLive = false, wsTracked = false): Result {
  const enabled = hasBzzoiroKey() && typeof eventId === 'number' && Number.isFinite(eventId);

  const q = useQuery<MomentumPoint[], Error>({
    queryKey: ['momentum', eventId],
    queryFn: ({ signal }) => bzzoiro.momentum(eventId!, signal!),
    enabled,
    staleTime: TTL_MS,
    refetchInterval: enabled && isLive ? TTL_MS : false,
  });

  // Live points pushed over the WebSocket, keyed by minute.
  const [livePoints, setLivePoints] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    if (!enabled || !isLive || !wsTracked) return;
    const apply = (f: LiveFrame) => {
      if (typeof f.minute !== 'number' || typeof f.momentum !== 'number') return;
      setLivePoints((prev) => {
        const next = new Map(prev);
        next.set(f.minute!, f.momentum!);
        return next;
      });
    };
    const unsub = liveSocket.subscribe(eventId!, apply);
    return () => unsub();
  }, [enabled, isLive, wsTracked, eventId]);

  const points = useMemo(() => {
    const byMinute = new Map<number, number>();
    for (const p of q.data ?? []) byMinute.set(p.m, p.v);
    for (const [m, v] of livePoints) byMinute.set(m, v); // live overrides REST
    return Array.from(byMinute.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([m, v]) => ({ m, v }));
  }, [q.data, livePoints]);

  return {
    points,
    isLive,
    isLoading: q.isLoading,
    isError: q.isError,
  };
}
