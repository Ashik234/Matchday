export type LiveFrame = {
  eventId: number;
  home_score?: number;
  away_score?: number;
  minute?: number;
  period?: string;
  momentum?: number;
  raw: unknown;
};

type Listener = (frame: LiveFrame) => void;

const WS_BASE = import.meta.env.VITE_BZZOIRO_WS_URL ?? 'wss://sports.bzzoiro.com';
const KEY = import.meta.env.VITE_BZZOIRO_KEY;

// WS push-frame shape is undocumented; coerce defensively so a string/null
// score never leaks a wrong-typed value into the UI.
function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

class LiveSocket {
  private ws: WebSocket | null = null;
  private listeners = new Map<number, Set<Listener>>();
  private backoff = 1000;
  private connecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private url(): string {
    return KEY ? `${WS_BASE}/ws/live/?token=${KEY}` : `${WS_BASE}/ws/live/`;
  }

  private connect() {
    if (this.connecting || (this.ws && this.ws.readyState <= 1)) return;
    this.connecting = true;
    const ws = new WebSocket(this.url());
    this.ws = ws;

    ws.onopen = () => {
      this.connecting = false;
      this.backoff = 1000;
      for (const id of this.listeners.keys()) this.send(id);
    };
    ws.onmessage = (ev) => this.dispatch(ev.data);
    ws.onclose = () => {
      this.connecting = false;
      this.ws = null;
      if (this.listeners.size > 0) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          // Listeners may have all unsubscribed during the backoff window.
          if (this.listeners.size > 0) this.connect();
        }, this.backoff);
        this.backoff = Math.min(this.backoff * 2, 30_000);
      }
    };
    ws.onerror = () => ws.close();
  }

  private send(eventId: number) {
    if (this.ws?.readyState === 1) {
      this.ws.send(JSON.stringify({ action: 'subscribe', event_id: eventId }));
    }
  }

  private dispatch(data: string) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    const eventId = Number(msg.event_id ?? msg.eventId);
    if (!eventId) return;
    const frame: LiveFrame = {
      eventId,
      home_score: num(msg.home_score),
      away_score: num(msg.away_score),
      minute: num(msg.minute ?? msg.current_minute),
      period: str(msg.period),
      momentum: num(msg.momentum),
      raw: msg,
    };
    this.listeners.get(eventId)?.forEach((cb) => cb(frame));
  }

  subscribe(eventId: number, cb: Listener): () => void {
    let set = this.listeners.get(eventId);
    if (!set) {
      set = new Set();
      this.listeners.set(eventId, set);
    }
    set.add(cb);
    this.connect();
    this.send(eventId);

    return () => {
      const s = this.listeners.get(eventId);
      s?.delete(cb);
      if (s && s.size === 0) this.listeners.delete(eventId);
      if (this.listeners.size === 0) {
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.ws?.close();
        this.ws = null;
      }
    };
  }
}

export const liveSocket = new LiveSocket();
