/**
 * Where the waterfall meets the hero's bottom edge right now: its centre and its width there, in
 * viewport pixels. Filled by the waterfall's edge effect; the falcon reads it. Like waterfallEnd.ts,
 * this sits in its own file so nothing has to load the effect to ask.
 */
export interface FallFoot {
  x: number;
  width: number;
}

let reader: (() => FallFoot | null) | null = null;

export function setFallFootReader(next: (() => FallFoot | null) | null) {
  reader = next;
}

/** Null means no water on the line: no WebGL, the still picture, reduced motion, or the fall off screen. */
export function readFallFoot() {
  return reader?.() ?? null;
}

/**
 * Something standing in the fall (the falcon), the other way round: across the fall's width, in
 * slices `step` px wide from `x0`, how far above the edge the water lands on it (0: it does not, the
 * water reaches the edge there). Host px: the box both canvases share. The fall stops there and
 * splashes there.
 */
export interface FallBlock {
  x0: number;
  step: number;
  rise: Float32Array;
}

let block: FallBlock | null = null;

export function setFallBlock(next: FallBlock | null) {
  block = next;
}

export function readFallBlock() {
  return block;
}
