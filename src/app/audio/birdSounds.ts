/**
 * The bird's sounds: which frame of which animation plays what. Nothing plays for glides, bob, breathing
 * or idle holds: the silence between sounds is what keeps it calm.
 */
import type { BirdSoundSink, BirdSurface } from '../components/sections/bird/birdEngine';
import { soundEngine } from './soundEngine';
import { hintAtSound, isSoundOn } from './soundStore';

const TWEET_CHANCE = 0.3;
const POOF_AFTER_S = 0.03;

const feet = (surface: BirdSurface) => (surface === 'letter' ? 'feet-letter' : 'feet-sand');

let lastAnim = '';

export const birdSounds: BirdSoundSink = {
  touched(x) {
    if (isSoundOn()) soundEngine.play('touch-tap', { x });
    else hintAtSound();
  },

  frame(anim, frame, { surface, x, firstInClip }) {
    const swoopStarts = anim === 'swoop' && lastAnim !== 'swoop';
    lastAnim = anim;
    if (!isSoundOn()) return;
    const play = (name: string, gainDb = 0, delay = 0) => soundEngine.play(name, { x, gainDb, delay });

    if (swoopStarts) play('wing-swoop');
    switch (`${anim} ${frame}`) {
      case 'annoyed 2':
      case 'startled 2':
        play('bird-flinch');
        break;
      case 'annoyed 3':
        play('bird-squawk');
        play('feather-poof', 0, POOF_AFTER_S);
        break;
      case 'annoyed 5':
        play('bird-scold');
        break;
      case 'annoyed 6':
        play('bird-huff');
        break;
      case 'startled 4':
        play('wing-flap');
        break;
      case 'chirp 4':
        if (firstInClip) play('bird-song');
        break;
      case 'look-around 2':
        if (Math.random() < TWEET_CHANCE) play('bird-tweet');
        break;
      case 'sleep 7':
        play('bird-pip');
        break;
      case 'stretch 6':
        play('wing-flap', -4);
        break;
      case 'preen 7':
        play('feather-rustle');
        break;
      case 'fluff 4':
        if (firstInClip) play('feather-rustle');
        break;
      case 'scratch 3':
        play('feather-rustle', -6);
        break;
      case 'peck 3':
      case 'peck 5':
        play(surface === 'letter' ? 'peck-letter' : 'peck-sand');
        break;
      case 'takeoff 3':
        play('wing-takeoff');
        break;
      case 'takeoff 4':
        if (surface === 'palm') play('palm-rustle', -4);
        break;
      case 'flap 1':
        play('wing-flap', -3 * Math.random());
        break;
      case 'hover 1':
        play('wing-flap', -4);
        break;
      case 'landing 1':
        play('wing-landing');
        break;
      case 'landing 4':
      case 'hop 7':
        play(surface === 'palm' ? 'palm-rustle' : feet(surface));
        break;
      case 'turn 6':
        play(feet(surface), -6);
        break;
      default:
    }
  },
};
