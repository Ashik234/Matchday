// localStorage-backed TTL cache. Safe with SSR (window-guarded).
// Each entry: { v: value, e: epoch-expiry-ms, t: epoch-stored-ms }.

const PREFIX = 'matchday:cache:';
const MEM = new Map<string, { value: unknown; expiresAt: number }>();

function key(k: string): string {
  return PREFIX + k;
}

export type CacheEntry<T> = {
  value: T;
  storedAt: number;
  expiresAt: number;
};

export function getCached<T>(k: string): CacheEntry<T> | null {
  const inMem = MEM.get(k);
  if (inMem && inMem.expiresAt > Date.now()) {
    return { value: inMem.value as T, storedAt: 0, expiresAt: inMem.expiresAt };
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key(k));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v: T; e: number; t: number };
    if (parsed.e < Date.now()) {
      window.localStorage.removeItem(key(k));
      return null;
    }
    MEM.set(k, { value: parsed.v, expiresAt: parsed.e });
    return { value: parsed.v, storedAt: parsed.t, expiresAt: parsed.e };
  } catch {
    return null;
  }
}

export function setCached<T>(k: string, value: T, ttlMs: number): void {
  const expiresAt = Date.now() + ttlMs;
  MEM.set(k, { value, expiresAt });
  if (typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify({ v: value, e: expiresAt, t: Date.now() });
    window.localStorage.setItem(key(k), payload);
  } catch {
    // Quota exceeded — silently drop. The in-memory map still has the value.
  }
}

// Stale-while-revalidate: return cached even if expired, plus a freshness flag.
export function getStale<T>(k: string): { value: T; fresh: boolean } | null {
  const fresh = getCached<T>(k);
  if (fresh) return { value: fresh.value, fresh: true };
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key(k));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v: T; e: number; t: number };
    return { value: parsed.v, fresh: false };
  } catch {
    return null;
  }
}

export function clearAllCache(): void {
  MEM.clear();
  if (typeof window === 'undefined') return;
  const toDelete: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(PREFIX)) toDelete.push(k);
  }
  toDelete.forEach((k) => window.localStorage.removeItem(k));
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  // @ts-expect-error dev escape hatch
  window.__matchdayClearCache = clearAllCache;
}
