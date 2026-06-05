import { useRef, useState, useCallback, type PointerEvent } from 'react';
import { Section } from './Section';
import { TeamCarouselCard } from './TeamCarouselCard';
import { useTeams } from '@/data/queries';
import { Skeleton } from '@/components/ui/Skeleton';
import { FallbackBanner } from '@/components/ui/FallbackBanner';

export function FeaturedTeams() {
  const { data, isLoading, isFallback, refetch } = useTeams();
  const teams = (data ?? []).slice().sort((a, b) => {
    const ra = a.fifaRank ?? 999;
    const rb = b.fifaRank ?? 999;
    return ra - rb;
  });
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const [grabbing, setGrabbing] = useState(false);

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    // Only intercept primary mouse / touch / pen — let middle-click etc through.
    if (e.button !== undefined && e.button !== 0) return;
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
  }, []);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const el = ref.current;
    if (!el) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 6) {
      if (!drag.current.moved) {
        drag.current.moved = true;
        setGrabbing(true);
        el.setPointerCapture(e.pointerId);
      }
      el.scrollLeft = drag.current.startScroll - dx;
    }
  }, []);

  const endDrag = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (grabbing) {
      setGrabbing(false);
      ref.current?.releasePointerCapture(e.pointerId);
    }
  }, [grabbing]);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return (
    <Section id="featured-teams" stage="featured-teams" eyebrow="Featured" title="Teams to watch">
      {isFallback && <FallbackBanner onRetry={refetch} />}
      <div
        ref={ref}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        className={`no-scrollbar flex gap-4 overflow-x-auto overflow-y-visible pt-3 pb-4 -mx-4 px-4 select-none touch-pan-x ${
          grabbing ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="min-w-[260px] h-32" />
          ))}
        {!isLoading &&
          teams.map((t) => <TeamCarouselCard key={t.id} team={t} />)}
      </div>
    </Section>
  );
}
