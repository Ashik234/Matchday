import { create } from 'zustand';

type AudioState = {
  muted: boolean;
  playing: boolean;
  progress: number;
};

type UIStore = {
  audio: AudioState;
  setAudio: (patch: Partial<AudioState>) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  audio: { muted: true, playing: false, progress: 0 },
  setAudio: (patch) => set((s) => ({ audio: { ...s.audio, ...patch } })),
}));
