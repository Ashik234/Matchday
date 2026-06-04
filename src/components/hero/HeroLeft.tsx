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
