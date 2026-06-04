export type ApiSource = 'ballDontLie' | 'openfootball';

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
