# Hero Anthem Player — Design Spec

**Date:** 2026-06-04
**Branch:** `feat/matchday-impl`
**Author:** assistant (Matchday team)

## Goal

Replace the single-track placeholder audio player in the hero with a
playlist-driven YouTube-backed anthem player. Users can step through the
official FIFA World Cup anthems (and legacy WC songs) via prev/next
controls. The cover art and track metadata swap to match the current
song.

## Non-Goals

- No volume slider (mute only, like today).
- No seek-bar dragging (progress is read-only).
- No visible playlist UI (carousel/list).
- No persistence of the current track across reloads.
- No video playback — audio only, video element is hidden.

## Constraints

- Legal: stream via the YouTube IFrame Player API on the official channel
  uploads. No download, no scraping of audio.
- Visual: keep the existing pill design (rounded card, gold accents,
  64-ish px cover, title + artist, progress bar) — only extend it with
  prev/next buttons.
- Bundle: lazy-load the YouTube IFrame API; do not block hero render.

## Track List

| # | Artist            | Title                          | YouTube ID    |
|---|-------------------|--------------------------------|---------------|
| 1 | IShowSpeed        | World Cup (Champions)          | `vrY1THC_NQE` |
| 2 | Future, Tyla, FIFA Sound | Game Time (WC 2026)     | `JLucCHwY-2c` |
| 3 | Shakira & Burna Boy | Dai Dai                      | `fcnDmrtj6Sk` |
| 4 | Pitbull (feat. JLo, Claudia) | We Are One (Ole Ola)  | `TGtWWb9emYI` |

Default index: `0` (IShowSpeed — World Cup / Champions).

## Architecture

### New files

- `src/data/anthems.ts` — typed `Anthem[]` constant.
- `src/lib/youtubeApi.ts` — singleton loader that resolves once
  `window.YT.Player` is ready.
- `src/components/hero/YouTubeAudioPlayer.tsx` — pill UI + hidden iframe
  + control logic.

### Edited files

- `src/components/hero/HeroLeft.tsx` — swap `AudioPlayer` import for
  `YouTubeAudioPlayer`.
- `src/store/uiStore.ts` — extend `AudioState` with `trackIndex: number`.

### Removed files

- `src/components/hero/AudioPlayer.tsx`
- `public/anthem.mp3` (placeholder, if present in the working tree)

## Data shape

```ts
// src/data/anthems.ts
export type Anthem = {
  id: string;
  title: string;
  artist: string;
  videoId: string;
  /** Optional override; falls back to YouTube hqdefault thumbnail. */
  coverOverride?: string;
};

export const ANTHEMS: Anthem[] = [
  { id: 'speed-champion', title: 'World Cup (Champions)', artist: 'IShowSpeed',         videoId: 'vrY1THC_NQE' },
  { id: 'future-game-time', title: 'Game Time',           artist: 'Future, Tyla, FIFA Sound', videoId: 'JLucCHwY-2c' },
  { id: 'shakira-dai-dai', title: 'Dai Dai',              artist: 'Shakira, Burna Boy', videoId: 'fcnDmrtj6Sk' },
  { id: 'pitbull-we-are-one', title: 'We Are One (Ole Ola)', artist: 'Pitbull, J.Lo, Claudia Leitte', videoId: 'TGtWWb9emYI' },
];
```

## State (Zustand)

```ts
type AudioState = {
  muted: boolean;
  playing: boolean;
  progress: number;       // 0..1
  trackIndex: number;     // NEW — default 0
};
```

`setAudio(patch)` stays partial; component dispatches `trackIndex`
updates alongside existing fields.

## YouTube API loader

`src/lib/youtubeApi.ts`:

- Exports `loadYouTubeApi(): Promise<typeof YT>`.
- Memoized — only injects `<script src="https://www.youtube.com/iframe_api">`
  once per page.
- Wraps the global `window.onYouTubeIframeAPIReady` callback in a
  promise that resolves to `window.YT`.
- Safe under React strict-mode double-invoke.

## Player component (`YouTubeAudioPlayer.tsx`)

### Markup

