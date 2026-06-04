import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

const SRC = '/anthem.mp3';

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { audio, setAudio } = useUIStore();
  const [loaded, setLoaded] = useState(false);

  const ensureLoaded = () => {
    if (loaded && audioRef.current) return audioRef.current;
    const el = new Audio(SRC);
    el.preload = 'auto';
    el.muted = audio.muted;
    el.addEventListener('timeupdate', () => {
      if (el.duration) {
        setAudio({ progress: el.currentTime / el.duration });
      }
    });
    el.addEventListener('ended', () => setAudio({ playing: false, progress: 0 }));
    audioRef.current = el;
    setLoaded(true);
    return el;
  };

  const togglePlay = () => {
    const el = ensureLoaded();
    if (audio.playing) {
      el.pause();
      setAudio({ playing: false });
    } else {
      void el.play().catch(() => setAudio({ playing: false }));
      setAudio({ playing: true });
    }
  };

  const toggleMute = () => {
    const el = ensureLoaded();
    el.muted = !audio.muted;
    setAudio({ muted: !audio.muted });
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-deep/70 border border-white/5 backdrop-blur-sm shadow-card max-w-xs">
      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-gold to-gold-light shrink-0" aria-hidden />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text truncate">Official Tournament Anthem</div>
        <div className="text-[11px] text-text-dim">FIFA 2026</div>
        <div className="mt-1.5 h-0.5 bg-text-muted/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold transition-[width] duration-fast"
            style={{ width: `${audio.progress * 100}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={audio.playing ? 'Pause anthem' : 'Play anthem'}
          aria-pressed={audio.playing}
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-gold text-bg-deep flex items-center justify-center hover:shadow-gold transition-shadow"
        >
          {audio.playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          type="button"
          aria-label={audio.muted ? 'Unmute' : 'Mute'}
          aria-pressed={audio.muted}
          onClick={toggleMute}
          className="w-9 h-9 rounded-full text-text-dim hover:text-text flex items-center justify-center"
        >
          {audio.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
    </div>
  );
}
