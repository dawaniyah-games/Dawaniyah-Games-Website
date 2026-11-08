/**
 * The falcon's sounds. The engine decides when (its table is in falconEngine's cues); this only
 * plays them, panned to where they happen. Levels are baked into the files.
 */
import type { FalconSoundSink } from '../components/sections/falcon/falconEngine';
import { soundEngine } from './soundEngine';
import { hintAtSound, isSoundOn } from './soundStore';

export const falconSounds: FalconSoundSink = {
  touched(x) {
    if (isSoundOn()) soundEngine.play('touch-tap', { x });
    else hintAtSound();
  },

  cue(name, { x, gainDb = 0, delay = 0 }) {
    if (isSoundOn()) soundEngine.play(name, { x, gainDb, delay });
  },
};
