import type { ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const persister =
  typeof window !== 'undefined'
    ? createSyncStoragePersister({
        storage: window.localStorage,
        key: 'matchday:rq',
        throttleTime: 1000,
      })
    : undefined;

export function Providers({ children }: { children: ReactNode }) {
  if (!persister) {
    // SSR fallback (not hit in this SPA, but keeps the type checker happy)
    return (
      <HelmetProvider>
        <ErrorBoundary>{children}</ErrorBoundary>
      </HelmetProvider>
    );
  }
  return (
    <HelmetProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 24 * 60 * 60 * 1000, // 24h
          buster: 'v2',
        }}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </PersistQueryClientProvider>
    </HelmetProvider>
  );
}
