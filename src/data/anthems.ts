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
