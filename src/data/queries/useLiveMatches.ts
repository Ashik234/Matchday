import { useEnriched } from './useEnriched';
import { apiFootball } from '@/data/api/apiFootball';
import { fixtures } from '@/data/fixtures';
import { useDocumentVisibility } from '@/hooks/useDocumentVisibility';

export function useLiveMatches() {
  const visible = useDocumentVisibility();
  return useEnriched({
    queryKey: ['live-matches'],
    queryFn: ({ signal }) => apiFootball.liveMatches(undefined, signal!),
    fixture: [fixtures.liveSample],
    staleTime: 60_000,
    refetchInterval: visible ? 60_000 : false,
    refetchIntervalInBackground: false,
  });
}
