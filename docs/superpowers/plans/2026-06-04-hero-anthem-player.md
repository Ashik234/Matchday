# Hero Anthem Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-track placeholder audio player in the hero with a YouTube-IFrame-backed playlist player that cycles through the official FIFA World Cup anthems (IShowSpeed, Future/Tyla, Shakira, Pitbull) with prev/next/play/mute controls and cover-art that swaps per track.

**Architecture:** A singleton loader (`src/lib/youtubeApi.ts`) injects the YouTube IFrame API once and exposes a promise. A new `YouTubeAudioPlayer` component renders the existing pill UI plus prev/next buttons and a 1×1 off-screen `<div>` host for the hidden YouTube player. Track state lives in the existing Zustand `uiStore` extended with `trackIndex`. Cover art is the YouTube `hqdefault.jpg` thumbnail of the active video, fading on track change.

**Tech Stack:** React 19, TypeScript, Zustand, Tailwind v4, `lucide-react` icons, YouTube IFrame Player API (`https://www.youtube.com/iframe_api`).

**Repo note:** No test runner is configured. Verification is manual via `pnpm dev` + browser checks. Each task ends in a commit.

---

## File Structure

**Create:**
- `src/data/anthems.ts` — typed playlist constant.
- `src/lib/youtubeApi.ts` — singleton YT API loader.
- `src/types/youtube.d.ts` — minimal `window.YT` typings (avoid pulling `@types/youtube`).
- `src/components/hero/YouTubeAudioPlayer.tsx` — pill UI + hidden iframe + controls.

**Modify:**
- `src/store/uiStore.ts` — add `trackIndex: number` to `AudioState`.
- `src/components/hero/HeroLeft.tsx` — swap `AudioPlayer` import for `YouTubeAudioPlayer`.
- `src/styles/globals.css` — add `.yt-host` utility class for the off-screen iframe host.

**Delete:**
- `src/components/hero/AudioPlayer.tsx`
- `public/anthem.mp3` (empty placeholder)

---

## Task 1: Anthem playlist data

**Files:**
- Create: `src/data/anthems.ts`

- [ ] **Step 1: Create the playlist module**

```ts
// src/data/anthems.ts
export type Anthem = {
  id: string;
  title: string;
  artist: string;
  videoId: string;
  /** Optional override for cover art; falls back to YouTube hqdefault thumbnail. */
  coverOverride?: string;
};

export const ANTHEMS: readonly Anthem[] = [
  {
    id: 'speed-champion',
    title: 'World Cup (Champions)',
    artist: 'IShowSpeed',
    videoId: 'vrY1THC_NQE',
  },
  {
    id: 'future-game-time',
    title: 'Game Time',
    artist: 'Future, Tyla, FIFA Sound',
    videoId: 'JLucCHwY-2c',
  },
  {
    id: 'shakira-dai-dai',
    title: 'Dai Dai',
    artist: 'Shakira, Burna Boy',
    videoId: 'fcnDmrtj6Sk',
  },
  {
    id: 'pitbull-we-are-one',
    title: 'We Are One (Ole Ola)',
    artist: 'Pitbull, J.Lo, Claudia Leitte',
    videoId: 'TGtWWb9emYI',
  },
] as const;

export const anthemCover = (a: Anthem): string =>
  a.coverOverride ?? `https://i.ytimg.com/vi/${a.videoId}/hqdefault.jpg`;
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/anthems.ts
git commit -m "data: add WC anthem playlist (Speed, Future, Shakira, Pitbull)"
```

---

## Task 2: YouTube IFrame API loader

**Files:**
- Create: `src/types/youtube.d.ts`
- Create: `src/lib/youtubeApi.ts`

- [ ] **Step 1: Add minimal YouTube typings**

```ts
// src/types/youtube.d.ts
export {};

declare global {
  namespace YT {
    interface PlayerEvent {
      target: Player;
    }
    interface OnStateChangeEvent extends PlayerEvent {
      data: number; // -1, 0, 1, 2, 3, 5
    }
    interface PlayerVars {
      controls?: 0 | 1;
      disablekb?: 0 | 1;
      playsinline?: 0 | 1;
      rel?: 0 | 1;
      modestbranding?: 0 | 1;
      autoplay?: 0 | 1;
    }
    interface PlayerOptions {
      videoId?: string;
      width?: number;
      height?: number;
      playerVars?: PlayerVars;
      events?: {
        onReady?: (e: PlayerEvent) => void;
        onStateChange?: (e: OnStateChangeEvent) => void;
        onError?: (e: { data: number }) => void;
      };
    }
    class Player {
      constructor(element: HTMLElement | string, options: PlayerOptions);
      playVideo(): void;
      pauseVideo(): void;
      stopVideo(): void;
      mute(): void;
      unMute(): void;
      isMuted(): boolean;
      loadVideoById(videoId: string): void;
      getCurrentTime(): number;
      getDuration(): number;
      destroy(): void;
    }
    const PlayerState: {
      UNSTARTED: -1;
      ENDED: 0;
      PLAYING: 1;
      PAUSED: 2;
      BUFFERING: 3;
      CUED: 5;
    };
  }

  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}
