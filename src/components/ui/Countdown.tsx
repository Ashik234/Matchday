import { useEffect, useState } from 'react';
import { useDocumentVisibility } from '@/hooks/useDocumentVisibility';

type Format = 'DD:HH:MM:SS' | 'HH:MM:SS' | 'MM:SS';

type Props = {
  to: Date | string;
  format?: Format;
  onComplete?: () => void;
  className?: string;
};

function pad(n: number, len = 2): string {
  return String(Math.max(0, n)).padStart(len, '0');
}

function diff(target: Date) {
  const ms = Math.max(0, target.getTime() - Date.now());
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { days, hours, minutes, seconds, ms };
}

export function Countdown({ to, format = 'HH:MM:SS', onComplete, className }: Props) {
  const target = typeof to === 'string' ? new Date(to) : to;
  const [now, setNow] = useState(() => diff(target));
  const visible = useDocumentVisibility();

  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => {
      const d = diff(target);
      setNow(d);
      if (d.ms === 0) {
        window.clearInterval(id);
        onComplete?.();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [target, visible, onComplete]);

  const { days, hours, minutes, seconds } = now;

  let text: string;
  switch (format) {
    case 'DD:HH:MM:SS':
      text = `${pad(days)} : ${pad(hours)} : ${pad(minutes)} : ${pad(seconds)}`;
      break;
    case 'HH:MM:SS':
      text = `${pad(days * 24 + hours)}:${pad(minutes)}:${pad(seconds)}`;
      break;
    case 'MM:SS':
      text = `${pad(minutes)}:${pad(seconds)}`;
      break;
  }

  return (
    <span className={className} aria-live="polite">
      {text}
    </span>
  );
}
