import { useQuery, type QueryKey, type UseQueryOptions } from '@tanstack/react-query';

export type EnrichedResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  isFallback: boolean;
  refetch: () => void;
};

export function useEnriched<T>(
  options: Omit<UseQueryOptions<T, Error, T, QueryKey>, 'queryKey'> & {
    queryKey: QueryKey;
    fixture: T;
  },
): EnrichedResult<T> {
  const useFixtures = import.meta.env.VITE_USE_FIXTURES === 'true';
  const q = useQuery<T, Error>({
    ...options,
    queryFn: useFixtures ? () => Promise.resolve(options.fixture) : options.queryFn,
    placeholderData: options.fixture as unknown as T | undefined,
  } as UseQueryOptions<T, Error, T, QueryKey>);

  const isFallback = !useFixtures && q.isError && q.data !== undefined;

  return {
    data: q.data,
    isLoading: q.isLoading,
    isError: q.isError && q.data === undefined,
    isFallback,
    refetch: () => {
      void q.refetch();
    },
  };
}
