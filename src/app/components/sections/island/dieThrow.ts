/**
 * The path of one die throw, shared by the three.js die and the engine's sand puffs. It has no
 * three.js in it, so the engine can use it without pulling three.js into the main bundle.
 *
 * The die is lifted and drawn back, thrown forward, and comes to rest where it started after a few
 * shrinking bounces. Heights are in world units, where one die edge is 1.6.
 */
const BACKSWING_MS = 220;
const BACKSWING_HEIGHT = 1;
const REACH = 1.45;
const GRAVITY = 63.5; // units per second squared; gives the bounce heights their natural ratio

/** Each time the die meets the sand, and how hard. The last one is where it stays. */
export const DIE_IMPACTS = [
  { ms: 580, strength: 0.1, puff: 0.6 },
  { ms: 810, strength: 0.07, puff: 0.42 },
  { ms: 950, strength: 0.04, puff: 0.28 },
  { ms: 1050, strength: 0.02, puff: 0.18 },
];
export const DIE_LAND_MS = DIE_IMPACTS[DIE_IMPACTS.length - 1].ms;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function flightHeight(ms: number) {
  if (ms < BACKSWING_MS) return BACKSWING_HEIGHT * easeInOut(ms / BACKSWING_MS);
  if (ms >= DIE_LAND_MS) return 0;

  let from = BACKSWING_MS;
  let start = BACKSWING_HEIGHT;
  for (const { ms: to } of DIE_IMPACTS) {
    if (ms < to) {
      const duration = (to - from) / 1000;
      const speed = (0.5 * GRAVITY * duration * duration - start) / duration; // lands exactly at `to`
      const t = (ms - from) / 1000;
      return start + speed * t - 0.5 * GRAVITY * t * t;
    }
    from = to;
    start = 0;
  }
  return 0;
}

/** Where the die's centre is at a moment of the throw, relative to its resting place. */
export function throwPosition(ms: number, angle: number) {
  const back = easeInOut(clamp01(ms / BACKSWING_MS));
  const forward = 1 - (1 - clamp01((ms - BACKSWING_MS) / (DIE_LAND_MS - BACKSWING_MS))) ** 2.2;
  const reach = REACH * back * (1 - forward);
  return { x: Math.cos(angle) * reach, z: Math.sin(angle) * reach, height: flightHeight(ms) };
}

/** A quick dip before the lift, then a squash at each impact that dies away fast. */
export function throwSquash(ms: number) {
  let squash = ms < 70 ? 1 - 0.08 * Math.sin((Math.PI * ms) / 70) : 1;
  for (const impact of DIE_IMPACTS) {
    if (ms >= impact.ms) squash -= impact.strength * Math.exp(-(ms - impact.ms) / 38);
  }
  return squash;
}

/** How much of the spin is done: it starts gently, peaks in the air and runs out on the sand. */
export function throwSpin(ms: number, rollMs: number) {
  return 1 - (1 - clamp01(ms / rollMs) ** 1.8) ** 4;
}
