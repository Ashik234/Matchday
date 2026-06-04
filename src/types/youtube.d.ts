export {};

declare global {
  namespace YT {
    interface PlayerEvent {
      target: Player;
    }
    interface OnStateChangeEvent extends PlayerEvent {
      data: number;
    }
    interface PlayerVars {
      controls?: 0 | 1;
      disablekb?: 0 | 1;
      playsinline?: 0 | 1;
      rel?: 0 | 1;
      modestbranding?: 0 | 1;
      autoplay?: 0 | 1;
      origin?: string;
    }
    interface PlayerOptions {
      videoId?: string;
      width?: number;
      height?: number;
      host?: string;
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
