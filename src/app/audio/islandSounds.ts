/** The island's sounds: the waterfall bed, the die's knocks and the pawns' taps. */
import type { IslandSoundSink } from '../components/sections/island/engine';
import { soundEngine } from './soundEngine';

/** Each knock's level follows how hard the die hits, from its hardest impact down. */
const FULL_IMPACT = 0.1;
/** The music stays close while this much of the hero shows, then drifts away as the last of it goes. */
const HERO_STILL_CLOSE = 0.3;

export const islandSounds: IslandSoundSink = {
  die(strength, x) {
    soundEngine.play('die-knock', { x, gainDb: 20 * Math.log10(strength / FULL_IMPACT) });
  },
  pawn(x) {
    soundEngine.play('pawn-tap', { x });
  },
};

const smoothstep = (u: number) => {
  const t = Math.min(1, Math.max(0, u));
  return t * t * (3 - 2 * t);
};

const everyTenth = Array.from({ length: 11 }, (_, i) => i / 10);
const everyTwentieth = Array.from({ length: 21 }, (_, i) => i / 20);

/**
 * The waterfall follows how much of the island is on screen, and the music follows the hero: the fall
 * runs on below the island to the hero's edge, so the music only drifts away once both have gone.
 * `fallX` is where the fall is now, across the window.
 */
export function watchIslandSound(island: Element, hero: Element, fallX: () => number) {
  const bed = new IntersectionObserver(([entry]) => soundEngine.setBed(smoothstep(entry.intersectionRatio), fallX()), { threshold: everyTenth });
  bed.observe(island);
  const music = new IntersectionObserver(([entry]) => soundEngine.setMusicCloseness(smoothstep(entry.intersectionRatio / HERO_STILL_CLOSE)), { threshold: everyTwentieth });
  music.observe(hero);
  return () => {
    bed.disconnect();
    music.disconnect();
  };
}
