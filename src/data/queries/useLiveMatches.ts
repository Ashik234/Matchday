import { useEnriched } from './useEnriched';
import { wc2026 } from '@/data/api/wc2026';
import { fixtures } from '@/data/fixtures';
import { useDocumentVisibility } from '@/hooks/useDocumentVisibility';

export function useLiveMatches() {
  const visible = useDocumentVisibility();
  return useEnriched({
    queryKey: ['live-matches'],
    queryFn: ({ signal }) => wc2026.liveMatches(undefined, signal!),
    fixture: [fixtures.liveSample],
    staleTime: 15_000,
    refetchInterval: visible ? 15_000 : false,
    refetchIntervalInBackground: false,
  });
}
