import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useUIStore } from '@/store/uiStore';

gsap.registerPlugin(ScrollTrigger);

export function useScrollStage() {
  const setBallStage = useUIStore((s) => s.setBallStage);
  const setScrollProgress = useUIStore((s) => s.setScrollProgress);

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        setScrollProgress(self.progress);
        const currentStage = useUIStore.getState().ballStage;
        if (self.progress > 0.05 && currentStage === 'idle-card') {
          setBallStage('scroll-guide');
        }
        if (self.progress > 0.95 && currentStage !== 'parked-countdown') {
          setBallStage('parked-countdown');
        }
        if (self.progress < 0.05 && currentStage === 'scroll-guide') {
          setBallStage('idle-card');
        }
      },
    });
    return () => {
      trigger.kill();
    };
  }, [setBallStage, setScrollProgress]);
}