```
<div className="audio-pill ...">
  <img src={coverUrl} className="cover" />
  <div className="meta">
    <div aria-live="polite" className="title">{title}</div>
    <div className="artist">{artist}</div>
    <div className="progress-track"><div className="progress-fill" /></div>
  </div>
  <div className="controls">
    <button aria-label="Previous track" onClick={prev}><SkipBack/></button>
    <button aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>
      {playing ? <Pause/> : <Play/>}
    </button>
    <button aria-label="Next track" onClick={next}><SkipForward/></button>
    <button aria-label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}>
      {muted ? <VolumeX/> : <Volume2/>}
    </button>
  </div>
  {/* Hidden iframe host */}
  <div ref={hostRef} aria-hidden="true" className="sr-only-yt" />
</div>
```

The `hostRef` div becomes the YT iframe. CSS: 1×1 px, absolutely
positioned off-screen (`left:-9999px;top:-9999px`), `pointer-events:none`,
`opacity:0` — keeps the iframe in the DOM so audio plays, but invisible.

### Cover URL

```ts
const coverUrl = (a: Anthem) =>
  a.coverOverride ?? `https://i.ytimg.com/vi/${a.videoId}/hqdefault.jpg`;
```

Fade transition on `trackIndex` change: 200 ms opacity on the `<img>`.
On `onError`, fall back to the existing gold gradient div.

### Control logic

- **Init** — on mount, `loadYouTubeApi()` → `new YT.Player(hostRef.current, {
  videoId, playerVars: { controls: 0, disablekb: 1, playsinline: 1,
  rel: 0, modestbranding: 1 }, events: { onReady, onStateChange } })`.
- `onReady` — `player.mute()` if `muted`, set local `ready` flag.
- `onStateChange` — `ENDED` → call `next()` (auto-advance).
- **Play/Pause** — `player.playVideo() / pauseVideo()`.
- **Next** — `setAudio({ trackIndex: (i + 1) % ANTHEMS.length })`.
- **Prev** — `setAudio({ trackIndex: (i - 1 + len) % len })`.
- **Effect on `trackIndex`** — call `player.loadVideoById(newId)`; if
  `playing` was true, the new track autoplays (YT default for
  `loadVideoById`). If `playing` was false, immediately
  `player.pauseVideo()` after `onReady` for the new video to keep
  parity.
- **Mute** — `player.mute() / unMute()`.
- **Progress** — `useInterval(500ms)` polling
  `getCurrentTime() / getDuration()` while `playing && ready`. Clear
  interval on unmount and when paused.

### Cleanup

- Effect cleanup destroys the `YT.Player` instance (`player.destroy()`).
- Polling interval cleared on unmount.

## Accessibility

- Buttons have explicit `aria-label`s (see markup above).
- Track title in an `aria-live="polite"` region so screen readers
  announce track changes.
- Hidden iframe gets `aria-hidden="true"` and `title="Anthem player"`.
- Focus order: prev → play → next → mute (matches visual order).
- No keyboard traps; iframe is `pointer-events:none` and not focusable
  via the visible UI.

## Error handling

- YT API fails to load → controls render but `disabled`; show a small
  "Unavailable" hint under the title.
- A specific video is region-blocked or removed →
  `onStateChange` reports `-1` / unstarted indefinitely. After a 5 s
  watchdog without `PLAYING`, auto-skip to next track.
- Cover image fails → gold gradient fallback (existing visual).

## Visual details

- Cover: existing `w-14 h-14 rounded-lg`. Add `object-cover` to the
  `<img>`.
- Controls row: `flex items-center gap-1` — four `w-9 h-9 rounded-full`
  buttons. Play uses gold background; the others stay ghost
  (`text-text-dim hover:text-text`).
- Progress bar: unchanged from current `AudioPlayer.tsx`.

## Test plan

- [ ] Hero renders; pill shows IShowSpeed cover + title on first paint.
- [ ] Click play → audio starts within ~1 s, button switches to Pause.
- [ ] Click next → cover + title swap to Future "Game Time", audio
      continues (because `playing` was true).
- [ ] Click prev twice from track #2 → wraps to Pitbull "We Are One".
- [ ] Mute toggle silences/unsilences audio.
- [ ] Let a track end → auto-advances to the next; wraps at the end.
- [ ] Screen reader announces title changes (aria-live works).
- [ ] No visible iframe chrome anywhere on the hero.
- [ ] Reload — defaults to track 0, paused, muted.
- [ ] Block youtube.com via devtools → after ~5 s the player surfaces
      "Unavailable" gracefully.

## Out of scope (future ideas)

- Persist last track + position in localStorage.
- Visible playlist drawer on click of the cover.
- Crossfade between tracks.
- Per-track theme tint of the hero background.
