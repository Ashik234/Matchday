import { useEnriched } from './useEnriched';
import { activeSource } from '@/data/api/dataSource';
import type { Stadium } from '@/data/types';

const STADIUM_FIXTURE: Stadium[] = [];

export function useStadiums() {
  return useEnriched({
    queryKey: ['stadiums'],
    queryFn: ({ signal }) => activeSource.stadiums(undefined, signal!),
    fixture: STADIUM_FIXTURE,
    staleTime: 6 * 60 * 60 * 1000,
  });
}
