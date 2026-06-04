import { useEnriched } from './useEnriched';
import { openfootball } from '@/data/api/openfootball';
import { fixtures } from '@/data/fixtures';
import { useDocumentVisibility } from '@/hooks/useDocumentVisibility';

export function useLiveMatches() {
  const visible = useDocumentVisibility();
  return useEnriched({
    queryKey: ['live-matches'],
    queryFn: ({ signal }) => openfootball.liveMatches(undefined, signal!),
    fixture: [fixtures.liveSample],
    staleTime: 60_000,
    refetchInterval: visible ? 60_000 : false,
    refetchIntervalInBackground: false,
  });
}
