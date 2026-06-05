import type { PlayerImage } from './playerImage';

export type Position = 'GK' | 'DF' | 'MF' | 'FW';

export type Player = {
  id: string;        // `${teamCode}-${jersey}` e.g. `BRA-10`
  teamCode: string;
  jersey: number;
  name: string;
  position: Position;
  club: string;
  age?: number;
  caps?: number;
  goals?: number;
  image?: PlayerImage;
};
