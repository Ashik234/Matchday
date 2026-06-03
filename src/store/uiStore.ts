import { create } from 'zustand';

export type BallStage =
  | 'pre-intro'
  | 'intro'
  | 'roll-navbar'
  | 'drop-card'
  | 'idle-card'
  | 'scroll-guide'
  | 'parked-countdown';

type AudioState = {
  muted: boolean;
  playing: boolean;
  progress: number;
};

type UIStore = {
  audio: AudioState;
  ballStage: BallStage;
  scrollProgress: number;
  setAudio: (patch: Partial<AudioState>) => void;
  setBallStage: (stage: BallStage) => void;
  setScrollProgress: (p: number) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  audio: { muted: true, playing: false, progress: 0 },
  ballStage: 'pre-intro',
  scrollProgress: 0,
  setAudio: (patch) => set((s) => ({ audio: { ...s.audio, ...patch } })),
  setBallStage: (ballStage) => set({ ballStage }),
  setScrollProgress: (scrollProgress) => set({ scrollProgress }),
}));