```

- [ ] **Step 2: Create the singleton loader**

```ts
// src/lib/youtubeApi.ts
let promise: Promise<typeof YT> | null = null;

export function loadYouTubeApi(): Promise<typeof YT> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube API requires a browser'));
  }
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (promise) return promise;

  promise = new Promise<typeof YT>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('YT global missing after API ready'));
    };

    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => reject(new Error('Failed to load YouTube IFrame API'));
      document.head.appendChild(tag);
    }
  });

  return promise;
}
```

- [ ] **Step 3: Wire types into `tsconfig`**

Open `tsconfig.app.json`. If the `include` array does not already cover `src/**/*.d.ts`, ensure `"src"` is present (it should be — adding the `.d.ts` is enough). No code change needed if `"src"` is included.

Run: `pnpm tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/youtube.d.ts src/lib/youtubeApi.ts
git commit -m "lib: singleton YouTube IFrame API loader + types"
```

---

## Task 3: Extend `uiStore` with `trackIndex`

**Files:**
- Modify: `src/store/uiStore.ts`

- [ ] **Step 1: Add `trackIndex` to `AudioState`**

Replace entire file contents:

```ts
// src/store/uiStore.ts
import { create } from 'zustand';

type AudioState = {
  muted: boolean;
  playing: boolean;
  progress: number;
  trackIndex: number;
};

