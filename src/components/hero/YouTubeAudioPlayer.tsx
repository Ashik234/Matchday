import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { ANTHEMS, anthemCover } from '@/data/anthems';
import { loadYouTubeApi } from '@/lib/youtubeApi';
import { useUIStore } from '@/store/uiStore';

export function YouTubeAudioPlayer() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const pollRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const { audio, setAudio } = useUIStore();
  const [ready, setReady] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const [erroredIds, setErroredIds] = useState<ReadonlySet<string>>(new Set());
  const [coverFailed, setCoverFailed] = useState(false);

  const trackIndexRef = useRef(audio.trackIndex);
  trackIndexRef.current = audio.trackIndex;

  const track = ANTHEMS[audio.trackIndex] ?? ANTHEMS[0]!;
  const trackErrored = erroredIds.has(track.id);
  const unavailable = apiFailed || trackErrored;

  useEffect(() => {
    let cancelled = false;
    if (!hostRef.current) return;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;
        playerRef.current = new YT.Player(hostRef.current, {
          videoId: track.videoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            controls: 0,
            disablekb: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              if (cancelled) return;
              if (audio.muted) e.target.mute();
              else e.target.unMute();
              setReady(true);
            },
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.ENDED) {
                setAudio({
                  trackIndex: (trackIndexRef.current + 1) % ANTHEMS.length,
                  playing: true,
                });
              }
              if (e.data === YT.PlayerState.PLAYING) {
                if (watchdogRef.current) {
                  window.clearTimeout(watchdogRef.current);
                  watchdogRef.current = null;
                }
              }
            },
            onError: (err) => {
              const a = ANTHEMS[trackIndexRef.current];
              if (a) {
                console.warn(`[anthem] YT error ${err.data} on "${a.title}" (${a.videoId})`);
                setErroredIds((prev) => {
                  if (prev.has(a.id)) return prev;
                  const nxt = new Set(prev);
                  nxt.add(a.id);
                  return nxt;
                });
              }
            },
          },
        });
      })
      .catch(() => setApiFailed(true));

    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const p = playerRef.current;
    if (!p || !ready) return;
    p.loadVideoById(track.videoId);
    let pauseTimer: number | null = null;
    if (!audio.playing) {
      pauseTimer = window.setTimeout(() => p.pauseVideo(), 50);
    }
    setCoverFailed(false);

    if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
    if (audio.playing) {
      watchdogRef.current = window.setTimeout(() => {
        setAudio({ trackIndex: (audio.trackIndex + 1) % ANTHEMS.length });
      }, 5000);
    }
    return () => {
      if (pauseTimer) window.clearTimeout(pauseTimer);
    };
  }, [audio.trackIndex, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready) return;
    if (audio.playing) {
      pollRef.current = window.setInterval(() => {
        const p = playerRef.current;
        if (!p) return;
        const dur = p.getDuration();
        const cur = p.getCurrentTime();
        if (dur > 0) setAudio({ progress: cur / dur });
      }, 500);
    }
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [audio.playing, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p || !ready) return;
    if (audio.playing) {
      p.pauseVideo();
      setAudio({ playing: false });
    } else {
      p.playVideo();
      setAudio({ playing: true });
    }
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p || !ready) return;
    if (audio.muted) p.unMute();
    else p.mute();
    setAudio({ muted: !audio.muted });
  };

  const next = () =>
    setAudio({ trackIndex: (audio.trackIndex + 1) % ANTHEMS.length });
  const prev = () =>
    setAudio({
      trackIndex: (audio.trackIndex - 1 + ANTHEMS.length) % ANTHEMS.length,
    });

  const coverUrl = anthemCover(track);
  const navDisabled = apiFailed;
  const playDisabled = apiFailed || trackErrored || !ready;
  const jumpTo = (i: number) => setAudio({ trackIndex: i });

  return (
    <div className="flex flex-col gap-2 max-w-sm">
      <div className="relative flex items-center gap-3 p-3 rounded-xl bg-bg-deep/70 border border-white/5 backdrop-blur-sm shadow-card">
        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-gold to-gold-light">
          {!coverFailed && (
            <img
              key={track.id}
              src={coverUrl}
              alt=""
              className="w-full h-full object-cover transition-opacity duration-200"
              onError={() => setCoverFailed(true)}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div
            aria-live="polite"
            className="text-sm font-semibold text-text truncate"
          >
            {track.title}
          </div>
          <div className="text-[11px] text-text-dim truncate">{track.artist}</div>
          {unavailable ? (
            <div className="text-[10px] text-text-dim mt-1">Unavailable</div>
          ) : (
            <div className="mt-1.5 h-0.5 bg-text-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold transition-[width] duration-fast"
                style={{ width: `${audio.progress * 100}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous track"
            onClick={prev}
            disabled={navDisabled}
            className="w-9 h-9 rounded-full text-text-dim hover:text-text flex items-center justify-center disabled:opacity-40"
          >
            <SkipBack size={16} />
          </button>
          <button
            type="button"
            aria-label={audio.playing ? 'Pause anthem' : 'Play anthem'}
            aria-pressed={audio.playing}
            onClick={togglePlay}
            disabled={playDisabled}
            className="w-9 h-9 rounded-full bg-gold text-bg-deep flex items-center justify-center hover:shadow-gold transition-shadow disabled:opacity-40"
          >
            {audio.playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            type="button"
            aria-label="Next track"
            onClick={next}
            disabled={navDisabled}
            className="w-9 h-9 rounded-full text-text-dim hover:text-text flex items-center justify-center disabled:opacity-40"
          >
            <SkipForward size={16} />
          </button>
          <button
            type="button"
            aria-label={audio.muted ? 'Unmute' : 'Mute'}
            aria-pressed={audio.muted}
            onClick={toggleMute}
            disabled={playDisabled}
            className="w-9 h-9 rounded-full text-text-dim hover:text-text flex items-center justify-center disabled:opacity-40"
          >
            {audio.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        <div
          ref={hostRef}
          aria-hidden="true"
          title="Anthem player"
          className="yt-host"
        />
      </div>

      <div role="tablist" aria-label="Choose anthem" className="flex items-center gap-1.5 px-1">
        {ANTHEMS.map((a, i) => {
          const active = i === audio.trackIndex;
          const broken = erroredIds.has(a.id);
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`${a.artist} — ${a.title}${broken ? ' (unavailable)' : ''}`}
              onClick={() => jumpTo(i)}
              disabled={apiFailed}
              className={
                'h-1.5 rounded-full transition-all ' +
                (active
                  ? 'w-6 bg-gold'
                  : broken
                    ? 'w-3 bg-text-muted/30'
                    : 'w-3 bg-text-muted/60 hover:bg-text-dim')
              }
            />
          );
        })}
      </div>
    </div>
  );
}
