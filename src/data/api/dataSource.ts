import { openfootball } from './openfootball';
import { bzzoiro } from './bzzoiro';
import { hasBzzoiroKey } from './client';

// Fixtures mode is handled per-hook by useEnriched. When a bzzoiro key is
// present, bzzoiro is primary (it delegates WC schedule calls to openfootball);
// otherwise openfootball is the source.
export const activeSource = hasBzzoiroKey() ? bzzoiro : openfootball;
