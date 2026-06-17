import { useEffect, useState } from 'react';
import { liveSocket, type LiveFrame } from '@/data/api/bzzoiroLive';
import { bzzoiroRequest } from '@/data/api/client';
import type { EventV2 } from '@/data/api/bzzoiroTypes';

type LiveState = {
  home_score?: number;
  away_score?: number;
  minute?: number;
  period?: string;
  momentum?: number;
  connected: boolean;
};

export function useLiveEvent(eventId?: number, wsTracked = false): LiveState {
  const [state, setState] = useState<LiveState>({ connected: false });

  useEffect(() => {
    if (!eventId) return;

    if (wsTracked) {
      const apply = (f: LiveFrame) =>
        setState((s) => ({
          ...s,
          home_score: f.home_score ?? s.home_score,
          away_score: f.away_score ?? s.away_score,
          minute: f.minute ?? s.minute,
          period: f.period ?? s.period,
          momentum: f.momentum ?? s.momentum,
          connected: true,
        }));
      const unsub = liveSocket.subscribe(eventId, apply);
      return () => {
        unsub();
        setState((s) => ({ ...s, connected: false }));
      };
    }

    let cancelled = false;
    const controller = new AbortController();
    const poll = async () => {
      try {
        const e = await bzzoiroRequest<EventV2>(
          `/api/v2/events/${eventId}/`,
          controller.signal,
          { ttlMs: 30_000, staleOk: true },
        );
        if (!cancelled)
          setState({
            home_score: e.home_score ?? undefined,
            away_score: e.away_score ?? undefined,
            minute: e.current_minute ?? undefined,
            period: e.period,
            connected: false,
          });
      } catch {
        /* keep last state */
      }
    };
    void poll();
    const t = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(t);
    };
  }, [eventId, wsTracked]);

  return state;
}