type UIStore = {
  audio: AudioState;
  setAudio: (patch: Partial<AudioState>) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  audio: { muted: true, playing: false, progress: 0, trackIndex: 0 },
  setAudio: (patch) => set((s) => ({ audio: { ...s.audio, ...patch } })),
}));
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc -b --noEmit`
Expected: no errors. (`AudioPlayer.tsx` still compiles — `trackIndex` is just unused there for now.)

- [ ] **Step 3: Commit**

```bash
git add src/store/uiStore.ts
git commit -m "store: add trackIndex to audio state"
```

---

## Task 4: Off-screen iframe host utility class

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Read current globals**

Run: `cat src/styles/globals.css`
Note existing content so the new class is appended cleanly.

- [ ] **Step 2: Append `.yt-host` class**

Append to `src/styles/globals.css`:

```css
/* Hidden YouTube IFrame host — keeps audio playing while invisible. */
.yt-host {
  position: absolute;
  left: -9999px;
  top: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/globals.css
git commit -m "styles: .yt-host utility for off-screen iframe"
```

---

## Task 5: `YouTubeAudioPlayer` component

**Files:**
- Create: `src/components/hero/YouTubeAudioPlayer.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/hero/YouTubeAudioPlayer.tsx
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
  const [unavailable, setUnavailable] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  const track = ANTHEMS[audio.trackIndex] ?? ANTHEMS[0];

  // Init player once
  useEffect(() => {
    let cancelled = false;
    if (!hostRef.current) return;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;
        playerRef.current = new YT.Player(hostRef.current, {
          videoId: track.videoId,
          playerVars: {
            controls: 0,
            disablekb: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
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
                  trackIndex: (audio.trackIndex + 1) % ANTHEMS.length,
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
            onError: () => setUnavailable(true),
          },
        });
      })
      .catch(() => setUnavailable(true));

    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // Intentionally empty deps — init once. Track changes handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to track index changes
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !ready) return;
    p.loadVideoById(track.videoId);
    if (!audio.playing) {
      // loadVideoById autoplays by default; pause immediately to match state
      // Slight delay so the player accepts the call.
      window.setTimeout(() => p.pauseVideo(), 50);
    }
    setCoverFailed(false);

    // 5s watchdog: if not PLAYING by then, skip forward
    if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
    if (audio.playing) {
      watchdogRef.current = window.setTimeout(() => {
        setAudio({ trackIndex: (audio.trackIndex + 1) % ANTHEMS.length });
      }, 5000);
    }
  }, [audio.trackIndex, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Progress polling
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
  const ctrlsDisabled = unavailable;

  return (
    <div className="relative flex items-center gap-3 p-3 rounded-xl bg-bg-deep/70 border border-white/5 backdrop-blur-sm shadow-card max-w-sm">
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
          disabled={ctrlsDisabled}
          className="w-9 h-9 rounded-full text-text-dim hover:text-text flex items-center justify-center disabled:opacity-40"
        >
          <SkipBack size={16} />
        </button>
        <button
          type="button"
          aria-label={audio.playing ? 'Pause anthem' : 'Play anthem'}
          aria-pressed={audio.playing}
          onClick={togglePlay}
          disabled={ctrlsDisabled || !ready}
          className="w-9 h-9 rounded-full bg-gold text-bg-deep flex items-center justify-center hover:shadow-gold transition-shadow disabled:opacity-40"
        >
          {audio.playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          type="button"
          aria-label="Next track"
          onClick={next}
          disabled={ctrlsDisabled}
          className="w-9 h-9 rounded-full text-text-dim hover:text-text flex items-center justify-center disabled:opacity-40"
        >
          <SkipForward size={16} />
        </button>
        <button
          type="button"
          aria-label={audio.muted ? 'Unmute' : 'Mute'}
          aria-pressed={audio.muted}
          onClick={toggleMute}
          disabled={ctrlsDisabled || !ready}
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
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/hero/YouTubeAudioPlayer.tsx
git commit -m "feat(hero): YouTubeAudioPlayer with playlist + prev/next + cover swap"
```

---

## Task 6: Mount the new player in `HeroLeft`, delete the old one

**Files:**
- Modify: `src/components/hero/HeroLeft.tsx`
- Delete: `src/components/hero/AudioPlayer.tsx`
- Delete: `public/anthem.mp3`

- [ ] **Step 1: Swap the import in `HeroLeft.tsx`**

Replace the file contents:

```tsx
import { StadiumBackdrop } from './StadiumBackdrop';
import { YouTubeAudioPlayer } from './YouTubeAudioPlayer';

export function HeroLeft() {
  return (
    <div className="relative rounded-2xl overflow-hidden min-h-[480px] flex flex-col justify-end p-6 md:p-8">
      <StadiumBackdrop />
      <div className="relative z-10">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold mb-2">
          FIFA WORLD CUP 2026
        </div>
        <h1 className="font-display text-3xl md:text-display text-text leading-[1.05]">
          Experience the journey to the Final.
        </h1>
        <div className="mt-6">
          <YouTubeAudioPlayer />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Confirm no other references to the old player**

Run: `grep -r "AudioPlayer" src/ --include="*.ts" --include="*.tsx"`
Expected: only matches in `src/components/hero/YouTubeAudioPlayer.tsx` (own filename) and `src/components/hero/HeroLeft.tsx` (the new import). No remaining `from './AudioPlayer'` imports.

- [ ] **Step 3: Delete the obsolete files**

```bash
git rm src/components/hero/AudioPlayer.tsx
git rm public/anthem.mp3
```

(If `public/anthem.mp3` is not tracked, use `rm public/anthem.mp3` instead — verify with `git ls-files public/anthem.mp3`.)

- [ ] **Step 4: Type-check + build**

Run: `pnpm tsc -b --noEmit`
Expected: no errors.

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/hero/HeroLeft.tsx
git commit -m "hero: mount YouTubeAudioPlayer, remove legacy AudioPlayer + anthem.mp3"
```

---

## Task 7: Manual verification

**Files:** none — runtime checks.

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`
Open the URL Vite prints in a browser.

- [ ] **Step 2: First-paint check**

Expected:
- Pill shows IShowSpeed cover (yellow/orange-ish thumbnail).
- Title "World Cup (Champions)" + artist "IShowSpeed".
- Play, prev, next, mute icons visible.
- No visible YouTube video chrome anywhere on screen.

- [ ] **Step 3: Play / pause**

Click play. Expected: audio starts within ~1 s (after one user-gesture unmute click if necessary), Play icon flips to Pause. Click again → pauses.

- [ ] **Step 4: Next**

Click play (so it is playing), then click Next.
Expected: cover + title swap to "Game Time" / "Future, Tyla, FIFA Sound", audio continues playing the new track.

- [ ] **Step 5: Prev wrap-around**

From track #2 ("Game Time"), click Prev → back to IShowSpeed.
Click Prev again → wraps to Pitbull "We Are One (Ole Ola)".

- [ ] **Step 6: Mute**

Click mute icon. Expected: audio silenced, icon flips to muted. Click again → audio returns.

- [ ] **Step 7: Auto-advance on end**

Skip near the end of a track using the YouTube UI (open the iframe in devtools and use `getDuration() - 5` or just let a short clip play out — easiest: temporarily edit `ANTHEMS[0].videoId` to a 5 s clip). Expected: `ENDED` → next track loads + plays. Restore the original videoId before committing.

- [ ] **Step 8: Screen reader spot-check**

Use OS screen reader (NVDA / VoiceOver). Tab through controls. Expected: each button announces its label. Changing track announces the new title via the `aria-live="polite"` region.

- [ ] **Step 9: Unavailable path**

Open devtools → Network → block `youtube.com`. Reload.
Expected: after ~5 s, "Unavailable" appears under the title; controls become disabled-looking (opacity 40 %). Hero does not crash.

- [ ] **Step 10: Reload defaults**

Hard-reload the page. Expected: track index resets to 0 (IShowSpeed), paused, muted.

- [ ] **Step 11: Commit nothing — verification only**

If any step fails, open a new task / fix in place; do not commit a "fix-up" without scoping it. If everything passes, this task is done.

---

## Self-review checklist (run before handing off)

- [ ] Spec coverage: every section of `docs/superpowers/specs/2026-06-04-hero-anthem-player-design.md` has a task above.
- [ ] No placeholders: no "TBD", no "add error handling later", no orphan types.
- [ ] Type consistency: `Anthem` shape used in `anthems.ts` matches the usage in `YouTubeAudioPlayer.tsx`. `setAudio` patch keys (`playing`, `muted`, `progress`, `trackIndex`) all defined in `uiStore.ts`.
- [ ] File paths: every `Files` block lists exact paths.
