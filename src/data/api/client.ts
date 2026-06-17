import { getCached, setCached, getStale } from '@/data/cache/storageCache';

export type ApiSource = 'openfootball' | 'bzzoiro';

export class ApiError extends Error {
  source: ApiSource;
  status: number;
  retryable: boolean;

  constructor(source: ApiSource, status: number, retryable: boolean, message: string) {
    super(message);
    this.name = 'ApiError';
    this.source = source;
    this.status = status;
    this.retryable = retryable;
  }
}

export async function request<T>(
  source: ApiSource,
  url: string,
  init: RequestInit & { signal: AbortSignal },
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    throw new ApiError(source, 0, true, `${source} network error: ${(err as Error).message}`);
  }

  if (!res.ok) {
    const retryable = res.status === 429 || res.status >= 500;
    throw new ApiError(source, res.status, retryable, `${source} ${res.status}`);
  }

  return (await res.json()) as T;
}

export type RequestCachedOptions = {
  ttlMs: number;
  // Stale-while-revalidate: if true, return stale data immediately and
  // refetch in background. Useful for live polling that should never block UI.
  staleOk?: boolean;
};

export async function requestCached<T>(
  source: ApiSource,
  url: string,
  init: RequestInit & { signal: AbortSignal },
  opts: RequestCachedOptions,
): Promise<T> {
  const cacheKey = `${source}:${url}`;

  // Fresh hit — return cached without network.
  const fresh = getCached<T>(cacheKey);
  if (fresh) return fresh.value;

  // Stale-while-revalidate
  if (opts.staleOk) {
    const stale = getStale<T>(cacheKey);
    if (stale) {
      // Fire background revalidation without awaiting.
      void request<T>(source, url, init)
        .then((v) => setCached(cacheKey, v, opts.ttlMs))
        .catch(() => undefined);
      return stale.value;
    }
  }

  // Miss — fetch and cache.
  const value = await request<T>(source, url, init);
  setCached(cacheKey, value, opts.ttlMs);
  return value;
}

const BZZOIRO_BASE = import.meta.env.VITE_BZZOIRO_API_URL ?? 'https://sports.bzzoiro.com';
const BZZOIRO_KEY = import.meta.env.VITE_BZZOIRO_KEY;

export function bzzoiroRequest<T>(
  path: string,
  signal: AbortSignal,
  opts: RequestCachedOptions = { ttlMs: 60_000, staleOk: true },
): Promise<T> {
  const url = `${BZZOIRO_BASE}${path}`;
  const headers: Record<string, string> = {};
  if (BZZOIRO_KEY) headers.Authorization = `Token ${BZZOIRO_KEY}`;
  return requestCached<T>('bzzoiro', url, { signal, headers }, opts);
}

export function hasBzzoiroKey(): boolean {
  return Boolean(BZZOIRO_KEY);
}
